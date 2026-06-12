// Compatibility exports for the reusable client portal shell.
// The central tenant contract lives in src/clients/registry/tenantRegistry.js.

import {
  getTenantAuthPolicy,
  getTenantContract,
  getRouteAuthPolicy,
  listTenantContracts,
  tenantRegistry,
} from '../registry/tenantRegistry';

export const tenantConfigs = tenantRegistry;

export function getTenantConfig(slug) {
  return getTenantContract(slug);
}

export { getRouteAuthPolicy, getTenantAuthPolicy, getTenantContract, listTenantContracts };
