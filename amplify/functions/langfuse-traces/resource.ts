import { defineFunction } from '@aws-amplify/backend';

export const langfuseTraces = defineFunction({
  name: 'langfuse-traces',
  entry: './handler.ts',
  environment: {
    LANGFUSE_SECRET_ID: 'gbautomation/infrastructure/langfuse',
  },
});
