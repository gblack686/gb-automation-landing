export const EXPERT: 'artist-packet-expert';
export const TENANT: 'gbautomation';
export const CONFIG_SHA: string;
export function operatorBootstrap(sub: string, allowedSub: string | undefined): unknown | null;
export function projectApprovalSnapshot(raw: unknown, agent: string, now?: string): unknown;
export function project(request: {view:string;agent_id:string;config_sha256?:string}, raw: unknown): unknown;
export function makeHandler(options: {
  issuer: string | undefined;
  rpc: (body: unknown) => Promise<unknown>;
  document: (agent: string) => Promise<unknown>;
  schedule?: (day: string) => Promise<unknown>;
  search?: (request: {agent_id:string;query:{query:string;source:string;limit:number}}) => Promise<unknown>;
  operatorData?: (request: {agent_id:string;query:{surface:string;q?:string;date?:string}}) => Promise<unknown>;
  operatorSubject?: string;
  proposals: (request: {view: string; query: Record<string, unknown>; agent_id?: string}) => Promise<unknown>;
  approvalSnapshot?: (request: {agent_id: string}) => Promise<unknown>;
  registry?: (claims: {sub:string}) => Promise<unknown>;
}): (event: unknown) => Promise<{payload: unknown}>;
