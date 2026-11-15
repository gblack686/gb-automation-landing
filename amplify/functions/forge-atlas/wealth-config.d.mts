export type WealthConfig={enabled:true;origin:string;expert_id:string;resource_id:string;catalog_sha256:string;source_commit:string;tenant_bindings:Record<string,string>};
export function validateWealthConfig(value:unknown):WealthConfig;
export function wealthSecretArns(read:unknown,command?:string,benchmark?:string):string[];
