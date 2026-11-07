// Shared immutable saved-result address. Actual resource ownership and content
// are checked again by the existing authenticated reader before rendering.
const version=v=>typeof v==='string'&&/^[A-Za-z0-9._~+-]{1,200}$/.test(v)&&v!=='null';
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export function validSavedBinding(b){
 const keys=['resource_id','catalog_sha256','catalog_version_id','content_sha256','version_id'];
 return !!b&&typeof b==='object'&&!Array.isArray(b)&&Object.keys(b).length===keys.length&&keys.every(k=>Object.hasOwn(b,k))
  &&typeof b.resource_id==='string'&&/^[a-z][a-z0-9._-]{2,159}$/.test(b.resource_id)
  &&sha(b.catalog_sha256)&&sha(b.content_sha256)&&version(b.catalog_version_id)&&version(b.version_id);
}
