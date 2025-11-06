import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
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
