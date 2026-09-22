import { defineFunction } from '@aws-amplify/backend';
export const forgeAtlas = defineFunction({
 name:'forge-atlas',entry:'./handler.ts',timeoutSeconds:30,resourceGroupName:'data',
 environment:{SUPABASE_SECRET_ID:'gbautomation/infrastructure/supabase/gbauto'},
});
