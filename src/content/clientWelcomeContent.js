import portalContent from './clientWelcomeContent.generated.json';

export { portalContent };

export function getPortalRouteContent(routeKey) {
  return portalContent.routes?.[routeKey] || null;
}

export function getSharedSourceRefs() {
  return portalContent.shared?.source_refs || [];
}

export function getSourceRef(id) {
  return getSharedSourceRefs().find((ref) => ref.id === id) || null;
}

export function getSourceLabels(sourceRefs = []) {
  return sourceRefs
    .map((id) => getSourceRef(id))
    .filter(Boolean)
    .map((ref) => `${ref.path}${ref.line_start ? `:${ref.line_start}-${ref.line_end || ref.line_start}` : ''}`);
}

export function getClientRouteContent(routeKey, slug) {
  const base = getPortalRouteContent(routeKey);
  const client = portalContent.clients?.[slug]?.routes?.[routeKey];
  return client || base || null;
}

export function proofLabel(proof) {
  const status = proof?.status || 'unknown';
  return status.replaceAll('_', ' ');
}
