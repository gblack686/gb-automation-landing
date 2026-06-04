import { defineFunction } from '@aws-amplify/backend';

// Backs the /ops/mac-mini dashboard: reads sanitized Mac Mini telemetry from Supabase
// and enqueues allowlisted action-requests the Mini poller executes. Cognito auth is
// enforced at the AppSync layer (allow.authenticated()); the Supabase service key is
// read from AWS Secrets Manager via the Lambda's IAM role (see backend.ts).
export const macMiniOps = defineFunction({
  name: 'mac-mini-ops',
  entry: './handler.ts',
  timeoutSeconds: 30,
  environment: {
    SUPABASE_SECRET_ID: 'gbautomation/infrastructure/supabase/gbauto',
  },
});
