export type FactoryRequest = {agent_id:string;config_sha256:string};
export type FactorySnapshot = {
  schema_version:'forge-factory-workspace.v1';
  tenant_id:'gbautomation';
  agent_id:string;
  expert_id:string;
  config_sha256:string;
  captured_at:string;
  snapshot_sha256:string;
  freshness:'recent'|'stale';
  [key:string]:unknown;
};
export function validateFactory(bytes:Buffer,expectedSha:string,request:FactoryRequest,now?:number):FactorySnapshot;
export function makeFactoryService(options:{
  enabled?:boolean;
  load:(agent:string)=>Promise<{bytes:Buffer;sha256:string}>;
  now?:()=>number;
}):(request:FactoryRequest)=>Promise<FactorySnapshot>;
