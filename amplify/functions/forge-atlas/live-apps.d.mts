export function validateAppConfig(c:unknown):unknown;
export function validateBenchmarkProjection(data:unknown,binding:unknown):unknown;
export function makeLiveAppHandler(options:{issuer:string|undefined;operatorSubject?:string;config?:unknown;
 registry:(claims:{sub:string})=>Promise<unknown>;loadManifest:()=>Promise<{bytes:Buffer;sha256:string}>;
 credential:()=>Promise<string>;fetcher?:typeof fetch}):{available:(row:unknown,catalog:string)=>boolean;handle:(event:unknown)=>Promise<{payload:unknown}>};
