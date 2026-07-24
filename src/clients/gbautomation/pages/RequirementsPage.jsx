import { requirementTasks, sourceReferences } from '../data/contentSystem';
import { ChecklistTable, ContentHero, SafetyNote, SourceReferences } from './ContentSystemComponents';

const columns = [
  { key: 'section', label: 'Section' },
  { key: 'requirement', label: 'Requirement' },
  { key: 'owner', label: 'Owner' },
  { key: 'dueTrigger', label: 'Due trigger' },
  { key: 'proofField', label: 'Proof field' },
  { key: 'source', label: 'Source' },
];

export default function RequirementsPage() {
  return (
    <div className="space-y-10">
      <ContentHero
        eyebrow="Requirements intake"
        title="Requirements and access checklist"
        intro="This checklist separates what we need from you from what GBAutomation handles internally. You will see client-safe tasks here. Internal configuration, secrets, and deployment receipts are handled in the admin workflow."
      />

      <SafetyNote>
        Internal secret IDs, account IDs, host addresses, token names, and deployment receipts are intentionally excluded from this client-facing page.
      </SafetyNote>

      <ChecklistTable rows={requirementTasks} columns={columns} />

      <SourceReferences references={sourceReferences.filter((ref) => ['Requirements source', 'Content draft package', 'Recovered PRD'].includes(ref.label))} />
    </div>
  );
}
