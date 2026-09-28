export const EXPERT: 'artist-packet-expert';
export const TENANT: 'gbautomation';
export const CONFIG_SHA: string;
export function workspaceFor(expert?: string): {tenant_id:string;agent_id:string;config_sha256:string};
export function makeHandler(options: {
  issuer: string | undefined;
  rpc: (body: unknown) => Promise<unknown>;
  document: (binding: {agent_id:string}) => Promise<unknown>;
  proposals: (request: {view: string; query: Record<string, unknown>; workspace?:string}) => Promise<unknown>;
}): (event: unknown) => Promise<{payload: unknown}>;
