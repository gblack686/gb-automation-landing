import { Link } from 'react-router-dom';
import { getPortalRouteContent, portalContent } from '../content/clientWelcomeContent';
import { ChecklistGrid, ContentCard, MarkdownBlock, RouteShell } from '../clients/shared/PortalContentBlocks';

export default function Welcome() {
  const content = getPortalRouteContent('/welcome');
  const templates = content?.welcome_templates || [];
  const checklist = content?.before_call_checklist || [];

  return (
    <RouteShell
      eyebrow="Client welcome"
      title={content?.hero?.title || 'Welcome'}
      description={content?.hero?.body_markdown || 'Generated welcome content is unavailable.'}
    >
      <div className="flex flex-wrap gap-3">
        <Link className="rounded-full bg-[#191919] px-5 py-3 text-sm font-bold text-white" to="/sales/how-it-works">See how the build works</Link>
        <Link className="rounded-full border border-[#D6D4C8] px-5 py-3 text-sm font-bold text-[#191919]" to="/clients/gbautomation/getting-started">Open client portal example</Link>
      </div>

      <section className="grid gap-5 lg:grid-cols-2">
        {templates.map((template) => (
          <ContentCard
            key={template.id}
            eyebrow={`${template.audience} / ${template.status}`}
            title={template.subject}
            proof={template.proof}
            sourceRefs={template.source_refs}
          >
            <MarkdownBlock>{template.body_markdown}</MarkdownBlock>
            {(template.variables || []).length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {(template.variables || []).map((variable) => (
                  <span key={variable.key} className="rounded-full border border-[#D6D4C8] px-3 py-1 text-xs text-[#191919]/60">
                    {variable.label}
                  </span>
                ))}
              </div>
            )}
          </ContentCard>
        ))}
      </section>

      <section>
        <h2 className="font-serif text-3xl text-[#191919]">Before the call</h2>
        <div className="mt-5">
          <ChecklistGrid items={checklist} />
        </div>
      </section>

      <ContentCard
        eyebrow="Validation"
        title="Generated from central sources"
        body={`Schema: ${portalContent.schema_version}\nRedaction scan: ${portalContent.validation.redaction_scan_status}\nHuman approval queue: ${portalContent.validation.human_approval_required.join('; ')}`}
      />
    </RouteShell>
  );
}
