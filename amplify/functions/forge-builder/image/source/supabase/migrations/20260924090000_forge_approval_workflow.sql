-- Source only until an explicitly approved deployment. The local pilot executes
-- this same migration in disposable PostgreSQL (PGlite), not a second reducer.
create table public.forge_approval_workflows (
  workflow_id text primary key,
  tenant text not null,
  proposal_id text not null unique references public.agent_os_proposals(proposal_id),
  proposal_sha256 text not null check (proposal_sha256 ~ '^[a-f0-9]{64}$'),
  agent_id text not null,
  title text not null,
  client_id text,
  project_id text,
  gate text not null default 'proposal' check (gate in ('proposal','scope','plan')),
  state text not null default 'proposed' check(state in ('proposed','draft','review','approved','declined','changes_requested','validation_pending','validation_failed')),
  revision integer not null default 1,
  scope_version integer not null default 0,
  plan_version integer not null default 0,
  grant_data jsonb,
  grant_revoked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.forge_approval_documents (
  workflow_id text not null references public.forge_approval_workflows,
  gate text not null check (gate in ('scope','plan')),
  version integer not null check(version > 0),
  body jsonb not null,
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  created_by text not null,
  created_at timestamptz not null default now(),
  primary key(workflow_id,gate,version)
);
create table public.forge_approval_events (
  event_id uuid primary key default gen_random_uuid(),
  workflow_id text not null references public.forge_approval_workflows,
  gate text not null,
  document_version integer not null,
  actor text not null,
  role text not null check(role in ('operator','client','builder','validator','coordinator')),
  action text not null,
  authorizing boolean not null default false,
  document_sha256 text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create table public.forge_approval_artifacts (
  workflow_id text not null,
  gate text not null default 'plan' check(gate='plan'),
  document_version integer not null,
  kind text not null check(kind in ('intake','plan','architecture')),
  source_ref text not null,
  sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  intake_record_id uuid references public.agent_os_contract_records(record_id),
  prd_id text references public.prd_artifacts(prd_id),
  architecture_version_id text references public.architecture_artifacts(architecture_version_id),
  primary key(workflow_id,document_version,kind),
  foreign key(workflow_id,gate,document_version) references public.forge_approval_documents(workflow_id,gate,version),
  check((kind='intake' and intake_record_id is not null and prd_id is null and architecture_version_id is null) or
        (kind='plan' and prd_id is not null and intake_record_id is null and architecture_version_id is null) or
        (kind='architecture' and architecture_version_id is not null and intake_record_id is null and prd_id is null))
);
create table public.forge_approval_capabilities (
  jti uuid primary key,
  workflow_id text not null references public.forge_approval_workflows,
  tenant text not null,
  gate text not null,
  document_version integer not null,
  document_sha256 text not null,
  recipient text not null,
  role text not null check(role in ('operator','client')),
  token_sha256 text not null unique check(token_sha256 ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  revoked boolean not null default false,
  consumed_event uuid references public.forge_approval_events,
  decision_sha256 text,
  created_at timestamptz not null default now(),
  foreign key(workflow_id,gate,document_version) references public.forge_approval_documents(workflow_id,gate,version)
);
create table public.forge_approval_outbox (
  outbox_id uuid primary key default gen_random_uuid(),
  workflow_id text not null references public.forge_approval_workflows,
  dedupe_key text not null unique,
  kind text not null check(kind in ('review_email','generate_plan','resume')),
  gate text not null,
  document_version integer not null,
  recipient_role text,
  state text not null default 'pending' check(state in ('pending','claimed','delivered','ambiguous','failed','cancelled')),
  attempts integer not null default 0,
  reminder integer not null default 0,
  available_at timestamptz not null default now(),
  lease_until timestamptz,
  lease_id uuid,
  result jsonb,
  created_at timestamptz not null default now()
);
create table public.forge_approval_reminders (
  workflow_id text not null references public.forge_approval_workflows,
  gate text not null,
  document_version integer not null,
  recipient_role text not null,
  wake_at timestamptz not null,
  count integer not null default 0 check(count between 0 and 2),
  snoozed boolean not null default false,
  primary key(workflow_id,gate,document_version,recipient_role)
);
create table public.forge_approval_releases (
  workflow_id text not null references public.forge_approval_workflows,
  plan_version integer not null,
  decision_event uuid not null references public.forge_approval_events,
  receipt jsonb not null,
  created_at timestamptz not null default now(),
  primary key(workflow_id,plan_version)
);

create function public.forge_approval_hash(value jsonb) returns text
language sql immutable set search_path = pg_catalog as $$
  select encode(sha256(convert_to(value::text,'UTF8')),'hex')
$$;

create function public.forge_approval_immutable() returns trigger
language plpgsql set search_path = pg_catalog as $$
begin raise exception 'approval_history_is_immutable'; end $$;
create trigger forge_documents_immutable before update or delete on public.forge_approval_documents
for each row execute function public.forge_approval_immutable();
create trigger forge_events_immutable before update or delete on public.forge_approval_events
for each row execute function public.forge_approval_immutable();
create trigger forge_releases_immutable before update or delete on public.forge_approval_releases
for each row execute function public.forge_approval_immutable();

create function public.forge_approval_enqueue(w text, k text, g text, v integer, r text default null, attempt integer default 0)
returns void language sql set search_path = pg_catalog, public as $$
  insert into public.forge_approval_outbox(workflow_id,dedupe_key,kind,gate,document_version,recipient_role,reminder)
  values(w,concat_ws(':',w,k,g,v,coalesce(r,'system'),attempt),k,g,v,r,attempt)
  on conflict(dedupe_key) do nothing
$$;

create function public.forge_approval_remind_at(start_at timestamptz) returns timestamptz
language plpgsql immutable set search_path=pg_catalog as $$
declare cursor_at timestamp:=start_at at time zone 'UTC'; weekdays integer:=0;
begin
 while weekdays<2 loop
  cursor_at:=cursor_at+interval '1 day';
  if extract(isodow from cursor_at)<6 then weekdays:=weekdays+1; end if;
 end loop;
 return cursor_at at time zone 'UTC';
end $$;

-- One locked workflow row serializes version changes, decisions, grants and jobs.
-- p_role/p_actor are supplied ONLY by the authenticated service adapter, never
-- accepted from browser JSON. Client decisions derive identity from a capability.
create function public.forge_approval_command(p_tenant text, p_actor text, p_role text, p_command text, p_input jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
 w public.forge_approval_workflows;
 d public.forge_approval_documents;
 c public.forge_approval_capabilities;
 e public.forge_approval_events;
 native jsonb;
 body jsonb;
 grant_bound jsonb;
 plan_bound jsonb;
 binding jsonb;
 artifact jsonb;
 v integer;
 act text;
 decision_hash text;
 scope_hash text;
 until_at timestamptz;
 event_key uuid;
 result jsonb;
 passed boolean;
begin
 if p_input is null or jsonb_typeof(p_input)<>'object' or octet_length(p_input::text)>500000 then raise exception 'invalid_input'; end if;
 if coalesce(trim(p_tenant),'')='' or coalesce(trim(p_actor),'')='' or p_role is null or p_role not in ('operator','client','builder','validator','coordinator') then
   raise exception 'invalid_principal';
 end if;
 if p_command='register' then
   if p_role<>'operator' then raise exception 'operator_required'; end if;
   select to_jsonb(p) into native from public.agent_os_proposals p where proposal_id=p_input->>'proposal_id' and tenant=p_tenant;
   if native is null then raise exception 'proposal_not_found_in_tenant'; end if;
   if coalesce(p_input->>'agent_id','')='' then raise exception 'agent_required'; end if;
   insert into public.forge_approval_workflows(workflow_id,tenant,proposal_id,proposal_sha256,agent_id,title,client_id,project_id)
   values('fw_'||(native->>'proposal_id'),p_tenant,native->>'proposal_id',public.forge_approval_hash(native),p_input->>'agent_id',native->>'card_title',p_input->>'client_id',p_input->>'project_id')
   on conflict(proposal_id) do update set proposal_sha256=excluded.proposal_sha256,title=excluded.title,
     updated_at=now() where forge_approval_workflows.state='proposed' and forge_approval_workflows.agent_id=excluded.agent_id;
   select * into w from public.forge_approval_workflows where proposal_id=native->>'proposal_id' and tenant=p_tenant;
   if w.agent_id<>p_input->>'agent_id' then raise exception 'proposal_agent_mismatch'; end if;
   return to_jsonb(w);
 end if;
 if p_command in ('decide','review') then
   select * into c from public.forge_approval_capabilities where jti=(p_input->>'jti')::uuid and token_sha256=p_input->>'token_sha256' and tenant=p_tenant;
   if not found then raise exception 'invalid_capability'; end if;
   select * into w from public.forge_approval_workflows where workflow_id=c.workflow_id and tenant=p_tenant for update;
   select * into c from public.forge_approval_capabilities where jti=c.jti for update;
 else
   if p_role='client' then raise exception 'client_feedback_only'; end if;
   select * into w from public.forge_approval_workflows where workflow_id=p_input->>'workflow_id' and tenant=p_tenant for update;
 end if;
 if w.workflow_id is null then raise exception 'workflow_not_found'; end if;
 if p_command in ('review','decide') and (p_actor is distinct from c.recipient or p_role is distinct from c.role) then raise exception 'capability_principal_mismatch'; end if;
 v:=case when w.gate='plan' then w.plan_version else w.scope_version end;
 if p_command='review' then
   if c.revoked or c.expires_at<=now() or
      (c.role='operator' and (c.gate<>w.gate or c.document_version<>v)) or
      (c.role='client' and (c.gate<>'scope' or c.document_version<>w.scope_version)) then raise exception 'capability_inactive'; end if;
   select * into d from public.forge_approval_documents where workflow_id=w.workflow_id and gate=c.gate and version=c.document_version;
   -- Only the reviewed document and this recipient's response. No operator ledger.
   return jsonb_build_object('workflow_id',w.workflow_id,'title',w.title,'gate',c.gate,'version',c.document_version,'sha256',d.sha256,'document',
     case when c.role='client' then jsonb_build_object('outcome',d.body->'outcome','deliverables',d.body->'deliverables','acceptance',d.body->'acceptance','exclusions',d.body->'exclusions') else d.body end,
     'role',c.role,'state',w.state,'consumed',c.consumed_event is not null);
 end if;
 if p_command='decide' then
   act:=p_input->>'action';
   if act not in ('approve','revise','decline','snooze','auto_approve') then raise exception 'unknown_action'; end if;
   decision_hash:=public.forge_approval_hash(jsonb_build_object('action',act,'note',p_input->>'note','snooze_until',p_input->>'snooze_until','grant',p_input->'grant'));
   -- An exact consumed retry is readback, including after expiry. A different
   -- action/payload never reuses that capability. No new authority is granted.
   if c.consumed_event is not null then
     if c.decision_sha256<>decision_hash then raise exception 'conflicting_capability_reuse'; end if;
     select * into e from public.forge_approval_events where event_id=c.consumed_event;
     return jsonb_build_object('event',to_jsonb(e),'replayed',true);
   end if;
   if c.revoked or c.expires_at<=now() or
      (c.role='operator' and (c.gate<>w.gate or c.document_version<>v or w.state<>'review')) or
      (c.role='client' and (c.gate<>'scope' or c.document_version<>w.scope_version or w.state='declined' or (w.gate='scope' and w.state='changes_requested'))) then raise exception 'stale_or_inactive_capability'; end if;
   select * into d from public.forge_approval_documents where workflow_id=w.workflow_id and gate=c.gate and version=c.document_version;
   if d.sha256<>c.document_sha256 then raise exception 'document_changed'; end if;
   if c.role='client' and act='auto_approve' then raise exception 'client_feedback_only'; end if;
   if act='auto_approve' and w.gate<>'scope' then raise exception 'scope_only_action'; end if;
   if act='snooze' then
     until_at:=(p_input->>'snooze_until')::timestamptz;
     if until_at is null or until_at<=now() or until_at>now()+interval '90 days' then raise exception 'invalid_snooze'; end if;
   end if;
   if act='auto_approve' then
     grant_bound:=p_input->'grant';
     if coalesce(grant_bound is null or jsonb_typeof(grant_bound)<>'object' or
       not (grant_bound ?& array['repositories','environments','operations','phases','max_cost','expires_at','base_commit','profile_sha256','map_sha256','excluded_actions']) or
       coalesce(jsonb_array_length(grant_bound->'repositories'),0)=0 or
       coalesce(jsonb_array_length(grant_bound->'environments'),0)=0 or
       coalesce(jsonb_array_length(grant_bound->'operations'),0)=0 or
       coalesce(jsonb_array_length(grant_bound->'phases'),0)=0 or
       jsonb_typeof(grant_bound->'excluded_actions') is distinct from 'array' or
       jsonb_typeof(grant_bound->'max_cost') is distinct from 'number' or
       not ((grant_bound->'repositories') <@ (d.body->'repositories')) or
       not ((grant_bound->'environments') <@ jsonb_build_array(d.body->>'environment')) or
       not ((grant_bound->'excluded_actions') @> (d.body->'exclusions')) or
       (grant_bound->>'max_cost')::numeric<0 or
       (grant_bound->>'expires_at')::timestamptz<=now() or
       (grant_bound->>'expires_at')::timestamptz>now()+interval '30 days' or
       not ((grant_bound->>'base_commit') ~ '^[a-f0-9]{40}$') or
       not ((grant_bound->>'profile_sha256') ~ '^[a-f0-9]{64}$') or
       not ((grant_bound->>'map_sha256') ~ '^[a-f0-9]{64}$'),true) then raise exception 'bounded_grant_required'; end if;
   end if;
   insert into public.forge_approval_events(workflow_id,gate,document_version,actor,role,action,authorizing,document_sha256,payload)
   values(w.workflow_id,c.gate,c.document_version,c.recipient,c.role,act,c.role='operator' and act in ('approve','auto_approve'),d.sha256,
     jsonb_build_object('note',left(coalesce(p_input->>'note',''),2000),'snooze_until',until_at,'grant',grant_bound)) returning * into e;
   update public.forge_approval_capabilities set consumed_event=e.event_id,decision_sha256=decision_hash where jti=c.jti;
   if act='snooze' then
     insert into public.forge_approval_reminders values(w.workflow_id,c.gate,c.document_version,c.role,until_at,0,true)
     on conflict(workflow_id,gate,document_version,recipient_role) do update set wake_at=excluded.wake_at,snoozed=true;
     update public.forge_approval_outbox set available_at=until_at where workflow_id=w.workflow_id and recipient_role=c.role and state='pending' and gate=c.gate and document_version=c.document_version;
   elsif c.role='operator' then
     update public.forge_approval_workflows set state=case when act in ('approve','auto_approve') then 'approved' when act='revise' then 'changes_requested' else 'declined' end,
       grant_data=case when act='auto_approve' then grant_bound||jsonb_build_object('schema_version','forge-approval-scope-grant.v1','grant_id',gen_random_uuid(),'version',1,'tenant',p_tenant,'workflow_id',w.workflow_id,'proposal_id',w.proposal_id,'scope_version',w.scope_version,'scope_sha256',d.sha256,'decision_event',e.event_id,'operator',c.recipient) when act in ('revise','decline') then null else grant_data end,
       grant_revoked=act in ('revise','decline'),revision=revision+1,updated_at=now() where workflow_id=w.workflow_id;
     update public.forge_approval_capabilities set revoked=true where workflow_id=w.workflow_id and consumed_event is null and (role='operator' or act in ('revise','decline'));
     update public.forge_approval_outbox set state='cancelled' where workflow_id=w.workflow_id and state in ('pending','claimed');
     delete from public.forge_approval_reminders where workflow_id=w.workflow_id;
     if act in ('approve','auto_approve') then
       perform public.forge_approval_enqueue(w.workflow_id,case when w.gate='scope' then 'generate_plan' else 'resume' end,w.gate,v);
     end if;
   else
     delete from public.forge_approval_reminders where workflow_id=w.workflow_id and gate=c.gate and document_version=c.document_version and recipient_role=c.role;
     update public.forge_approval_outbox set state='cancelled' where workflow_id=w.workflow_id and gate=c.gate and document_version=c.document_version and recipient_role=c.role and state in ('pending','claimed');
   end if;
   return jsonb_build_object('event',to_jsonb(e),'replayed',false);
 end if;
 if p_command='mint' then
   if p_role<>'operator' or w.state<>'review' then raise exception 'review_required'; end if;
   select * into d from public.forge_approval_documents where workflow_id=w.workflow_id and gate=w.gate and version=v;
   if p_input->>'role' not in ('operator','client') or (w.gate='plan' and p_input->>'role'='client') or
     (p_input->>'expires_at')::timestamptz<=now() or (p_input->>'expires_at')::timestamptz>now()+interval '24 hours' or
     p_input->>'document_sha256'<>d.sha256 or (p_input->>'document_version')::integer<>v or p_input->>'gate'<>w.gate
     then raise exception 'invalid_capability_scope'; end if;
   if exists(select 1 from public.forge_approval_reminders where workflow_id=w.workflow_id and gate=w.gate and document_version=v and recipient_role=p_input->>'role' and snoozed and wake_at>now()) then raise exception 'recipient_snoozed'; end if;
   update public.forge_approval_capabilities set revoked=true where workflow_id=w.workflow_id and role=p_input->>'role' and consumed_event is null;
   insert into public.forge_approval_capabilities(jti,workflow_id,tenant,gate,document_version,document_sha256,recipient,role,token_sha256,expires_at)
   values((p_input->>'jti')::uuid,w.workflow_id,p_tenant,w.gate,v,d.sha256,p_input->>'recipient',p_input->>'role',p_input->>'token_sha256',(p_input->>'expires_at')::timestamptz);
   return jsonb_build_object('ok',true);
 end if;
 if p_command='accept' then
   if p_role<>'operator' then raise exception 'operator_required'; end if;
   if w.gate='scope' then return to_jsonb(w); end if;
   if w.state<>'proposed' then raise exception 'proposal_not_pending'; end if;
   select to_jsonb(p) into native from public.agent_os_proposals p where proposal_id=w.proposal_id and tenant=p_tenant;
   if public.forge_approval_hash(native) is distinct from w.proposal_sha256 then raise exception 'proposal_version_changed'; end if;
   update public.forge_approval_workflows set gate='scope',state='draft',revision=revision+1,updated_at=now() where workflow_id=w.workflow_id;
 elsif p_command='scope' then
   if p_role<>'operator' or w.gate<>'scope' or w.state not in ('draft','changes_requested') then raise exception 'editable_scope_required'; end if;
   body:=p_input->'document';
   if coalesce(body is null or not (body ?& array['outcome','deliverables','acceptance','exclusions','repositories','environment','reviewer','client_recipient','dependencies']) or
     length(trim(body->>'outcome'))=0 or jsonb_array_length(body->'deliverables')<1 or
     jsonb_array_length(body->'acceptance')<1 or jsonb_array_length(body->'repositories')<1 or length(trim(body->>'environment'))=0,true) then raise exception 'scope_intake_incomplete'; end if;
   v:=w.scope_version+1;
   insert into public.forge_approval_documents values(w.workflow_id,'scope',v,body,public.forge_approval_hash(body),p_actor,now());
   update public.forge_approval_workflows set state='review',scope_version=v,grant_data=null,grant_revoked=false,revision=revision+1,updated_at=now() where workflow_id=w.workflow_id;
   perform public.forge_approval_enqueue(w.workflow_id,'review_email','scope',v,'operator');
   perform public.forge_approval_enqueue(w.workflow_id,'review_email','scope',v,'client');
 elsif p_command='plan' then
   body:=p_input->'document';
   if p_role='builder' and w.gate='plan' and w.state not in ('changes_requested','declined') then
     select * into d from public.forge_approval_documents where workflow_id=w.workflow_id and gate='plan' and version=v;
     if d.sha256=public.forge_approval_hash(body) and d.created_by=p_actor then return to_jsonb(w); end if;
   end if;
   if p_role<>'builder' or not ((w.gate='scope' and w.state='approved') or (w.gate='plan' and w.state='changes_requested')) then raise exception 'approved_scope_required'; end if;
   select sha256 into scope_hash from public.forge_approval_documents where workflow_id=w.workflow_id and gate='scope' and version=w.scope_version;
   if body->>'scope_sha256' is distinct from scope_hash then raise exception 'plan_scope_mismatch'; end if;
   binding:=body->'binding';
   if binding is null or not(binding ?& array['plan_sha256','architecture_sha256','base_commit','profile_sha256','map_sha256','phases','excluded_actions','targets']) then raise exception 'plan_binding_required'; end if;
   foreach act in array array['plan_sha256','architecture_sha256','profile_sha256','map_sha256'] loop
     if coalesce(binding->>act,'') !~ '^[a-f0-9]{64}$' then raise exception 'invalid_binding_hash'; end if;
   end loop;
   if coalesce(binding->>'base_commit','') !~ '^[a-f0-9]{40}$' or coalesce(jsonb_array_length(binding->'phases'),0)<1 or coalesce(jsonb_array_length(binding->'targets'),0)<1 or jsonb_typeof(binding->'excluded_actions') is distinct from 'array' then raise exception 'invalid_plan_binding'; end if;
   v:=w.plan_version+1;
   insert into public.forge_approval_documents values(w.workflow_id,'plan',v,body,public.forge_approval_hash(body),p_actor,now());
   update public.forge_approval_workflows set gate='plan',state='validation_pending',plan_version=v,revision=revision+1,updated_at=now() where workflow_id=w.workflow_id;
 elsif p_command='validate_plan' then
   if p_role<>'validator' or w.gate<>'plan' then raise exception 'independent_validator_required'; end if;
   select * into d from public.forge_approval_documents where workflow_id=w.workflow_id and gate='plan' and version=v;
   if p_actor=d.created_by or p_input->>'document_sha256' is distinct from d.sha256 then raise exception 'independent_exact_validation_required'; end if;
   if w.state<>'validation_pending' then
     if exists(select 1 from public.forge_approval_events where workflow_id=w.workflow_id and gate='plan' and document_version=v and action='validate' and actor=p_actor and payload=p_input) then return to_jsonb(w); end if;
     raise exception 'independent_validator_required';
   end if;
   -- Independent validator must read every artifact through the canonical route
   -- adapter. Its receipt is bound to the exact document and index readbacks.
   if p_input->'routing' is null or p_input->'routing'->>'status' is distinct from 'pass' or
     p_input->'routing'->>'document_sha256' is distinct from d.sha256 then raise exception 'artifact_routing_gate_failed'; end if;
   passed:=coalesce((p_input->>'passed')::boolean,false);
   if coalesce(jsonb_array_length(p_input->'routing'->'artifacts'),0)<>3 then raise exception 'artifact_readback_required'; end if;
   for artifact in select value from jsonb_array_elements(p_input->'routing'->'artifacts') loop
     insert into public.forge_approval_artifacts(workflow_id,document_version,kind,source_ref,sha256,intake_record_id,prd_id,architecture_version_id)
     values(w.workflow_id,v,artifact->>'kind',artifact->>'path',artifact->>'sha256',
       case when artifact->>'kind'='intake' then (artifact->>'artifact_id')::uuid end,
       case when artifact->>'kind'='plan' then artifact->>'artifact_id' end,
       case when artifact->>'kind'='architecture' then artifact->>'artifact_id' end);
   end loop;
   insert into public.forge_approval_events(workflow_id,gate,document_version,actor,role,action,document_sha256,payload)
   values(w.workflow_id,'plan',v,p_actor,p_role,'validate',d.sha256,p_input) returning event_id into event_key;
   update public.forge_approval_workflows set state=case when passed then 'review' else 'validation_failed' end,revision=revision+1,updated_at=now() where workflow_id=w.workflow_id;
   if passed then perform public.forge_approval_enqueue(w.workflow_id,'review_email','plan',v,'operator'); end if;
 elsif p_command='delegate' then
   if p_role<>'coordinator' or w.gate<>'plan' or w.state<>'review' or w.grant_data is null or w.grant_revoked then raise exception 'active_scope_grant_required'; end if;
   select * into d from public.forge_approval_documents where workflow_id=w.workflow_id and gate='plan' and version=v;
   if p_actor=d.created_by then raise exception 'builder_cannot_approve'; end if;
   grant_bound:=w.grant_data; plan_bound:=d.body->'limits';binding:=d.body->'binding';
   select sha256 into scope_hash from public.forge_approval_documents where workflow_id=w.workflow_id and gate='scope' and version=w.scope_version;
   if plan_bound is null or (grant_bound->>'expires_at')::timestamptz<=now() or grant_bound->>'scope_sha256'<>scope_hash or
      d.body->>'scope_sha256'<>scope_hash or
      not coalesce((grant_bound->'repositories') @> (plan_bound->'repositories'),false) or
      not coalesce((grant_bound->'environments') @> (plan_bound->'environments'),false) or
      not coalesce((grant_bound->'operations') @> (plan_bound->'operations'),false) or
      not coalesce((grant_bound->'phases') @> (binding->'phases'),false) or
      not coalesce((binding->'excluded_actions') @> (grant_bound->'excluded_actions'),false) or
      coalesce(jsonb_array_length(plan_bound->'repositories'),0)=0 or
      coalesce(jsonb_array_length(plan_bound->'environments'),0)=0 or
      coalesce(jsonb_array_length(plan_bound->'operations'),0)=0 or
      coalesce((plan_bound->>'cost')::numeric,-1)<0 or
      (plan_bound->>'cost')::numeric>(grant_bound->>'max_cost')::numeric or
      grant_bound->>'base_commit' is distinct from binding->>'base_commit' or
      grant_bound->>'profile_sha256' is distinct from binding->>'profile_sha256' or
      grant_bound->>'map_sha256' is distinct from binding->>'map_sha256' then raise exception 'plan_outside_scope_grant'; end if;
   if not exists(select 1 from public.forge_approval_events where workflow_id=w.workflow_id and gate='plan' and document_version=v and role='validator' and actor<>d.created_by and action='validate' and document_sha256=d.sha256 and payload->>'passed'='true' and payload->>'scope_conforms'='true') then raise exception 'scope_validation_required'; end if;
   insert into public.forge_approval_events(workflow_id,gate,document_version,actor,role,action,authorizing,document_sha256,payload)
   values(w.workflow_id,'plan',v,p_actor,p_role,'delegated_approve',true,d.sha256,jsonb_build_object('binding',binding,'grant',grant_bound)) returning event_id into event_key;
   update public.forge_approval_workflows set state='approved',revision=revision+1,updated_at=now() where workflow_id=w.workflow_id;
   update public.forge_approval_capabilities set revoked=true where workflow_id=w.workflow_id and consumed_event is null and role='operator';
   update public.forge_approval_outbox set state='cancelled' where workflow_id=w.workflow_id and kind='review_email' and state in ('pending','claimed');
   perform public.forge_approval_enqueue(w.workflow_id,'resume','plan',v);
 elsif p_command='revise' then
   if p_role<>'operator' or w.state='declined' then raise exception 'operator_revision_required'; end if;
   act:=coalesce(p_input->>'gate',w.gate);
   if act not in ('scope','plan') or (act='plan' and w.gate<>'plan') then raise exception 'invalid_revision_gate'; end if;
   update public.forge_approval_workflows set gate=act,state='changes_requested',grant_revoked=true,revision=revision+1,updated_at=now() where workflow_id=w.workflow_id;
   update public.forge_approval_capabilities set revoked=true where workflow_id=w.workflow_id and consumed_event is null;
   update public.forge_approval_outbox set state='cancelled' where workflow_id=w.workflow_id and state in ('pending','claimed');
   delete from public.forge_approval_reminders where workflow_id=w.workflow_id;
 elsif p_command='revoke_grant' then
   if p_role<>'operator' then raise exception 'operator_required'; end if;
   update public.forge_approval_workflows set grant_revoked=true,state=case when gate='plan' and state='approved' then 'review' else state end,revision=revision+1,updated_at=now() where workflow_id=w.workflow_id;
   update public.forge_approval_outbox set state='cancelled' where workflow_id=w.workflow_id and kind='resume' and state in ('pending','claimed');
 elsif p_command='release' then
   if p_role<>'coordinator' or w.gate<>'plan' or w.state<>'approved' then raise exception 'implementation_decision_required'; end if;
   select * into d from public.forge_approval_documents where workflow_id=w.workflow_id and gate='plan' and version=v;
   if p_input->'binding' is distinct from d.body->'binding' then raise exception 'release_binding_changed'; end if;
   select * into e from public.forge_approval_events where workflow_id=w.workflow_id and gate='plan' and document_version=v and authorizing and document_sha256=d.sha256 order by created_at desc limit 1;
   if e.event_id is null then raise exception 'implementation_decision_required'; end if;
   if e.action='delegated_approve' and (w.grant_revoked or (w.grant_data->>'expires_at')::timestamptz<=now()) then raise exception 'scope_grant_inactive'; end if;
   result:=jsonb_build_object('schema_version','forge-approval-release.v1','workflow_id',w.workflow_id,'decision_event',e.event_id,'plan_version',v,'binding',d.body->'binding','authorization_source',e.role,'execution_performed',false);
   insert into public.forge_approval_releases values(w.workflow_id,v,e.event_id,result,now()) on conflict(workflow_id,plan_version) do nothing;
   select receipt into result from public.forge_approval_releases where workflow_id=w.workflow_id and plan_version=v;
   return result;
 else raise exception 'unknown_command';
 end if;
 insert into public.forge_approval_events(workflow_id,gate,document_version,actor,role,action,authorizing,payload)
 values(w.workflow_id,w.gate,v,p_actor,p_role,p_command,p_command='accept',jsonb_build_object('previous_state',w.state));
 select * into w from public.forge_approval_workflows where workflow_id=w.workflow_id;
 return to_jsonb(w);
end $$;

create function public.forge_approval_snapshot(p_tenant text,p_agent text) returns jsonb
language sql security definer stable set search_path=pg_catalog,public as $$
 select coalesce(jsonb_agg(to_jsonb(w)||jsonb_build_object(
 'artifacts',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.forge_approval_artifacts a where a.workflow_id=w.workflow_id),
 'documents',(select coalesce(jsonb_agg(to_jsonb(d) order by gate,version),'[]') from public.forge_approval_documents d where d.workflow_id=w.workflow_id),
 'events',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at),'[]') from public.forge_approval_events e where e.workflow_id=w.workflow_id),
 'deliveries',(select coalesce(jsonb_agg(to_jsonb(o) order by created_at),'[]') from public.forge_approval_outbox o where o.workflow_id=w.workflow_id),
 'reminders',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.forge_approval_reminders r where r.workflow_id=w.workflow_id)
 ) order by w.updated_at desc),'[]') from (select * from public.forge_approval_workflows where tenant=p_tenant and agent_id=p_agent order by updated_at desc limit 100) w
$$;

create function public.forge_approval_job(p_tenant text,p_command text,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare o public.forge_approval_outbox; r record; result jsonb;
begin
 if p_command='claim' then
   -- Expired send leases are ambiguous: retrying could send duplicate mail.
   update public.forge_approval_outbox set state=case when kind='review_email' then 'ambiguous' else 'pending' end
    where state='claimed' and lease_until<now() and workflow_id in(select workflow_id from public.forge_approval_workflows where tenant=p_tenant and agent_id=p_input->>'agent_id');
   select j.* into o from public.forge_approval_outbox j join public.forge_approval_workflows w using(workflow_id)
    where w.tenant=p_tenant and w.agent_id=p_input->>'agent_id' and j.state='pending' and j.available_at<=now() and j.attempts<3
      and (p_input->>'kind' is null or j.kind=p_input->>'kind') order by j.created_at for update of j skip locked limit 1;
   if not found then return 'null'::jsonb; end if;
   update public.forge_approval_outbox set state='claimed',attempts=attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '60 seconds' where outbox_id=o.outbox_id returning * into o;
   return to_jsonb(o);
 elsif p_command='finish' then
   select j.* into o from public.forge_approval_outbox j join public.forge_approval_workflows w using(workflow_id) where w.tenant=p_tenant and w.agent_id=p_input->>'agent_id' and outbox_id=(p_input->>'outbox_id')::uuid for update of j;
   if not found or o.state<>'claimed' or o.lease_id is distinct from (p_input->>'lease_id')::uuid or o.lease_until<now() then raise exception 'invalid_job_lease'; end if;
   if p_input->>'state' not in ('delivered','ambiguous','failed') then raise exception 'invalid_job_result'; end if;
   update public.forge_approval_outbox set state=p_input->>'state',result=p_input->'result',lease_until=null where outbox_id=o.outbox_id;
   if o.kind='review_email' and p_input->>'state'='delivered' then
     insert into public.forge_approval_reminders values(o.workflow_id,o.gate,o.document_version,o.recipient_role,public.forge_approval_remind_at(now()),o.reminder,false)
     on conflict(workflow_id,gate,document_version,recipient_role) do nothing;
   end if;
   return jsonb_build_object('ok',true);
 elsif p_command='wake' then
   for r in select a.* from public.forge_approval_reminders a join public.forge_approval_workflows w using(workflow_id)
     where w.tenant=p_tenant and w.agent_id=p_input->>'agent_id' and w.state='review' and w.gate=a.gate and a.document_version=case when a.gate='scope' then w.scope_version else w.plan_version end
      and a.wake_at<=now() and a.count<2 for update of a skip locked loop
     perform public.forge_approval_enqueue(r.workflow_id,'review_email',r.gate,r.document_version,r.recipient_role,r.count+1);
     update public.forge_approval_reminders set count=count+1,wake_at=public.forge_approval_remind_at(now()),snoozed=false where workflow_id=r.workflow_id and gate=r.gate and document_version=r.document_version and recipient_role=r.recipient_role;
   end loop;
   return jsonb_build_object('ok',true);
 elsif p_command='retry' then
   select j.* into o from public.forge_approval_outbox j join public.forge_approval_workflows w using(workflow_id)
   where w.tenant=p_tenant and w.agent_id=p_input->>'agent_id' and j.outbox_id=(p_input->>'outbox_id')::uuid
     and j.state='failed' and j.attempts<3 and w.state not in ('declined','changes_requested')
     and ((j.kind='review_email' and w.state='review' and j.gate=w.gate and j.document_version=case when w.gate='plan' then w.plan_version else w.scope_version end)
       or (j.kind='generate_plan' and j.document_version=w.scope_version and (w.state='approved' or w.state='validation_pending'))
       or (j.kind='resume' and w.state='approved' and j.document_version=w.plan_version)) for update of j;
   if not found then raise exception 'failed_active_job_required'; end if;
   update public.forge_approval_outbox set state='pending',available_at=now()+make_interval(secs=>power(2,o.attempts)::integer),lease_id=null,lease_until=null where outbox_id=o.outbox_id;
   return jsonb_build_object('ok',true,'retry_after_seconds',power(2,o.attempts)::integer);
 elsif p_command='reconcile' then
   if p_input->>'resolution' not in ('delivered','not_sent') or coalesce(p_input->>'evidence','')='' then raise exception 'reconciliation_evidence_required'; end if;
   update public.forge_approval_outbox set state=case when p_input->>'resolution'='delivered' then 'delivered' else 'pending' end,result=p_input-'outbox_id'
    where outbox_id=(p_input->>'outbox_id')::uuid and state='ambiguous' and workflow_id in(select workflow_id from public.forge_approval_workflows where tenant=p_tenant and agent_id=p_input->>'agent_id');
   if not found then raise exception 'ambiguous_delivery_not_found'; end if;
   return jsonb_build_object('ok',true);
 end if;
 raise exception 'unknown_job_command';
end $$;

alter table public.forge_approval_workflows enable row level security;
alter table public.forge_approval_documents enable row level security;
alter table public.forge_approval_events enable row level security;
alter table public.forge_approval_artifacts enable row level security;
alter table public.forge_approval_capabilities enable row level security;
alter table public.forge_approval_outbox enable row level security;
alter table public.forge_approval_reminders enable row level security;
alter table public.forge_approval_releases enable row level security;
revoke all on public.forge_approval_workflows,public.forge_approval_documents,public.forge_approval_events,public.forge_approval_capabilities,public.forge_approval_outbox,public.forge_approval_reminders,public.forge_approval_releases from public,anon,authenticated,service_role;
revoke all on public.forge_approval_artifacts from public,anon,authenticated,service_role;
revoke all on function public.forge_approval_command(text,text,text,text,jsonb),public.forge_approval_snapshot(text,text),public.forge_approval_job(text,text,jsonb),public.forge_approval_enqueue(text,text,text,integer,text,integer),public.forge_approval_immutable(),public.forge_approval_hash(jsonb) from public,anon,authenticated;
grant execute on function public.forge_approval_command(text,text,text,text,jsonb),public.forge_approval_snapshot(text,text),public.forge_approval_job(text,text,jsonb) to service_role;

comment on table public.forge_approval_workflows is 'Proposal-linked approval spine. Source-only until rollout approval. No anonymous projections; access through role-bound service adapter.';

comment on table public.forge_approval_documents is 'Immutable scope and plan versions; SHA-256 uses PostgreSQL canonical JSONB bytes.';
comment on table public.forge_approval_events is 'Append-only decisions, client feedback and independent validation. Client events never authorize.';
comment on table public.forge_approval_artifacts is 'Verified canonical artifact destinations with native intake, PRD and architecture foreign keys.';
comment on table public.forge_approval_capabilities is 'Recipient-specific digests only; no raw bearer tokens. Exact consumed retry is readback only.';
comment on table public.forge_approval_outbox is 'Durable deduplicated notification/planning/resume intent. Ambiguous sends require reconciliation.';
comment on table public.forge_approval_reminders is 'Recipient-specific snooze and capped reminder streams; no approval by timeout.';
comment on table public.forge_approval_releases is 'Immutable bound implementation authorization. Does not itself execute a task.';

-- Typed proof envelopes use the canonical registry/writer. Runtime state remains
-- in the purpose-built tables above. Optional only for the minimal PGlite fixture.
do $$ begin
 if to_regclass('public.agent_os_data_contract_registry') is not null then
  insert into public.agent_os_data_contract_registry(contract_id,schema_path,mapping_mode,supabase_relation,sample_paths)
  select contract_id,'services/gbauto_agent_os/src/gbauto_agent_os/schemas/'||contract_id||'.schema.json',mapping_mode,relation,samples
  from (values
    ('forge-approval-scope-grant.v1', 'shared_envelope', 'agent_os_contract_records', array[]::text[]),
    ('forge-approval-release.v1', 'shared_envelope', 'agent_os_contract_records', array[]::text[]),
    ('forge-artifact-routing.v1', 'shared_envelope', 'agent_os_contract_records', array[]::text[]),
    ('forge-approval-delivery.v1', 'shared_envelope', 'agent_os_contract_records', array[]::text[])
  ) as seeds(contract_id,mapping_mode,relation,samples)
  on conflict(contract_id) do nothing;
 end if;
end $$;
