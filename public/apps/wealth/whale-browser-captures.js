/** Operator-saved accessibility transcripts. No source requests on mount or timers. */
const el = (tag, cls = '', text = '') => {const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
const when = value => value ? new Date(value).toLocaleString() : 'Unknown';
const errors = {
  capture_disabled:'Browser capture is not configured. The local operator must configure the approved attachment.',
  driver_unavailable:'The approved browser driver is unavailable. Ask the local operator to prepare it, then retry.',
  driver_refused:'The browser driver refused access. Review the operator permission prompt; capture did not bypass it.',
  recording_not_disabled:'Capture stopped because driver recording was enabled or could not be verified as disabled.',
  attachment_not_approved:'The configured browser attachment is not exactly bound and approved.',
  channel_not_open:'Open the configured channel in the approved browser tab, then retry.',
  ambiguous_channel:'More than one approved channel tab is open. Leave one matching tab, then retry.',
  source_changed:'The source tab or channel changed. Nothing was imported.',
  capture_deadline:'The capture timed out. Nothing from this job will be imported after its deadline.',
  capture_cancelled:'Capture was cancelled. No later result from that job will be imported.',
  capture_bounds:'The visible snapshot exceeds the capture limits. Reduce visible content before retrying.',
  capture_quota:'Local capture storage is full. Delete saved snapshots or all captures before retrying.',
  capture_busy:'Another capture is still running. Wait for it to finish before retrying.',
  invalid_snapshot:'The driver returned an unsupported snapshot. Nothing was imported.',
  storage_unavailable:'Supabase is unavailable. Saved data could not be refreshed. Retry with the same request.',
  capture_request_conflict:'This request identity was already used for another operation. Reload saved captures.',
  capture_expired:'This request expired. Reload saved captures before starting a new capture.',
  capture_page_changed:'Saved captures changed on another device. Reload from the first page.',
};
export function mountBrowserCaptures(root, {enqueue, call, back, isStopped, cloud=false, onChannels=()=>{}, onSelection=()=>{}}) {
  let epoch=0, active=false, timer, requestId=null, requestAt=null, requestChannel=null, runId=null, enabled=false, pending=false, offset=0, next=null, revision=null, deletion=null;
  let savedChannel='', channels=[], selectedId=null, loadedCount=0;
  const workspace=root.closest('.whale-workspace');
  const button=(label,action)=>{const b=el('button','',label);b.type='button';b.onclick=action;return b;};
  const toolbar=el('div','wr-capture-toolbar');
  const capture=button('Capture visible messages',start), reload=button('Reload saved captures',()=>load()), returnButton=typeof back==='function'?button('Back to workspace',back):null;
  const channel=el('select');channel.setAttribute('aria-label','Capture channel');
  const channelLabel=el('label','wr-field','Capture channel');channelLabel.append(channel);
  channel.onchange=()=>{updateSource();};
  const status=el('p','wr-notice');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const source=el('p','wr-meta');
  const savedScope=el('p','wr-meta','Saved history: All channels');savedScope.hidden=!cloud;
  const note=el('p','wr-meta','Saved locally from your browser · Partial history · Not live or bot-verified. Identical text may be saved only once; changed text is saved separately.');
  if(cloud){note.textContent='Saved privately in Supabase after acknowledgement · Capture on Mac mini #2 · Partial history. Identical text may collapse; author, original date and message identity are unverified.';capture.textContent='Capture on Mac mini #2';}
  const body=el('div','wr-capture-body'), list=el('ul','wr-capture-list'), detail=el('section','wr-capture-detail');
  list.setAttribute('aria-label','Saved browser captures');detail.setAttribute('aria-label','Saved capture detail');detail.tabIndex=-1;
  const navigation=el('nav','wr-capture-pagination');navigation.setAttribute('aria-label','Saved capture pages');
  const previous=button('Previous captures',()=>{offset=Math.max(0,offset-40);load();});
  const more=button('More captures',()=>{if(next!==null){offset=next;load();}});
  const removeAll=button('Delete all browser captures',()=>{confirmAll.hidden=false;confirmAll.focus();});
  const confirmAll=button('Confirm delete all local captures',()=>remove());confirmAll.hidden=true;
  if(cloud)confirmAll.textContent='Confirm delete all saved captures';
  if(returnButton)toolbar.append(returnButton);
  toolbar.append(channelLabel,capture);body.append(list,detail);navigation.append(previous,more);
  const heading=el('h2','wr-channel-title','All messages'),search=el('input','wr-message-search');
  search.type='search';search.placeholder='Search messages on this page…';search.setAttribute('aria-label','Search saved messages on this page');search.autocomplete='off';search.maxLength=120;
  const resultCount=el('span','wr-result-count');resultCount.setAttribute('aria-live','polite');
  const noMatches=el('p','wr-search-empty','No messages on this page match your search.');noMatches.hidden=true;
  const modeButtons=[];
  const options=el('details','wr-capture-options');
  if(cloud){
    const header=el('header','wr-forum-header'),context=el('div','wr-forum-context');
    const channelToggle=button('☰',()=>{workspace.dataset.pane='channels';});channelToggle.className='wr-mobile-channel-toggle';channelToggle.setAttribute('aria-label','Browse channels');
    const hash=el('span','wr-channel-icon','#');hash.setAttribute('aria-hidden','true');context.append(hash,heading,el('span','wr-header-description','Your private Discord library'));
    reload.textContent='↻';reload.setAttribute('aria-label','Reload saved captures');reload.title='Reload saved captures';reload.className='wr-icon-button';
    const summary=el('summary','','Capture');options.append(summary);
    const settings=el('div','wr-capture-settings');settings.append(el('h3','','Save from Discord'),toolbar,source,note,el('hr'),removeAll,confirmAll);options.append(settings);
    header.append(channelToggle,context,reload,options);
    const feed=el('section','wr-forum-feed'),modes=el('div','wr-forum-modes');modes.setAttribute('role','group');modes.setAttribute('aria-label','Message layout');
    for(const [value,label] of [['forum','Forum'],['chat','Chat']]){
      const b=button(label,()=>{workspace.dataset.view=value;for(const item of modeButtons)item.setAttribute('aria-pressed',String(item.dataset.mode===value));});
      b.dataset.mode=value;b.setAttribute('aria-pressed',String(value==='forum'));modeButtons.push(b);modes.append(b);
    }
    const feedTools=el('div','wr-forum-tools');feedTools.append(search,modes);
    const listHeader=el('div','wr-list-heading');listHeader.append(el('span','','LATEST SAVED'),resultCount);
    feed.append(feedTools,listHeader,status,list,noMatches,navigation);
    body.replaceChildren(feed,detail);root.append(header,savedScope,body);
    search.oninput=filterList;
    root.addEventListener('keydown',event=>{if(event.key==='Escape'&&(options.open||workspace.dataset.pane==='detail'||workspace.dataset.pane==='channels')){event.preventDefault();event.stopPropagation();if(options.open){options.open=false;summary.focus();}else if(workspace.dataset.pane==='detail')closeDetail();else{workspace.dataset.pane='feed';channelToggle.focus();}}});
    // An opened capture menu never changes the source selection or starts a job.
    root.addEventListener('click',event=>{if(options.open&&!options.contains(event.target))options.open=false;});
  }else{
    toolbar.append(reload);navigation.append(removeAll,confirmAll);root.append(el('h3','','Browser captures'),toolbar,source,savedScope,note,status,body,navigation);
  }
  function titleFor(text){return String(text||'Saved message').split(/\r?\n/).map(line=>line.trim()).find(Boolean)?.slice(0,140)||'Saved message';}
  function forumExcerpt(text){const lines=String(text||'').trim().split(/\r?\n/);return lines.length>1?lines.slice(1).join('\n').trim():'';}
  function filterList(){
    const query=search.value.trim().toLocaleLowerCase();let count=0;
    for(const row of list.querySelectorAll('.wr-row')){row.hidden=!!query&&!row.textContent.toLocaleLowerCase().includes(query);if(!row.hidden)count++;}
    resultCount.textContent=query?`${count} of ${loadedCount} on this page`:`${loadedCount} on this page`;
    noMatches.hidden=!query||count>0||loadedCount===0;
  }
  function emptyDetail(){
    selectedId=null;scrub(detail);workspace?.removeAttribute('data-selected');
    for(const b of list.querySelectorAll('[data-capture-id]'))b.setAttribute('aria-pressed','false');
    if(cloud){const empty=el('div','wr-reader-empty');empty.append(el('span','wr-reader-empty-icon','☷'),el('h3','','A little more context'),el('p','','Select a message to read the full saved text alongside the conversation.'),el('span','wr-meta','Read-only · Partial history'));detail.append(empty);}
  }
  function closeDetail(){const id=selectedId;emptyDetail();if(cloud)workspace.dataset.pane='feed';list.querySelector(`[data-capture-id="${id}"]`)?.focus();}
  function scrub(node){[...node.querySelectorAll('*')].reverse().forEach(n=>{n.textContent='';n.removeAttribute('href');});node.replaceChildren();}
  function message(error){return errors[error.code||error.message] || 'Saved capture request failed. Use Reload saved captures to retry.';}
  function updateSource(){source.textContent=channel.value?`Selected source: Whale Room / #${channel.selectedOptions[0].textContent}`:'No browser attachment configured. Saved captures remain private and readable.';}
  function update(){capture.disabled=!enabled||pending;channel.disabled=!enabled||pending||!!requestId;reload.disabled=pending;previous.disabled=pending||offset===0;more.disabled=pending||next===null;for(const b of list.querySelectorAll('button'))b.disabled=pending;}
  function queue(key, task){
    const version=epoch;
    enqueue('browser:'+key,async()=>{
      const current=()=>active&&!isStopped()&&version===epoch;
      if(!current())return;
      try{await task(current);}catch(error){if(current()){status.textContent=message(error);pending=false;if(error.code==='capture_page_changed'){offset=0;revision=null;scrub(list);scrub(detail);}update();}}
    });
  }
  function load(){
    epoch++;clearTimeout(timer);pending=false;search.value='';noMatches.hidden=true;if(cloud)workspace.dataset.pane='feed';update();
    queue('load',async current=>{
      status.textContent=cloud?'Loading private saved captures…':'Loading local browser captures…';
      if(cloud){scrub(list);scrub(detail);await loadList(current);if(!current())return;}
      const state=await call('/browser-captures/status');if(!current())return;
      enabled=state.enabled;
      channels=state.channels||[];
      onChannels(channels);
      onSelection(savedChannel);
      const chosen=channel.value;channel.replaceChildren();for(const c of state.channels||[])channel.append(new Option(c.name,c.id));
      channel.value=(state.channels||[]).some(c=>c.id===chosen)?chosen:(state.channel?.id||'');
      updateSource();
      if(!cloud)await loadList(current);if(!current())return;
      status.textContent=state.deletion_pending?'Deletion pending. Supabase will be retried; local staged text has been removed.':enabled?(cloud?'Saved messages are up to date.':'Ready. Capture saves only the messages visible in your approved browser tab.'):(cloud?'Saved messages are available. Connect the MM2 browser to capture more.':errors.capture_disabled);
      update();
      if(state.active_run){runId=state.active_run;pending=true;update();poll();}
    });
  }
  async function loadList(current){
    const data=await call('/browser-captures?offset='+offset+(cloud&&offset>0&&revision!==null?'&revision='+revision:'')+(cloud&&savedChannel?'&channel_id='+encodeURIComponent(savedChannel):''));if(!current())return;
    revision=data.revision??null;
    next=data.next_offset;scrub(list);emptyDetail();loadedCount=(data.items||[]).length;
    if(!data.items?.length)list.append(el('li','wr-notice',cloud?
      `No saved captures${savedChannel?' for this channel':''}. To save visible messages, open the approved channel in the prepared Mac mini #2 browser, then choose Capture on Mac mini #2 when the connector is ready.`:
      'No saved browser captures. Open the approved channel, then choose Capture visible messages.'));
    for(const item of (data.items||[]).slice(0,40)){
      const row=el('li','wr-row'), open=button('',show.bind(null,item.id));open.className='wr-message';open.dataset.captureId=item.id;open.setAttribute('aria-pressed','false');
      if(cloud){
        const tags=el('span','wr-post-tags');tags.append(el('span','wr-post-channel','# '+item.channel_name),el('span','wr-post-kind','Saved text'));
        const footer=el('span','wr-post-footer');footer.append(el('span','',`Saved ${when(item.last_captured_at)}`),el('span','wr-post-open','Read message →'));
        open.append(tags,el('h3','wr-post-title',titleFor(item.excerpt)),el('span','wr-excerpt wr-forum-excerpt',forumExcerpt(item.excerpt)),el('span','wr-excerpt wr-chat-excerpt',item.excerpt),footer);
      }else open.append(el('strong','',`#${item.channel_name} · Saved ${when(item.last_captured_at)}`),el('span','wr-meta','Partial history · Saved snapshot'),el('span','wr-excerpt',item.excerpt));
      row.append(open);list.append(row);
    }
    filterList();update();
  }
  function show(id){
    epoch++;clearTimeout(timer);
    queue('detail',async current=>{
      const data=await call('/browser-captures/'+id);if(!current())return;
      const item=data.capture;scrub(detail);selectedId=id;
      for(const b of list.querySelectorAll('[data-capture-id]'))b.setAttribute('aria-pressed',String(b.dataset.captureId===id));
      if(cloud){
        workspace.dataset.pane='detail';workspace.dataset.selected='true';
        const detailHead=el('div','wr-reader-heading'),backButton=button('Back to saved captures',closeDetail);backButton.className='wr-reader-back';
        detailHead.append(backButton,el('span','wr-post-channel','# '+item.channel_name));
        const meta=el('div','wr-reader-source');meta.append(el('span','wr-source-orb','#'),el('div','','Saved from #'+item.channel_name),el('time','wr-meta','Captured '+when(item.last_captured_at)));
        detail.append(detailHead,el('h2','wr-reader-title',titleFor(item.body)),meta,el('pre','wr-original',item.body));
      }else detail.append(button('Back to saved captures',closeDetail),el('h3','',`#${item.channel_name}`),
        el('p','wr-meta',`First captured: ${when(item.first_captured_at)} · Last captured: ${when(item.last_captured_at)} · Observed in ${item.observations} captures`),
        el('p','wr-meta','Saved from your browser · Partial history. Text read from the page; author, original date and message ID are unknown.'),
        el('pre','wr-original',item.body));
      if(/^https:\/\/discord\.com\/channels\/[1-9][0-9]{0,19}\/[1-9][0-9]{0,19}$/.test(item.url||'')){
        const link=el('a','','Open source channel');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';detail.append(link);
      }
      item.body=''; // Retain private text only in the scrubbed detail DOM, not action closures.
      const evidence=cloud?el('details','wr-message-evidence'):detail;
      if(cloud){evidence.append(el('summary','','About this saved message'),el('p','wr-meta',`First captured: ${when(item.first_captured_at)} · Last captured: ${when(item.last_captured_at)} · Observed in ${item.observations} captures`),el('p','wr-meta','Partial history. Source author, original date, message ID and replies are not verified.'));
        detail.append(el('p','wr-reader-footnote','Read-only saved text. Continue the conversation in Discord.'));}
      for(const run of data.recent_captures||[])evidence.append(el('p','wr-meta',`Saved ${when(run.finished_at)} · ${run.query_complete?'Visible message scan complete.':'Some displayed text may be missing.'} History remains partial.`));
      const deleteOne=button('Delete saved snapshot',()=>{deleteOne.hidden=true;confirmOne.hidden=false;confirmOne.focus();});
      const confirmOne=button('Confirm delete saved snapshot',()=>remove(id));confirmOne.hidden=true;evidence.append(deleteOne,confirmOne);if(cloud)detail.append(evidence);detail.focus();
    });
  }
  function remove(id){
    epoch++;clearTimeout(timer);pending=false;options.open=false;if(cloud)workspace.dataset.pane='feed';scrub(detail);scrub(list);
    queue('delete',async current=>{
      if(!deletion||deletion.id!==id)deletion={id,request_id:crypto.randomUUID(),requested_at:new Date().toISOString()};
      const result=await call('/browser-captures'+(id?'/'+id:''),{method:'DELETE',...(cloud?{body:{request_id:deletion.request_id,requested_at:deletion.requested_at}}:{})});if(!current())return;
      if(result?.deletion_pending){enabled=false;status.textContent='Deletion pending. Local staged text is removed; Supabase will be retried. Reload to check completion.';update();return;}
      deletion=null;
      runId=requestId=null;offset=0;confirmAll.hidden=true;
      await loadList(current);if(!current())return;
      status.textContent=cloud?'Saved content deleted from Supabase and the local outbox. Minimal replay protection receipts remain.':id?'Saved snapshot deleted locally.':'All browser captures and receipts deleted locally.';
      reload.focus();update();
    });
  }
  function start(){
    if(!active||pending||!enabled)return;
    options.open=false;
    epoch++;if(!requestId){requestId=crypto.randomUUID();requestAt=new Date().toISOString();requestChannel=channel.value;}pending=true;update();
    queue('admit',async current=>{
      status.textContent='Requesting one visible-message capture…';
      const result=await call('/browser-captures',{method:'POST',body:{request_id:requestId,channel_id:requestChannel,...(cloud?{requested_at:requestAt}:{})}});if(!current())return;
      runId=result.run.id;requestId=null;handleRun(result.run,current);
    });
  }
  function handleRun(run,current){
    if(!current())return;
    if(run.state==='pending'||run.state==='upload_pending'){status.textContent=run.state==='upload_pending'?'Captured on Mac mini #2. Upload pending; not yet acknowledged by Supabase.':cloud?'Capturing visible articles on Mac mini #2…':'Capturing visible articles from the approved browser…';pending=true;update();poll();return;}
    pending=false;runId=null;update();
    if(run.state==='complete'){
      status.textContent=`${cloud?'Saved privately in Supabase':'Saved locally'}: ${run.added} new, ${run.duplicates} duplicates, ${run.seen} visible messages. Partial history.${run.query_complete?'':' Some displayed text may be missing.'}`;
      queue('readback',async current=>{offset=0;await loadList(current);if(current())capture.focus();});
    }else{status.textContent=errors[run.error_code]||'Capture failed. No snapshot was imported.';}
  }
  function poll(){clearTimeout(timer);timer=setTimeout(()=>queue('job',async current=>{const data=await call('/browser-captures/runs/'+runId);handleRun(data.run,current);}),1000);}
  return {
    open(){active=true;root.hidden=false;offset=0;load();(returnButton||reload).focus();},
    selectChannel(id){
      if(!cloud||!active||isStopped()||id===savedChannel||(id&&!channels.some(c=>c.id===id)))return;
      savedChannel=id;offset=0;next=null;revision=null;confirmAll.hidden=true;
      heading.textContent=id?channels.find(c=>c.id===id).name:'All messages';
      savedScope.textContent=id?`Saved history: #${channels.find(c=>c.id===id).name}`:'Saved history: All channels';
      // Invalidate in-flight list/detail responses before any new request starts.
      scrub(list);scrub(detail);onSelection(savedChannel);load();
    },
    close(){active=false;epoch++;clearTimeout(timer);pending=false;root.hidden=true;scrub(list);scrub(detail);source.textContent=status.textContent='';},
    destroy(){this.close();requestId=runId=null;scrub(root);},
  };
}
