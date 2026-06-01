import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import ClientSection from '../../shared/ClientSection';
import { useTenantData } from '../../shared/useTenantData';
import { getTenantConfig } from '../../shared/tenantConfig';

export default function ArtifactDetailPage({ slug = 'gbautomation' }) {
  const tenant = getTenantConfig(slug);
  const { artifactId } = useParams();
  const { data, error, loading } = useTenantData(`${tenant.dataPath}/artifacts.json`);

  if (loading) {
    return <p className="text-sm text-[#191919]/60">Loading artifact…</p>;
  }
  if (error) {
    return (
      <p className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        Failed to load artifacts: <code className="font-mono">{error}</code>
      </p>
    );
  }

  const artifact = (data.artifacts || []).find((a) => a.id === artifactId);
  if (!artifact) {
    return (
      <div className="space-y-4">
        <Link
          to={`/clients/${tenant.slug}/artifacts`}
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#191919]/60 hover:text-[#D97757]"
        >
          <ArrowLeft className="h-3 w-3" />
          Artifacts
        </Link>
        <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          No artifact with id <code className="font-mono">{artifactId}</code> in {tenant.name}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <Link
        to={`/clients/${tenant.slug}/artifacts`}
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#191919]/60 hover:text-[#D97757]"
      >
        <ArrowLeft className="h-3 w-3" />
        All artifacts
      </Link>

      <ClientSection
        eyebrow={artifact.kind}
        title={artifact.title}
        description={artifact.summary}
        action={
          artifact.asset_url && (
            <a
              href={artifact.asset_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-[#D6D4C8] bg-white/55 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#191919]/70 hover:border-[#D97757] hover:text-[#D97757]"
            >
              Open asset
              <ExternalLink className="h-3 w-3" />
            </a>
          )
        }
      >
        <dl className="grid gap-4 rounded-md border border-[#D6D4C8] bg-white/55 p-5 md:grid-cols-4">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-[#191919]/45">
              Status
            </dt>
            <dd className="mt-1 text-sm text-[#191919]">{artifact.status}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-[#191919]/45">
              Owner
            </dt>
            <dd className="mt-1 text-sm text-[#191919]">{artifact.owner || '—'}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-[#191919]/45">
              Updated
            </dt>
            <dd className="mt-1 font-mono text-sm text-[#191919]">
              {artifact.updated_at?.slice(0, 10) || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-[#191919]/45">
              Asset
            </dt>
            <dd className="mt-1 font-mono text-xs text-[#191919]/60 break-all">
              {artifact.asset_url || '—'}
            </dd>
          </div>
        </dl>
      </ClientSection>
    </div>
  );
}
