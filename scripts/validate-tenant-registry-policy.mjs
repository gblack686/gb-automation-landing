import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const appSource = readFileSync(resolve(root, 'src/App.jsx'), 'utf8');
const registry = await import(`file://${resolve(root, 'src/clients/registry/tenantRegistry.js')}`);

const gbautomation = registry.getTenantContract('gbautomation');
assert.equal(gbautomation.slug, 'gbautomation');
assert.equal(gbautomation.repository, 'gbauto/gbautomation');
assert.equal(gbautomation.dataPath, '/clients/gbautomation');
assert.deepEqual(registry.getTenantAuthPolicy('gbautomation'), {
  allowedGroups: ['tenant-gbautomation'],
  allowedEmails: ['gblack686@gmail.com'],
});
assert.ok(registry.getEnabledTenantRouteModules('gbautomation').includes('portal-workspace'));

const jid5274 = registry.getTenantContract('jid5274');
assert.equal(jid5274.slug, 'jid5274');
assert.equal(jid5274.repository, 'gbauto/jid5274');
assert.equal(jid5274.dataPath, '/clients/jid5274');
assert.deepEqual(registry.getTenantAuthPolicy('jid5274'), {
  allowedGroups: ['tenant-jid5274'],
  allowedEmails: ['jid5274@gmail.com'],
});
assert.deepEqual(registry.getEnabledTenantRouteModules('jid5274'), ['archon-static']);

assert.equal(registry.getTenantContract('missing-client'), null);
assert.ok(registry.listTenantContracts().map((tenant) => tenant.slug).includes('gbautomation'));
assert.ok(registry.listTenantContracts().map((tenant) => tenant.slug).includes('jid5274'));

assert.deepEqual(registry.getRouteAuthPolicy('ops'), {
  allowedGroups: ['tenant-gbautomation'],
  allowedEmails: ['gblack686@gmail.com', 'greg@gbautomation.xyz'],
});
assert.deepEqual(registry.getRouteAuthPolicy('team'), {
  allowedGroups: ['teammate', 'admin'],
  allowedEmails: ['gblack686@gmail.com', 'greg@gbautomation.xyz'],
});
assert.equal(registry.getRouteAuthPolicy('missing-route'), null);

assert.ok(appSource.includes('ClientPortalBoundary'), 'App.jsx should render client traffic through ClientPortalBoundary');
assert.ok(appSource.includes('/clients/:clientSlug/*'), 'App.jsx should expose the generic client route boundary');
assert.ok(!appSource.includes('GbautomationPortal'), 'App.jsx should not import the gbautomation portal directly');
assert.ok(!appSource.includes('Jid5274Portal'), 'App.jsx should not import the jid5274 portal directly');
assert.ok(!appSource.includes('/clients/gbautomation/*'), 'App.jsx should not hard-code the gbautomation client mount');
assert.ok(!appSource.includes('/clients/jid5274/*'), 'App.jsx should not hard-code the jid5274 client mount');
assert.ok(!appSource.includes("tenant-jid5274"), 'App.jsx should not inline jid5274 tenant group policy');
assert.ok(!appSource.includes("jid5274@gmail.com"), 'App.jsx should not inline jid5274 tenant email policy');
assert.ok(!appSource.includes("tenant-gbautomation"), 'App.jsx should not inline gbautomation tenant group policy');
assert.ok(!appSource.includes("greg@gbautomation.xyz"), 'App.jsx should not inline route email policy');
assert.ok(!appSource.includes("allowedGroups={["), 'App.jsx should pass route policies instead of inline group arrays');
assert.ok(!appSource.includes("allowedEmails={["), 'App.jsx should pass route policies instead of inline email arrays');

console.log('Tenant registry policy validation passed.');
