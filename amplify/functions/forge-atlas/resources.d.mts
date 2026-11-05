export function resourceQuery(view:string, query:unknown):boolean;
export function validateResourceManifest(raw:Buffer,expectedSha:string,now?:number):{resources:any[]};
export function makeResourceService(options:{enabled?:boolean;loadManifest:()=>Promise<any>;describeArtifact:(artifact:any)=>Promise<any>;clock?:()=>number}):(request:any)=>Promise<any>;
