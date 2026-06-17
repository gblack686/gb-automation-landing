import { Link } from 'react-router-dom';
import { getPortalRouteContent } from '../content/clientWelcomeContent';
import { ContentCard, RouteShell } from '../clients/shared/PortalContentBlocks';

export default function SalesHowItWorks() {
  const content = getPortalRouteContent('/sales/how-it-works');
  const pillars = content?.pillars || [];
  const buildFlowSteps = content?.build_flow_steps || [];
  const trustClaims = content?.trust_claims || [];

  return (
    <RouteShell
      eyebrow="How GBAutomation builds"
      title="Production-ready by design, not by accident."
      description="This route renders the source-cited sales process artifact instead of copying claims into the app by hand. Client-specific proof remains hidden until a proof source exists."
    >
      <section className="grid gap-5 md:grid-cols-2">
        {pillars.map((pillar) => (
          <ContentCard
            key={pillar.id}
            eyebrow={`Pillar ${String(pillar.order).padStart(2, '0')}`}
            title={pillar.title}
            body={pillar.body_markdown}
            proof={pillar.proof}
            sourceRefs={pillar.source_refs}
          />
        ))}
      </section>

      <section>
        <h2 className="font-serif text-3xl text-[#191919]">Build flow</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {buildFlowSteps.map((step) => (
            <ContentCard
              key={step.id}
              eyebrow={`Step ${step.order}`}
              title={step.title}
              body={step.body_markdown}
              proof={step.proof}
              sourceRefs={step.source_refs}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-serif text-3xl text-[#191919]">Trust claims</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {trustClaims.map((claim) => (
            <ContentCard
              key={claim.id}
              eyebrow={claim.claim}
              title={claim.display_copy}
              proof={claim.proof}
              sourceRefs={claim.source_refs}
            />
          ))}
        </div>
      </section>

      <Link className="inline-flex rounded-full bg-[#191919] px-5 py-3 text-sm font-bold text-white" to="/welcome">
        Start with the welcome flow
      </Link>
    </RouteShell>
  );
}
