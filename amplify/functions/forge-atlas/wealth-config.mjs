const sha=/^[a-f0-9]{64}$/;
const uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function validateWealthConfig(config) {
 if(!object(config)||Object.keys(config).sort().join()!==['enabled','origin','expert_id','resource_id','catalog_sha256','source_commit','tenant_bindings'].sort().join()
  ||config.enabled!==true||typeof config.origin!=='string'||!/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.ts\.net(?::8443)?$/.test(config.origin)
  ||!/^[a-z][a-z0-9-]{1,62}$/.test(config.expert_id)||!/^ui\.[a-z0-9._-]{2,150}$/.test(config.resource_id)
  ||!sha.test(config.catalog_sha256)||!/^[a-f0-9]{40}$/.test(config.source_commit)||!object(config.tenant_bindings))throw Error('Wealth configuration invalid');
 const entries=Object.entries(config.tenant_bindings);
 if(!entries.length||entries.length>20||entries.some(([key,value])=>!sha.test(key)||typeof value!=='string'||!uuid.test(value)))throw Error('Wealth identity mapping invalid');
 return config;
}
export function wealthSecretArns(read,command='',benchmark='') {
 const arn=/^arn:aws:secretsmanager:[a-z0-9-]+:\d{12}:secret:[A-Za-z0-9/_+=.@-]+$/;
 if(typeof read!=='string'||!arn.test(read)||read===benchmark
  ||command&&(typeof command!=='string'||!arn.test(command)||command===read||command===benchmark))throw Error('Dedicated Wealth secret ARNs required');
 return command?[read,command]:[read];
}
