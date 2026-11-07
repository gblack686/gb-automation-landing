// Data-only destinations shared by the search projector and workspace host.
// An identity is either preserved exactly or rejected; it is never shortened.
export const recordIdentity = value => typeof value==='string' && value.length>0 && value.length<=512 && !/[\x00-\x1f\x7f]/.test(value);
export const recordScope = source => ['pr','code'].includes(source)?'shared_repository':'expert_owned';
export function githubDestination(source,href) {
 if(typeof href!=='string'||href.length>1000||/[\x00-\x1f\x7f]/.test(href))return null;
 const prefix='https://github\\.com/(?:gbauto/gbautomation|gblack686/gb-automation-landing)/';
 const tail=source==='pr'?'pull/[1-9][0-9]*':source==='code'?'blob/(?:[A-Za-z0-9._~-]+/)+[A-Za-z0-9._~-]+(?:#L[1-9][0-9]*(?:-L[1-9][0-9]*)?)?':null;
 if(!tail||!new RegExp('^'+prefix+tail+'$').test(href)||href.split('/').some(part=>['.','..'].includes(part)))return null;
 return href;
}
export function recordNavigation(source,id,navigation) {
 if(!recordIdentity(id)||!navigation||typeof navigation!=='object'||Array.isArray(navigation))return null;
 const {kind}=navigation;
 if(source==='proposal'&&['proposal','plan'].includes(kind)&&Object.keys(navigation).sort().join()==='id,kind'
  &&navigation.id===id&&(kind==='proposal'?/^prop_[a-z0-9_]{1,190}$/:/^prd_[a-f0-9]{20}$/).test(id))return {kind,id};
 if(source==='session'&&kind==='session'&&Object.keys(navigation).sort().join()==='id,kind'
  &&recordIdentity(navigation.id))return {kind,id:navigation.id};
 if(['pr','code'].includes(source)&&kind==='github'&&Object.keys(navigation).sort().join()==='href,kind'){
  const href=githubDestination(source,navigation.href);if(href)return {kind,href};
 }
 return null;
}
