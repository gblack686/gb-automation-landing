import { defineFunction } from '@aws-amplify/backend';

export const forgeWorkshop = defineFunction({
  name: 'forge-workshop',
  entry: './handler.ts',
  resourceGroupName: 'data',
  timeoutSeconds: 20,
  environment: {
    SUPABASE_SECRET_ID: 'gbautomation/infrastructure/supabase/gbauto',
    // Explicit deployment gate. Enable only after migration, identity binding,
    // and the private worker have been installed and verified together.
    FORGE_WORKSHOP_ENABLED: 'false',
  },
});
