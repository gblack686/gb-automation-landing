import { Link } from 'react-router-dom';
import { getClientRouteContent } from '../../content/clientWelcomeContent';
import { ContentCard } from '../shared/PortalContentBlocks';
import { tenantWorkspacePath } from './tenantDataAdapter';

export default function ClientGettingStartedPage({ slug }) {
  const content = getClientRouteContent('/clients/:slug/getting-started', slug);
  const steps = content?.steps || [];
  const keyLinks = content?.key_links || [];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D97757]">Getting started</p>
        <h1 className="mt-2 font-serif text-4xl text-[#191919]">Your engagement path</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#191919]/65">
          Source-backed journey copy from first context through deployment and monitoring. Internal command names stay out of the client view.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {steps.map((step) => (
          <ContentCard
            key={step.id}
            eyebrow={`Step ${step.order} / ${step.audience}`}
            title={step.title}
            body={step.body_markdown}
            proof={step.proof}
            sourceRefs={step.source_refs}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {keyLinks.map((link) => (
          <Link key={link.id} className="rounded-full border border-[#D6D4C8] px-5 py-3 text-sm font-bold text-[#191919]" to={tenantWorkspacePath(slug, link.href)}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
