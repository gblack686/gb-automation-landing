import { getClientRouteContent } from '../../content/clientWelcomeContent';
import { ChecklistGrid, ContentCard } from '../shared/PortalContentBlocks';

export default function ClientRequirementsPage({ slug }) {
  const content = getClientRouteContent('/clients/:slug/requirements', slug);
  const requirementsChecklists = content?.requirements_checklists || [];
  const integrationRequirements = content?.integration_requirements || [];
  const missingInputs = content?.missing_inputs || [];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D97757]">Requirements</p>
        <h1 className="mt-2 font-serif text-4xl text-[#191919]">Source-backed requirements</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#191919]/65">
          This route renders only allowlisted requirements. Secret names, account identifiers, host addresses, and personal contact mappings are intentionally excluded.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-serif text-3xl text-[#191919]">Engagement baseline</h2>
        <ChecklistGrid items={requirementsChecklists} />
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-3xl text-[#191919]">Integration baseline</h2>
        <ChecklistGrid items={integrationRequirements} />
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-3xl text-[#191919]">Known gaps</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {missingInputs.map((item) => (
            <ContentCard key={item.id} title={item.label} body={item.description} proof={item.proof} sourceRefs={item.source_refs} />
          ))}
        </div>
      </section>
    </div>
  );
}
