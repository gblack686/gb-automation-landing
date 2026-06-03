import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { langfuseTraces } from '../functions/langfuse-traces/resource';

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
