import { defineFunction } from '@aws-amplify/backend';

export const forgeWorkshop = defineFunction({
  name: 'forge-workshop',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 20,
  environment: {
    SUPABASE_SECRET_ID: 'gbautomation/infrastructure/supabase/gbauto',
    // Activated after the production migration, exact owner binding, and Mini
    // worker installation were verified on 2026-10-03.
    FORGE_WORKSHOP_ENABLED: 'true',
  },
});
