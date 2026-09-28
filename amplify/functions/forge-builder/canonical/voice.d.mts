export const MAX_VOICE_SECONDS: number;
export function createVoice(options?:{enabled?:boolean,apiKey?:string,agentId?:string,toolId?:string}):{
 validate:()=>Promise<unknown>;
 mint:(sessionId:string)=>Promise<{signed_url:string,session_id:string,max_seconds:number,prompt:string,tool_id:string|null}>;
};
