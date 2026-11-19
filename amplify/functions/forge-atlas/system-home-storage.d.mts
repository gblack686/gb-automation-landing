export const SYSTEM_HOME_ROOT: string;
export function makeSystemHomeStorage(options: {client:any;bucket?:string;timeoutMs?:number}): ()=>Promise<any>;
