export const EXPERT: 'artist-packet-expert';
export const TENANT: 'gbautomation';
export const CONFIG_SHA: string;
export function makeHandler(options: {
  issuer: string | undefined;
  rpc: (body: unknown) => Promise<unknown>;
  document: (agent: string) => Promise<unknown>;
  proposals: (request: {view: string; query: Record<string, unknown>; agent_id?: string}) => Promise<unknown>;
  registry?: (claims: {sub:string}) => Promise<unknown>;
}): (event: unknown) => Promise<{payload: unknown}>;
