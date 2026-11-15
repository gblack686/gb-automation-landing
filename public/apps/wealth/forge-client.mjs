/** Inject an existing Amplify generateClient() result; never import server gateway code here. */
import {BASE, FIELDS, LIMITS, boundedJSON, fail, operation, parseInput, result, safeFailure, shape, text} from './forge-contract.mjs';
import {validateCaptureResponse} from './capture-response.mjs';

export function createForgeWealthClient({client, enabled = false, expertId, resourceId, catalogSha256} = {}) {
  return {
    async request(name, args = {}, {withStatus=false} = {}) {
      try {
        if (enabled !== true) fail(503, 'transport_disabled');
        const input = {operation: name, args};
        const route = operation(input);
        text(expertId, 63); text(resourceId, 160);
        if (!/^[0-9a-f]{64}$/.test(catalogSha256)) fail();
        const field = FIELDS[route.kind], group = route.kind === 'read' ? 'queries' : 'mutations';
        if (typeof client?.[group]?.[field] !== 'function') fail(503, 'service_unavailable');
        const response = await client[group][field]({input: boundedJSON({
          expert_id: expertId, resource_id: resourceId, catalog_sha256: catalogSha256, ...input,
        })}, {authMode: 'userPool'});
        if (response?.errors?.some(error => ['Unauthorized', 'UnauthorizedException'].includes(error?.errorType))) fail(401, 'authentication_required');
        if (response?.errors?.length || !response?.data) fail(503, 'service_unavailable');
        let payload = response.data.payload;
        if (typeof payload === 'string') {
          if (new TextEncoder().encode(payload).byteLength > LIMITS.graphql) fail(503, 'response_too_large');
          try { payload = JSON.parse(payload); } catch { fail(503, 'invalid_server_response'); }
        }
        shape(payload, ['schema_version', 'operation', 'status', 'body']);
        if (payload.schema_version !== 'wealth-forge-response.v1') fail(503, 'invalid_server_response');
        boundedJSON(payload, LIMITS.graphql);
        const checked = result(payload.status, payload.body);
        validateCaptureResponse(name,checked.status,checked.body);
        if (![200,202].includes(checked.status)) fail(checked.status, checked.body.error.code);
        if (payload.operation !== name) fail(503, 'invalid_server_response');
        return withStatus ? checked : checked.body.data;
      } catch (error) {
        if (['UserUnAuthenticatedException', 'NoValidAuthTokensError'].includes(error?.name)) fail(401, 'authentication_required');
        // SDK/provider errors may contain endpoints or credentials. Only our closed codes survive.
        const output = safeFailure(error);
        fail(output.status, output.body.error.code);
      }
    },
  };
}

/** Exact logical REST facade for the existing wealth UI. No HTTP cookie request is sent. */
export function createForgeFetch(amplifyClient, options = {}) {
  const client = createForgeWealthClient({client: amplifyClient, ...options});
  return async function forgeFetch(input, init = {}) {
    if (init.signal?.aborted) throw new DOMException('The request was aborted', 'AbortError');
    let output;
    try {
      if (typeof input !== 'string' || input.length > 4096 || !input.startsWith(BASE + '/')
          || input.includes('#') || input.includes('\\') || input.split('?').length > 2) fail(404, 'route_not_found');
      const [path, search = ''] = input.split('?');
      const method = init.method ?? 'GET', q = new URLSearchParams(search), headers = new Headers(init.headers);
      if (headers.has('authorization') || headers.has('cookie')) fail(403, 'access_denied');
      const query = (names, optional = []) => {
        if ([...q.keys()].some(k => !names.includes(k) && !optional.includes(k))
            || [...new Set(q.keys())].some(k => q.getAll(k).length !== 1)
            || names.some(k => !q.has(k))) fail();
      };
      const body = () => {
        if (typeof init.body !== 'string' || headers.get('content-type')?.split(';')[0] !== 'application/json') fail();
        return parseInput(init.body);
      };
      let name, args = {}, match;
      const suffix = path.slice(BASE.length);
      if (method === 'GET') {
        if (init.body !== undefined) fail();
        const list = { '/capabilities':'capabilities', '/portfolios':'portfolios', '/runs':'runs', '/reports':'reports', '/sources':'sources' };
        if (suffix === '/whale-room/browser-captures/status') { query([]); name='captureStatus'; }
        else if (suffix === '/whale-room/browser-captures') {
          query([],['offset','revision','channel_id']); name='captureList';
          for(const key of ['offset','revision'])if(q.has(key)){
            if(!/^(0|[1-9][0-9]{0,15})$/.test(q.get(key)))fail(); args[key]=Number(q.get(key));
          }
          if(q.has('channel_id'))args.channel_id=q.get('channel_id');
        } else if ((match=/^\/whale-room\/browser-captures\/runs\/([^/]+)$/.exec(suffix))) {
          query([]);name='captureRun';args={request_id:match[1]};
        } else if ((match=/^\/whale-room\/browser-captures\/([^/]+)$/.exec(suffix))) {
          query([]);name='captureDetail';args={id:match[1]};
        } else if (Object.hasOwn(list, suffix)) { query([]); name = list[suffix]; }
        else if ((match = /^\/portfolios\/([^/]+)\/versions$/.exec(suffix))) {
          query([]); name = 'versions'; args = {portfolio_id: match[1]};
        } else if ((match = /^\/(versions|imports|runs|reports)\/([^/]+)$/.exec(suffix))) {
          query([]); name = {versions:'version', imports:'draft', runs:'run', reports:'report'}[match[1]];
          args = {[{versions:'version_id', imports:'import_id', runs:'run_id', reports:'report_id'}[match[1]]]: match[2]};
        } else if ((match = /^\/runs\/([^/]+)\/events$/.exec(suffix))) {
          query([], ['after']); const cursor = q.get('after') ?? '0';
          if (!/^(0|[1-9][0-9]{0,9})$/.test(cursor)) fail();
          name = 'events'; args = {run_id: match[1], after: Number(cursor)};
        } else if (suffix === '/feeds') {
          query(['source_id','symbol','kind']); name = 'feed'; args = Object.fromEntries(q);
        } else fail(404, 'route_not_found');
      } else {
        query([]);
        if (method === 'POST' && suffix === '/whale-room/browser-captures') {
          name='captureStart';args=body();
        } else if (method === 'DELETE' && (match=/^\/whale-room\/browser-captures(?:\/([a-f0-9]{64}))?$/.exec(suffix))) {
          name='captureDelete';args=body();shape(args,['request_id','requested_at']);
          if(match[1])args={...args,id:match[1]};
        } else if (method === 'POST' && suffix === '/imports') {
          name = 'createImport'; args = body();
        } else if (method === 'POST' && suffix === '/research') {
          name = 'research'; args = body();
        } else if (method === 'PATCH' && (match = /^\/imports\/([^/]+)$/.exec(suffix))) {
          const b = body(); shape(b, ['draft_revision','import']);
          name = 'reviseImport'; args = {...b, import_id: match[1]};
        } else if (method === 'POST' && (match = /^\/imports\/([^/]+)\/confirm$/.exec(suffix))) {
          const b = body(); shape(b, ['draft_revision','confirmed','idempotency_key']);
          name = 'confirmImport'; args = {...b, import_id: match[1]};
        } else if (method === 'POST' && (match = /^\/runs\/([^/]+)\/cancel$/.exec(suffix))) {
          shape(body()); name = 'cancel'; args = {run_id: match[1]};
        } else fail(404, 'route_not_found');
      }
      output = await client.request(name, args, {withStatus:true});
    } catch (error) { output = safeFailure(error); }
    return new Response(JSON.stringify(output.body), {status: output.status, headers: {
      'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
    }});
  };
}
