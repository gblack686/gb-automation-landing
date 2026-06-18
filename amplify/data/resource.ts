import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { langfuseTraces } from '../functions/langfuse-traces/resource';
import { macMiniOps } from '../functions/mac-mini-ops/resource';

const schema = a.schema({
  LangfuseTracePayload: a.customType({
    payload: a.json(),
  }),

  langfuseTraces: a
    .query()
    .arguments({
      hours: a.integer(),
      observationPages: a.integer(),
      limit: a.integer(),
    })
    .returns(a.ref('LangfuseTracePayload'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(langfuseTraces)),

  // /ops/mac-mini dashboard. All three route to the single macMiniOps Lambda, which
  // reads telemetry from / writes intent rows to Supabase (service key from SM).
  MacMiniResult: a.customType({
    payload: a.json(),
  }),

  macMiniTelemetry: a
    .query()
    .returns(a.ref('MacMiniResult'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(macMiniOps)),

  macMiniRequest: a
    .query()
    .arguments({ id: a.string().required() })
    .returns(a.ref('MacMiniResult'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(macMiniOps)),

  createMacMiniRequest: a
    .mutation()
    .arguments({ action: a.string().required(), params: a.json() })
    .returns(a.ref('MacMiniResult'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(macMiniOps)),

  ContactSubmission: a
    .model({
      name: a.string().required(),
      email: a.email().required(),
      company: a.string(),
      phone: a.string(),
      projectDescription: a.string().required(),
      message: a.string(),
      status: a.enum(['new', 'contacted', 'qualified', 'closed']),
    })
    .authorization((allow) => [allow.publicApiKey()]),

  // Whitelisted files from the second-brain vault. The GitHub Action in the
  // gbautomation repo is the only writer; the website reads via Cognito.
  // Path is the natural key (e.g. "tasks/blockers.md") so re-publishes
  // upsert by path. Only the whitelist in the publish script controls what
  // ever gets created here — schema deliberately stays generic.
  VaultDoc: a
    .model({
      path: a.string().required(),
      title: a.string(),
      bodyMd: a.string().required(),
      sha: a.string(),
      updatedAt: a.datetime(),
    })
    .secondaryIndexes((index) => [index('path').queryField('vaultDocByPath')])
    .authorization((allow) => [
      allow.publicApiKey(),
      allow.authenticated().to(['read']),
    ]),

  MallCrawlTarget: a
    .model({
      sourceUrl: a.url().required(),
      handle: a.string().required(),
      displayName: a.string(),
      platform: a.string(),
      status: a.enum(['queued', 'active', 'paused', 'errored']),
      submittedAt: a.datetime(),
      lastRunAt: a.datetime(),
      lastRunStatus: a.string(),
    })
    .secondaryIndexes((index) => [index('handle').queryField('mallCrawlTargetByHandle')])
    .authorization((allow) => [
      allow.authenticated(),
      allow.publicApiKey().to(['read']),
    ]),

  // Capability catalog (skills / commands / experts / agents) mirrored from the
  // gbautomation repo by scripts/publish_capabilities.py (GitHub Action). The repo
  // is PRIVATE, so bodyMd carries internal detail — reads are Cognito-only and the
  // public API key gets WRITE only (never read). Rendered by /ops/capabilities/*.
  Capability: a
    .model({
      slug: a.string().required(),
      kind: a.string().required(), // skill | command | expert | agent
      owner: a.string(),
      description: a.string(),
      triggers: a.string(),
      model: a.string(),
      path: a.string().required(),
      bodyMd: a.string(),
      sha: a.string(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.authenticated().to(['read']),
      allow.publicApiKey().to(['create', 'update', 'delete']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
