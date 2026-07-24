import { adminChecklistGroups, sourceReferences } from '../data/contentSystem';
import { ChecklistTable, ContentHero, SafetyNote, SourceReferences } from './ContentSystemComponents';

const columns = [
  { key: 'task', label: 'Task' },
  { key: 'owner', label: 'Owner' },
  { key: 'dueTrigger', label: 'Due trigger' },
  { key: 'proofField', label: 'Proof field' },
  { key: 'source', label: 'Source' },
];

export default function AdminChecklistsPage() {
  return (
    <div className="space-y-10">
      <ContentHero
        eyebrow="Admin workflow"
        title="Admin checklist"
        intro="This page tracks the operational work required to move a client from welcome packet to deployed agent. Each row has an owner, due trigger, and proof field."
      />

      <SafetyNote>
        Record redacted proof only. Do not render secret values, account IDs, hostnames, or internal token inventories on client-facing surfaces.
      </SafetyNote>

      <div className="space-y-8">
        {adminChecklistGroups.map((group) => (
          <section key={group.title} className="space-y-4">
            <h2 className="font-serif text-2xl text-[#191919]">{group.title}</h2>
            <ChecklistTable rows={group.items} columns={columns} />
          </section>
        ))}
      </div>

      <SourceReferences references={sourceReferences.filter((ref) => ['Client onboarding workflow', 'Requirements source', 'Content draft package'].includes(ref.label))} />
    </div>
  );
}
