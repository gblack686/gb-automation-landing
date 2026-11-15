export function makeWealthAppHandler(options:{issuer:string|undefined;operatorSubject?:string;config?:unknown;resourcesEnabled?:boolean;
 registry:(claims:{sub:string})=>Promise<unknown>;loadManifest:()=>Promise<{bytes:Buffer;sha256:string}>;
 credentials:()=>Promise<{read:string;command:string|null}>;fetcher?:typeof fetch}):{available:(row:unknown,catalog:string)=>boolean;handle:(event:unknown)=>Promise<{payload:unknown}>};
