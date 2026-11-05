import { createHash } from 'node:crypto';

export const RESOURCE_SCHEMA = 'hosted-resource-delivery.v1';
export const RESOURCE_ROOT = 'gbautomation/resources';
export const RESOURCE_MAX_BYTES = 8_000_000;
export const RESOURCE_TYPES = Object.freeze({
 'text/html':'html', 'text/plain':'txt', 'text/markdown':'md',
 'application/json':'json', 'image/png':'png',
});
const slug = /^[a-z][a-z0-9-]{1,62}$/;
const id = /^[a-z][a-z0-9._-]{2,159}$/;
const sha = /^[a-f0-9]{64}$/;
const commit = /^[a-f0-9]{40}$/;
const matches = (pattern,value) => typeof value === 'string' && pattern.test(value);
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const fail = () => { throw Error('Resource source unavailable'); };
const text = (value, max) => typeof value === 'string' && value.length > 0 && value.length <= max
 && !/[\x00-\x1f\x7f]|https?:\/\/|(?:localhost|127\.0\.0\.1)|(?:[A-Z]:[\\/])|(?:\/Users\/|\/home\/)|(?:Bearer\s|AKIA[A-Z0-9]{16})/i.test(value);
const timestamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const version = value => typeof value === 'string' && /^[A-Za-z0-9._~+-]{1,200}$/.test(value) && value !== 'null';

export function resourceQuery(view, query) {
 if (!object(query)) return false;
 if (view === 'resourceArtifact') return Object.keys(query).sort().join() === 'catalog_sha256,resource_id'
  && matches(id,query.resource_id) && matches(sha,query.catalog_sha256);
 if (view !== 'resourceCatalog' || Object.keys(query).some(k => !['owner','kind','search','offset'].includes(k))) return false;
 return (query.owner === undefined || matches(slug,query.owner))
  && (query.kind === undefined || ['ui','kb','process'].includes(query.kind))
  && (query.search === undefined || (typeof query.search === 'string' && query.search.length <= 120 && !/[\x00-\x1f\x7f]/.test(query.search)))
  && (query.offset === undefined || (Number.isSafeInteger(query.offset) && query.offset >= 0 && query.offset <= 1500));
}

export function artifactKey(artifact) {
 if (!object(artifact) || !sha.test(artifact.sha256) || !Object.hasOwn(RESOURCE_TYPES,artifact.media_type)
     || !Number.isSafeInteger(artifact.bytes) || artifact.bytes < 1 || artifact.bytes > RESOURCE_MAX_BYTES
     || !version(artifact.version_id)) fail();
 const key = `${RESOURCE_ROOT}/artifacts/${artifact.sha256}.${RESOURCE_TYPES[artifact.media_type]}`;
 if (artifact.key !== key) fail();
 return key;
}

export function validateResourceManifest(raw, expectedSha, now = Date.now()) {
 if (!Buffer.isBuffer(raw) || raw.length > 1_500_000 || !sha.test(expectedSha)
     || createHash('sha256').update(raw).digest('hex') !== expectedSha) fail();
 const value = JSON.parse(raw.toString('utf8'));
 if (value?.schema_version !== RESOURCE_SCHEMA || value.tenant_id !== 'gbautomation'
     || !commit.test(value.source_commit) || !timestamp(value.captured_at)
     || Date.parse(value.captured_at) > now + 60_000
     || !Array.isArray(value.resources) || value.resources.length > 1500) fail();
 const seen = new Set();
 for (const row of value.resources) {
  if (!object(row) || !matches(id,row.id) || seen.has(row.id) || !text(row.title,200)
      || !(row.owner_expert === null || matches(slug,row.owner_expert))
      || !['ui','kb','process'].includes(row.kind)
      || !['artifact','live_app','unavailable'].includes(row.delivery_mode)
      || !commit.test(row.source_commit) || !timestamp(row.observed_at) || !timestamp(row.expires_at)
      || Date.parse(row.observed_at) > now + 60_000 || Date.parse(row.expires_at) < Date.parse(row.observed_at)
      || (row.description !== undefined && row.description !== '' && !text(row.description,300))) fail();
  seen.add(row.id);
  if (row.delivery_mode === 'artifact') {
   artifactKey(row.artifact);
   if (!row.owner_expert || row.content_sha256 !== row.artifact.sha256) fail();
  } else if (row.artifact !== undefined && row.artifact !== null) fail();
  if (row.delivery_mode === 'live_app' && (!row.owner_expert || !matches(id,row.app_id))) fail();
 }
 return value;
}

// Authentication and registered-agent checks run in makeHandler before this adapter.
// The catalog is a private fleet view for the exact operator, with canonical owners.
export function makeResourceService({enabled = false, loadManifest, describeArtifact, clock = Date.now}) {
 return async request => {
  if (!enabled || !resourceQuery(request.view,request.query)) fail();
  const now = clock();
  const manifest = await loadManifest();
  const data = validateResourceManifest(manifest.bytes,manifest.sha256,now);
  const envelope = {tenant_id:'gbautomation',agent_id:request.agent_id,catalog_sha256:manifest.sha256,
   source_commit:data.source_commit,captured_at:data.captured_at};
  if (request.view === 'resourceArtifact') {
   if (request.query.catalog_sha256 !== manifest.sha256) fail();
   const row = data.resources.find(row => row.id === request.query.resource_id);
   if (!row || row.delivery_mode !== 'artifact') fail();
   // A stale capture remains readable as last-good evidence; it is never freshened by a read.
   const asset = await describeArtifact(row.artifact);
   return {...envelope,schema_version:'forge-resource-artifact.v1',resource_id:row.id,
    owner_expert:row.owner_expert,sha256:row.artifact.sha256,bytes:row.artifact.bytes,
    media_type:row.artifact.media_type,version_id:row.artifact.version_id,url:asset.url,
    expires_at:new Date(now+60_000).toISOString(),observed_at:row.observed_at,
    freshness:Date.parse(row.expires_at)>now?'fresh':'stale'};
  }
  const {owner,kind,search='',offset=0} = request.query;
  const matching = data.resources.filter(row => (!owner || row.owner_expert===owner)
   && (!kind || row.kind===kind) && `${row.title} ${row.description||''}`.toLowerCase().includes(search.toLowerCase()));
  return {...envelope,schema_version:'forge-resource-catalog.v1',
   owners:[...new Set(data.resources.map(row=>row.owner_expert).filter(Boolean))].sort(),
   total:matching.length,offset,next:offset+50<matching.length?offset+50:null,
   rows:matching.slice(offset,offset+50).map(row=>({
    id:row.id,title:row.title,description:row.description||'',owner_expert:row.owner_expert,
    kind:row.kind,delivery_mode:row.delivery_mode,source_commit:row.source_commit,
    content_sha256:row.delivery_mode==='artifact'?row.content_sha256:null,
    observed_at:row.observed_at,expires_at:row.expires_at,
    freshness:Date.parse(row.expires_at)>now?'fresh':'stale',
    availability:row.delivery_mode==='artifact'?'saved_result':'unavailable',
   }))};
 };
}

export function validateResourcePointer(value) {
 if (value?.schema_version !== 'hosted-resource-pointer.v1' || !sha.test(value.manifest_sha256)
     || !version(value.manifest_version_id)) fail();
 return {key:`${RESOURCE_ROOT}/manifests/${value.manifest_sha256}.json`,
  sha256:value.manifest_sha256,version_id:value.manifest_version_id};
}
