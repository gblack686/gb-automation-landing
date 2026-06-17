import { getClientRouteContent } from '../../content/clientWelcomeContent';
import { ChecklistGrid, ContentCard } from '../shared/PortalContentBlocks';

export default function ClientAdminChecklistsPage({ slug }) {
  const content = getClientRouteContent('/clients/:slug/admin-checklists', slug);
  const adminChecklists = content?.admin_checklists || [];
  const gbautomationOwnedTasks = content?.gbautomation_owned_tasks || [];
  const clientOwnedTasks = content?.client_owned_tasks || [];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D97757]">Admin checklists</p>
        <h1 className="mt-2 font-serif text-4xl text-[#191919]">Setup, deployment, and monitoring tasks</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#191919]/65">
          Admin content is derived from the onboarding workflow and requirements baseline. Ownership and due triggers are generated as portal fields because raw sources do not yet provide a dedicated admin checklist schema.
        </p>
      </header>

      <ChecklistGrid items={adminChecklists} />

      <div className="grid gap-5 md:grid-cols-2">
        <ContentCard
          eyebrow="GBAutomation owned"
          title="Internal tasks"
          body={gbautomationOwnedTasks.join('\n')}
          proof={content?.proof}
        />
        <ContentCard
          eyebrow="Client owned"
          title="Client inputs"
          body={clientOwnedTasks.join('\n')}
          proof={content?.proof}
        />
      </div>
    </div>
  );
}
