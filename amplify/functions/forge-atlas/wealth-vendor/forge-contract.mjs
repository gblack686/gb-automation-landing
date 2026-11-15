/** Shared browser/server contract. No auth SDK, credentials, or network access. */
export const BASE = '/api/wealth/v1';
export const APP = 'wealth-platform';
export const FIELDS = Object.freeze({read: 'forgeWealthRead', command: 'forgeWealthCommand'});
export const PATHS = Object.freeze({read: '/hosted-apps/wealth/read', command: '/hosted-apps/wealth/command'});
export const LIMITS = Object.freeze({input: 300000, wire: 330000, response: 800000, graphql: 900000, ageMs: 30000});
const encoder = new TextEncoder();
export const bytes = value => encoder.encode(value).byteLength;
export const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
export class TransportError extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
export const fail = (status = 422, code = 'invalid_request') => { throw new TransportError(status, code); };
export function shape(value, required = [], optional = []) {
  if (!isObject(value) || required.some(k => !Object.hasOwn(value, k))
      || Object.keys(value).some(k => !required.includes(k) && !optional.includes(k))) fail();
}
export function text(value, max = 128) {
  if (typeof value !== 'string' || !value.length || value.length > max || /[\x00-\x1f\x7f]/.test(value)) fail();
  return value;
}
export function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) fail();
  return value.toLowerCase();
}
export function boundedJSON(value, maximum = LIMITS.input) {
  let encoded;
  try { encoded = JSON.stringify(value); } catch { fail(); }
  if (typeof encoded !== 'string' || bytes(encoded) > maximum) fail(422, 'body_too_large');
  return encoded;
}
export function parseInput(value) {
  if (typeof value === 'string') {
    if (bytes(value) > LIMITS.input) fail(422, 'body_too_large');
    try { value = JSON.parse(value); } catch { fail(); }
  }
  boundedJSON(value);
  return value;
}
const integer = (v, min = 1) => { if (!Number.isSafeInteger(v) || v < min || v > 2147483647) fail(); };
const stamp = v => {
  text(v, 32);
  if (!v.endsWith('Z') || !Number.isFinite(Date.parse(v))) fail();
};
function importInput(v) {
  shape(v, ['source_kind', 'currency', 'cash', 'as_of'],
    ['name', 'portfolio_id', 'csv', 'positions', 'extraction_ref', 'acknowledged_uncertainties']);
  if (!['csv', 'manual', 'image'].includes(v.source_kind)) fail();
  if (!/^[A-Z]{3}$/.test(v.currency)) fail();
  text(v.cash, 128); stamp(v.as_of);
  if (v.name !== undefined) text(v.name);
  if (v.portfolio_id !== undefined) uuid(v.portfolio_id);
  if (v.extraction_ref !== undefined) text(v.extraction_ref, 256);
  if (v.source_kind === 'csv') {
    if (Object.hasOwn(v, 'positions') || typeof v.csv !== 'string' || bytes(v.csv) > 262144) fail();
  } else {
    if (Object.hasOwn(v, 'csv') || !Array.isArray(v.positions) || !v.positions.length || v.positions.length > 256) fail();
    for (const p of v.positions) {
      shape(p, ['quantity'], ['instrument_id', 'ticker', 'asset_type', 'currency', 'price', 'average_price', 'confidence', 'uncertainties', 'account']);
      text(p.quantity, 128);
      // Unresolved import values remain review data; Python owns monetary and review validation.
      for (const k of ['instrument_id', 'ticker', 'asset_type', 'currency', 'price', 'average_price', 'confidence', 'account']) {
        if (p[k] !== undefined && p[k] !== null && (typeof p[k] !== 'string' || p[k].length > 128)) fail();
      }
      if (p.uncertainties !== undefined) {
        if (!Array.isArray(p.uncertainties) || p.uncertainties.length > 16) fail();
        p.uncertainties.forEach(x => text(x, 120));
      }
    }
  }
  if (v.acknowledged_uncertainties !== undefined) {
    if (!Array.isArray(v.acknowledged_uncertainties) || v.acknowledged_uncertainties.length > 256) fail();
    v.acknowledged_uncertainties.forEach(x => integer(x, 0));
  }
}
const empty = new Set(['capabilities', 'portfolios', 'runs', 'reports', 'sources']);
const singles = Object.freeze({
  versions: ['portfolio_id', '/portfolios/', '/versions'],
  version: ['version_id', '/versions/', ''],
  draft: ['import_id', '/imports/', ''],
  run: ['run_id', '/runs/', ''],
  report: ['report_id', '/reports/', ''],
});
export const OPERATIONS = Object.freeze([
  ...empty, ...Object.keys(singles), 'events', 'feed',
  'createImport', 'reviseImport', 'confirmImport', 'research', 'cancel',
  'captureStatus', 'captureList', 'captureDetail', 'captureRun', 'captureStart', 'captureDelete',
]);
export const CAPTURE_OPERATIONS = Object.freeze(OPERATIONS.filter(name=>name.startsWith('capture')));
/** Logical endpoint mapping only: no caller-selected URL, method, tenant, or host. */
export function operation(input) {
  shape(input, ['operation', 'args']);
  boundedJSON(input);
  const name = input.operation, a = input.args;
  if (!OPERATIONS.includes(name)) fail(422, 'operation_not_allowed');
  let method = 'GET', path, body, query = {};
  if (name.startsWith('capture')) {
    path = '/whale-room/browser-captures';
    const requestKey = value => { if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(value)) fail(); };
    const captureId = value => { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) fail(); };
    const channel = value => { if (typeof value !== 'string' || !/^[1-9][0-9]{0,19}$/.test(value)) fail(); };
    if (name === 'captureStatus') { shape(a); path += '/status'; }
    else if (name === 'captureList') {
      shape(a, [], ['offset','revision','channel_id']);
      if (a.offset !== undefined) { integer(a.offset,0); if(a.offset>5000)fail(); query.offset=[String(a.offset)]; }
      if (a.revision !== undefined) { integer(a.revision,0); query.revision=[String(a.revision)]; }
      if (a.channel_id !== undefined) { channel(a.channel_id); query.channel_id=[a.channel_id]; }
    } else if (name === 'captureDetail') { shape(a,['id']); captureId(a.id); path += '/' + a.id; }
    else if (name === 'captureRun') { shape(a,['request_id']); requestKey(a.request_id); path += '/runs/' + a.request_id; }
    else if (name === 'captureStart') {
      shape(a,['request_id','requested_at','channel_id']); requestKey(a.request_id); stamp(a.requested_at); channel(a.channel_id);
      method='POST'; body=a;
    } else {
      shape(a,['request_id','requested_at'],['id']); requestKey(a.request_id); stamp(a.requested_at);
      if(a.id!==undefined){captureId(a.id);path+='/'+a.id;}
      method='DELETE'; body={request_id:a.request_id,requested_at:a.requested_at};
    }
  } else if (empty.has(name)) { shape(a); path = '/' + name; }
  else if (Object.hasOwn(singles, name)) {
    const [key, prefix, suffix] = singles[name]; shape(a, [key]);
    path = prefix + uuid(a[key]) + suffix;
  } else if (name === 'events') {
    shape(a, ['run_id'], ['after']); integer(a.after ?? 0, 0);
    path = '/runs/' + uuid(a.run_id) + '/events'; query = {after: [String(a.after ?? 0)]};
  } else if (name === 'feed') {
    shape(a, ['source_id', 'symbol', 'kind']); text(a.source_id); text(a.symbol, 32);
    if (!['quote', 'trade'].includes(a.kind)) fail();
    path = '/feeds'; query = {source_id: [a.source_id], symbol: [a.symbol], kind: [a.kind]};
  } else if (name === 'createImport') {
    shape(a, ['idempotency_key', 'import']); text(a.idempotency_key); importInput(a.import);
    method = 'POST'; path = '/imports'; body = a;
  } else if (name === 'reviseImport') {
    shape(a, ['import_id', 'draft_revision', 'import']); integer(a.draft_revision); importInput(a.import);
    method = 'PATCH'; path = '/imports/' + uuid(a.import_id);
    body = {draft_revision: a.draft_revision, import: a.import};
  } else if (name === 'confirmImport') {
    shape(a, ['import_id', 'draft_revision', 'confirmed', 'idempotency_key']);
    integer(a.draft_revision); text(a.idempotency_key);
    if (a.confirmed !== true) fail(422, 'explicit_confirmation_required');
    method = 'POST'; path = '/imports/' + uuid(a.import_id) + '/confirm';
    body = {draft_revision: a.draft_revision, confirmed: true, idempotency_key: a.idempotency_key};
  } else if (name === 'research') {
    shape(a, ['request_id', 'portfolio_version_id', 'preset', 'question', 'evidence_cutoff'], ['intent', 'source_ids']);
    text(a.request_id); uuid(a.portfolio_version_id); text(a.question, 2000); stamp(a.evidence_cutoff);
    if (!['quick_answer', 'daily_brief', 'deep_research'].includes(a.preset)
        || a.intent !== undefined && !['research', 'valuation'].includes(a.intent)) fail();
    if (a.source_ids !== undefined) {
      if (!Array.isArray(a.source_ids) || a.source_ids.length > 64 || new Set(a.source_ids).size !== a.source_ids.length) fail();
      a.source_ids.forEach(x => text(x));
    }
    method = 'POST'; path = '/research'; body = a;
  } else {
    shape(a, ['run_id']); method = 'POST'; path = '/runs/' + uuid(a.run_id) + '/cancel'; body = {};
  }
  return {kind: method === 'GET' ? 'read' : 'command', method, path: BASE + path, query, ...(body === undefined ? {} : {body})};
}
const safeCodes = new Set(['authentication_required', 'access_denied', 'route_not_found', 'service_unavailable', 'transport_disabled',
  'storage_unavailable','capture_disabled','driver_unavailable','driver_refused','recording_not_disabled','attachment_not_approved',
  'channel_not_open','ambiguous_channel','source_changed','capture_deadline','capture_cancelled','capture_bounds','capture_quota',
  'capture_busy','invalid_snapshot','capture_failed','capture_not_found','capture_run_not_found','capture_request_conflict',
  'capture_expired','capture_page_changed',
  'invalid_request', 'operation_not_allowed', 'body_too_large', 'response_too_large', 'invalid_server_response',
  'report_source_access_denied', 'source_access_denied', 'explicit_confirmation_required', 'draft_revision_conflict', 'import_idempotency_conflict',
  'confirmation_idempotency_conflict', 'research_idempotency_conflict', 'confirmed_import_is_immutable',
  'import_needs_review', 'lease_lost', 'source_unavailable_or_revoked', 'source_revision_changed', 'conflict']);
const generic = {401: 'authentication_required', 403: 'access_denied', 404: 'route_not_found', 409: 'conflict', 422: 'invalid_request', 503: 'service_unavailable'};
export function result(status, body) {
  if (![200, 202, 401, 403, 404, 409, 422, 503].includes(status)) fail(503, 'invalid_server_response');
  if (status === 200 || status === 202) {
    shape(body, ['data']); boundedJSON(body, LIMITS.response);
    return {status, body};
  }
  const code = body?.error?.code;
  return {status, body: {error: {code: safeCodes.has(code) ? code : generic[status]}}};
}
export function safeFailure(error) {
  return result(error instanceof TransportError ? error.status : 503,
    {error: {code: error instanceof TransportError ? error.code : 'service_unavailable'}});
}
