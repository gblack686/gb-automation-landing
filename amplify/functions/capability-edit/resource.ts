import { defineFunction } from '@aws-amplify/backend';

// Backs the agent-mediated, PR-gated capability write-back path for /ops/capabilities.
// Cognito auth (allow.authenticated(); the AppSync field is further gated to the
// tenant-gbautomation group) is enforced at the AppSync layer. This Lambda holds NO
// credentials in code: the fine-grained GitHub PAT is read from AWS Secrets Manager via
// the function's IAM role at runtime (see backend.ts for the GetSecretValue grant).
//
// The PAT must be scoped to ONLY the single gbautomation repo with
//   contents:write + pull_requests:write
// and is provisioned at deploy time under the secret id below. GitHub markdown stays
// canonical: this Lambda opens a pull request, it NEVER mutates AppSync.
export const capabilityEdit = defineFunction({
  name: 'capability-edit',
  entry: './handler.ts',
  timeoutSeconds: 30,
  environment: {
    // Secret id only — NO secret value lives here or anywhere in the repo.
    CAPABILITY_EDIT_SECRET_ID: 'gbautomation/github/website-crud-pat',
    TARGET_REPO: 'gbauto/gbautomation',
    TARGET_DEFAULT_BRANCH: 'main',
  },
});
