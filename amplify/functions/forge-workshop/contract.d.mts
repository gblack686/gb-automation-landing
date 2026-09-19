export type WorkshopEvent = {
  identity?: { claims?: Record<string, unknown> };
  arguments?: Record<string, unknown>;
  info?: { fieldName?: string };
};
export type WorkshopPayload = { ok: boolean; error?: string; [key: string]: unknown };
export function makeHandler(options: {
  issuer: string | undefined;
  enabled: boolean;
  rpc: (name: string, body: unknown) => Promise<WorkshopPayload>;
  catalog: unknown;
}): (event: WorkshopEvent) => Promise<{ payload: WorkshopPayload }>;
