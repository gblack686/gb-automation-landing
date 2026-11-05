export const PI_ACTIONS: readonly string[];
export function piInputDigest(actor:string,expert:string,action:string,resource:string,catalog:string):string;
export function makePiJobHandler(options:{
 issuer:string|undefined;operatorSubject?:string;enabled?:boolean;
 registry:(claims:{sub:string})=>Promise<unknown>;
 rpc:(name:string,args:Record<string,unknown>)=>Promise<unknown>;
 authorizeResource:(expert:string,action:string,resource:string,catalog:string)=>Promise<boolean>;
}):(event:unknown)=>Promise<{payload:unknown}>;
