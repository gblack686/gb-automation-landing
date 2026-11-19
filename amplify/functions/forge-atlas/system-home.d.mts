export function systemTTL(value?: unknown): number;
export function validateSystemSnapshot(raw: any, now?: number, ttl?: number): any;
export function makeSystemHomeHandler(options: {issuer?: string; operatorSubject?: string; registry: (claims:any)=>Promise<any>; load:()=>Promise<any>; enabled?:boolean; ttl?:number; clock?:()=>number}): (event:any)=>Promise<any>;
