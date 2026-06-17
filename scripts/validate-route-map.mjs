import {
  accessMatrix,
  getRoutesByGroup,
  getRoutesByPriority,
  navigationModel,
  portalRoutes,
  roleIds,
  routeGroups,
  sprintDayRoutePlan,
} from '../src/portal/portalRouteMap.js';

const REQUIRED_GROUPS = ['public', 'client', 'teammate', 'ops'];
const REQUIRED_PRIORITIES = ['P0', 'P1', 'P2'];
const REQUIRED_P0_PATHS = [
  '/',
  '/login',
  '/apps',
  '/artifacts',
  '/artifacts/:client/:artifactId',
  '/prds',
  '/prds/:slug',
  '/clients/:tenant',
  '/clients/:tenant/dashboard',
  '/clients/:tenant/apps',
  '/clients/:tenant/artifacts',
  '/clients/:tenant/artifacts/:artifactId',
  '/clients/:tenant/reports',
  '/team/builds',
  '/team/builds/:taskId',
  '/ops',
  '/ops/runs',
  '/ops/kanban',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function unique(values) {
  return Array.from(new Set(values));
}

const groupIds = routeGroups.map((group) => group.id);
const routeGroupIds = unique(portalRoutes.map((route) => route.group));
const routePriorities = unique(portalRoutes.map((route) => route.priority));
const routePaths = portalRoutes.map((route) => route.path);

for (const group of REQUIRED_GROUPS) {
  assert(groupIds.includes(group), `missing route group: ${group}`);
  assert(routeGroupIds.includes(group), `missing routes for group: ${group}`);
  assert(getRoutesByGroup(group).length > 0, `getRoutesByGroup returned empty for ${group}`);
}

for (const priority of REQUIRED_PRIORITIES) {
  assert(routePriorities.includes(priority), `missing priority: ${priority}`);
  assert(getRoutesByPriority(priority).length > 0, `getRoutesByPriority returned empty for ${priority}`);
}

for (const route of portalRoutes) {
  assert(REQUIRED_GROUPS.includes(route.group), `unsupported group on ${route.path}: ${route.group}`);
  assert(REQUIRED_PRIORITIES.includes(route.priority), `unsupported priority on ${route.path}: ${route.priority}`);
  assert(Array.isArray(route.access) && route.access.length > 0, `missing access list on ${route.path}`);
  assert(Array.isArray(route.data), `missing data list on ${route.path}`);
  for (const role of route.access) {
    assert(roleIds.includes(role), `unsupported role on ${route.path}: ${role}`);
  }
}

for (const path of REQUIRED_P0_PATHS) {
  const route = portalRoutes.find((item) => item.path === path);
  assert(route, `missing required P0 route: ${path}`);
  assert(route.priority === 'P0', `required P0 route is not P0: ${path}`);
}

for (const role of roleIds) {
  assert(Array.isArray(accessMatrix[role]), `missing access matrix for role: ${role}`);
}

assert(accessMatrix.anonymous.includes('/'), 'anonymous cannot access home');
assert(!accessMatrix.anonymous.includes('/ops'), 'anonymous can access ops');
assert(accessMatrix.admin.includes('/ops'), 'admin cannot access ops');
assert(accessMatrix.teammate.includes('/team/builds'), 'teammate cannot access build queue');
assert(!accessMatrix.client.includes('/team/builds'), 'client can access team build queue');

assert(sprintDayRoutePlan.length === 5, 'sprint day plan must cover five days');
for (const day of [1, 2, 3, 4, 5]) {
  assert(sprintDayRoutePlan.some((item) => item.day === day), `missing day ${day} plan`);
}

assert(navigationModel.global.some((item) => item.to === '/clients/gbautomation'), 'global nav missing portal link');
assert(navigationModel.opsTabs.includes('Kanban'), 'ops nav missing Kanban tab');
assert(navigationModel.clientTabs.includes('Validation'), 'client nav missing Validation tab');

console.log(`validated ${portalRoutes.length} routes across ${routeGroups.length} groups`);
console.log(`P0 routes: ${getRoutesByPriority('P0').length}`);
console.log(`roles: ${roleIds.join(', ')}`);
