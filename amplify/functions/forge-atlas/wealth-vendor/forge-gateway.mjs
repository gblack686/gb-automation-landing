/** Server-only preparation. No listener, SDK initialization, key file, or runtime activation. */
import {createHmac, randomUUID, timingSafeEqual} from 'node:crypto';
import {validateCaptureResponse} from './capture-response.mjs';
import {
  APP, FIELDS, PATHS, LIMITS, CAPTURE_OPERATIONS, TransportError, boundedJSON, bytes, fail, operation, parseInput,
  result, safeFailure, shape, text, uuid,
} from './forge-contract.mjs';
const SHA = /^[0-9a-f]{64}$/;
const common = ['issuer','expert_id','resource_id','catalog_sha256','source_commit'];
function binding(config, remote) {
  shape(config, remote ? [...common, 'origin'] : common);
  text(config.issuer, 256); text(config.expert_id, 63); text(config.resource_id, 160);
  if (!config.issuer.startsWith('https://') || !/^[a-z][a-z0-9-]{1,62}$/.test(config.expert_id)
      || !/^ui\.[a-z0-9._-]{2,150}$/.test(config.resource_id) || !SHA.test(config.catalog_sha256)
      || !/^[0-9a-f]{40}$/.test(config.source_commit)) fail(503, 'service_unavailable');
  if (remote && (typeof config.origin !== 'string' || !/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.ts\.net(?::8443)?$/.test(config.origin))) fail(503, 'service_unavailable');
}
async function keysFrom(callback) {
  const keys = await callback();
  shape(keys, ['read', 'command']);
  if (!SHA.test(keys.read) || keys.command !== null && (!SHA.test(keys.command) || keys.command === keys.read)) fail(503, 'service_unavailable');
  return keys;
}
function signature(key, domain, path, raw) {
  if (!SHA.test(key) || !Object.values(PATHS).includes(path) || typeof raw !== 'string') fail(503, 'service_unavailable');
  return createHmac('sha256', Buffer.from(key, 'hex')).update(domain + '\n' + path + '\n' + raw).digest('hex');
}
export const signWealthRequest = (key, path, raw) => signature(key, 'POST', path, raw);
export const signWealthResponse = (key, path, raw) => signature(key, 'RESPONSE', path, raw);
function matches(actual, expected) {
  return typeof actual === 'string' && SHA.test(actual) && timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
function leak(raw, keys) { return raw.includes(keys.read) || keys.command !== null && raw.includes(keys.command); }
async function readResponse(response) {
  if (response.status !== 200 || !response.body || response.headers.has('set-cookie') || response.headers.has('location')
      || response.headers.get('content-type')?.split(';')[0] !== 'application/json') fail(503, 'service_unavailable');
  const chunks = []; let size = 0; const reader = response.body.getReader();
  try {
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > LIMITS.response) fail(503, 'response_too_large');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}
function browserReply(name, value) {
  const payload = {schema_version:'wealth-forge-response.v1', operation:name, ...value};
  // AWSJSON can be serialized as a string inside GraphQL. Bound that actual envelope too.
  if (bytes(JSON.stringify({data:{forgeWealthRead:{payload:JSON.stringify(payload)}}})) > LIMITS.graphql) {
    return {payload:{schema_version:'wealth-forge-response.v1', operation:name, ...safeFailure(new TransportError(503, 'response_too_large'))}};
  }
  return {payload};
}
/**
 * verifyIdentity must call the existing trusted AppSync/Cognito verifier, not trust JSON/HTTP headers.
 * authorize checks current active expert + subject registration + private resource/catalog binding.
 * tenantFor resolves the verified subject to the UUID used by wp_tenants; never browser input.
 * credentials returns distinct server-only {read: hexKey, command: hexKey|null}.
 */
export function createForgeWealthGateway({
  enabled = false, config, verifyIdentity, authorize, tenantFor, credentials,
  fetcher = fetch, clock = Date.now, captureOnly = false,
} = {}) {
  if (enabled === true) binding(config, true);
  return {async handle(event) {
    let name = 'unknown';
    try {
      if (enabled !== true) fail(503, 'transport_disabled');
      let claims;
      try { claims = await verifyIdentity(event); }
      catch (error) {
        // Exact denials from the pinned Forge authenticate() contract; outages stay 503.
        if (error?.constructor?.name === 'ReadError' &&
            ['authentication_required', 'tenant_access_required'].includes(error.message)) fail(403, 'access_denied');
        throw error;
      }
      if (!claims || claims.iss !== config.issuer || !Array.isArray(claims['cognito:groups'])
          || !claims['cognito:groups'].includes('tenant-gbautomation')) fail(403, 'access_denied');
      let actor;
      try { actor = uuid(claims.sub); } catch { fail(403, 'access_denied'); }
      shape(event.arguments, ['input']);
      const input = parseInput(event.arguments.input);
      shape(input, ['expert_id','resource_id','catalog_sha256','operation','args']);
      name = typeof input.operation === 'string' && input.operation.length <= 32 ? input.operation : 'unknown';
      if (captureOnly && !CAPTURE_OPERATIONS.includes(name)) fail(403, 'access_denied');
      const route = operation({operation: input.operation, args: input.args});
      if (event.typeName !== (route.kind === 'read' ? 'Query' : 'Mutation')
          || (event.fieldName ?? event.info?.fieldName) !== FIELDS[route.kind]
          || input.expert_id !== config.expert_id || input.resource_id !== config.resource_id
          || input.catalog_sha256 !== config.catalog_sha256) fail(403, 'access_denied');
      if (await authorize({claims, expertId:config.expert_id, resourceId:config.resource_id, catalogSha256:config.catalog_sha256}) !== true) fail(403, 'access_denied');
      let tenant;
      try { tenant = uuid(await tenantFor(actor, config.expert_id)); } catch { fail(403, 'access_denied'); }
      const keys = await keysFrom(credentials), key = keys[route.kind];
      if (key === null) fail(503, 'transport_disabled');
      const nonce = randomUUID(), timestamp = clock();
      const envelope = {
        schema_version:'wealth-forge-request.v1', app_id:APP, actor, tenant_id:tenant,
        expert_id:config.expert_id, resource_id:config.resource_id, catalog_sha256:config.catalog_sha256,
        source_commit:config.source_commit, operation:input.operation, args:input.args, timestamp, nonce,
      };
      const raw = boundedJSON(envelope, LIMITS.wire), path = PATHS[route.kind];
      const response = await fetcher(config.origin + path, {
        method:'POST', credentials:'omit', redirect:'error', signal:AbortSignal.timeout(12000),
        headers:{'Content-Type':'application/json', 'X-Gbauto-Wealth-Signature':signWealthRequest(key, path, raw)}, body:raw,
      });
      const received = await readResponse(response);
      if (leak(received, keys) || !matches(response.headers.get('x-gbauto-wealth-signature'), signWealthResponse(key, path, received))) fail(503, 'invalid_server_response');
      const out = JSON.parse(received);
      shape(out, ['schema_version','app_id','nonce','actor','tenant_id','resource_id','operation','status','body']);
      if (out.schema_version !== 'wealth-forge-result.v1' || out.app_id !== APP || out.nonce !== nonce
          || out.actor !== actor || out.tenant_id !== tenant || out.resource_id !== config.resource_id
          || out.operation !== name) fail(503, 'invalid_server_response');
      validateCaptureResponse(name,out.status,out.body);
      return browserReply(name, result(out.status, out.body));
    } catch (error) { return browserReply(name, safeFailure(error)); }
  }};
}

/** Production capture binding: cannot activate portfolio, research, bot archive or trading. */
export function createForgeCaptureGateway(options = {}) {
  return createForgeWealthGateway({...options,captureOnly:true});
}

/**
 * Adapter seam for the existing Pi listener. It DOES NOT start a server.
 * Listener must cap incoming bytes/time before buffering. dispatch is a fixed host callback
 * to WealthAPI.dispatch with this validated principal and generated endpoint, never a proxy.
 * principalFor rechecks the signed actor's current server-side tenant binding.
 */
export function createWealthReceiver({
  enabled = false, config, credentials, principalFor, dispatch, clock = Date.now,
} = {}) {
  if (enabled === true) binding(config, false);
  let active = 0;
  return {async handle(request) {
    let counted = false;
    try {
      if (enabled !== true) fail(503, 'transport_disabled');
      const kind = Object.keys(PATHS).find(k => PATHS[k] === request.path);
      const headers = new Headers(request.headers);
      if (!kind || request.method !== 'POST' || ['origin','cookie','authorization','upgrade'].some(k => headers.has(k))
          || headers.get('content-type') !== 'application/json') fail(403, 'access_denied');
      if (active >= 2) fail(503, 'service_unavailable');
      active++; counted = true;
      const raw = typeof request.body === 'string' ? request.body : new TextDecoder('utf-8', {fatal:true}).decode(request.body);
      if (bytes(raw) > LIMITS.wire) fail(422, 'body_too_large');
      const keys = await keysFrom(credentials), key = keys[kind];
      if (key === null || !matches(headers.get('x-gbauto-wealth-signature'), signWealthRequest(key, request.path, raw))) fail(403, 'access_denied');
      const input = JSON.parse(raw);
      shape(input, ['schema_version','app_id','actor','tenant_id','expert_id','resource_id','catalog_sha256','source_commit','operation','args','timestamp','nonce']);
      if (input.schema_version !== 'wealth-forge-request.v1' || input.app_id !== APP || input.expert_id !== config.expert_id
          || input.resource_id !== config.resource_id || input.catalog_sha256 !== config.catalog_sha256
          || input.source_commit !== config.source_commit || !Number.isSafeInteger(input.timestamp)
          || Math.abs(clock() - input.timestamp) > LIMITS.ageMs) fail(403, 'access_denied');
      uuid(input.nonce); uuid(input.actor); uuid(input.tenant_id);
      const route = operation({operation:input.operation, args:input.args});
      if (route.kind !== kind) fail(403, 'access_denied');
      const principal = await principalFor(input.actor);
      if (!principal || principal.subject !== input.actor || principal.tenant_id !== input.tenant_id) fail(403, 'access_denied');
      let outcome;
      try { const value = await dispatch(principal, route); outcome = result(value.status, value.body); }
      catch { outcome = safeFailure(null); }
      const body = JSON.stringify({
        schema_version:'wealth-forge-result.v1', app_id:APP, nonce:input.nonce, actor:input.actor,
        tenant_id:input.tenant_id, resource_id:input.resource_id, operation:input.operation, ...outcome,
      });
      if (bytes(body) > LIMITS.response) fail(503, 'response_too_large');
      if (leak(body, keys)) fail(503, 'service_unavailable');
      return {status:200, headers:{
        'content-type':'application/json', 'cache-control':'no-store', 'x-content-type-options':'nosniff',
        'x-gbauto-wealth-signature':signWealthResponse(key, request.path, body),
      }, body};
    } catch (error) {
      const out = safeFailure(error);
      return {status:out.status, headers:{'content-type':'application/json', 'cache-control':'no-store'}, body:JSON.stringify(out.body)};
    } finally { if (counted) active--; }
  }};
}
