import { defineAuth } from '@aws-amplify/backend';

/**
 * Cognito user pool — gates /plan, /apps, /artifacts behind sign-in.
 *
 * PHASE 1 (NOW): email + password only.
 *   This deploys clean and gives us the User Pool + Hosted UI domain.
 *
 * PHASE 2 (LATER): re-enable Google federation.
 *   Once the deploy is up, the Hosted UI domain looks like:
 *     <id>.auth.us-east-1.amazoncognito.com
 *   Use that domain to create a Google OAuth client at
 *     https://console.cloud.google.com/apis/credentials
 *   Set redirect URI to:
 *     https://<id>.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
 *   Then update the secrets:
 *     npx ampx sandbox secret set GOOGLE_CLIENT_ID
 *     npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
 *   And restore the externalProviders block below (commented out for now).
 *
 * GitHub: not a built-in Cognito provider — needs custom OIDC proxy. Phase 6+.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    // PHASE 2 — uncomment when real Google OAuth credentials are in SSM:
    //
    // externalProviders: {
    //   google: {
    //     clientId: secret('GOOGLE_CLIENT_ID'),
    //     clientSecret: secret('GOOGLE_CLIENT_SECRET'),
    //     scopes: ['email', 'profile', 'openid'],
    //     attributeMapping: {
    //       email: 'email',
    //       fullname: 'name',
    //     },
    //   },
    //   callbackUrls: [
    //     'http://localhost:5173/',
    //     'http://localhost:5173/login',
    //     'https://gbautomation.xyz/',
    //     'https://gbautomation.xyz/login',
    //   ],
    //   logoutUrls: [
    //     'http://localhost:5173/',
    //     'https://gbautomation.xyz/',
    //   ],
    // },
  },
});
