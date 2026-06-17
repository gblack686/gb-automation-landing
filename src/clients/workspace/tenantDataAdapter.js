import { useEffect, useMemo, useState } from 'react';
import { getTenantConfig } from '../shared/tenantConfig';

export function getClientWorkspaceAdapter(slug) {
  const tenant = getTenantConfig(slug);
  if (!tenant) return null;

  return {
    slug: tenant.slug,
    tenant,
    resourceUrl(resource) {
      const clean = String(resource || '').replace(/^\/+/, '');
      return `${tenant.dataPath}/${clean}`;
    },
  };
}

export function useClientWorkspaceAdapter(slug) {
  return useMemo(() => getClientWorkspaceAdapter(slug), [slug]);
}

export function useClientResource(slug, resource, options = {}) {
  const adapter = useClientWorkspaceAdapter(slug);
  const [data, setData] = useState(options.initialData ?? null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(adapter && resource));

  useEffect(() => {
    if (!adapter || !resource) {
      setData(options.initialData ?? null);
      setError(adapter ? null : `Unknown tenant: ${slug}`);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const url = adapter.resourceUrl(resource);
    setLoading(true);
    setError(null);

    fetch(url, { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) {
          if (options.optional && response.status === 404) return options.fallback ?? null;
          throw new Error(`${url} responded ${response.status}`);
        }
        return response.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || String(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [adapter, options.fallback, options.initialData, options.optional, resource, slug]);

  return { adapter, data, error, loading };
}

export function tenantWorkspacePath(slug, path = '') {
  const suffix = String(path || '').replace(/^\/+/, '');
  return suffix ? `/clients/${slug}/${suffix}` : `/clients/${slug}`;
}
