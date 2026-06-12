export const fallbackTeamCockpit = {
  schemaVersion: 1,
  generatedAt: null,
  source: {
    mode: 'static-fallback',
    description: 'Bundled read-only teammate cockpit fallback data.',
    paths: ['public/team/cockpit.json'],
  },
  approvedPrds: [
    {
      id: 'prd-placeholder-approved-queue',
      title: 'Approved PRD queue placeholder',
      status: 'approved',
      priority: 'medium',
      owner: 'TAC PRD queue',
      url: '/prds',
      receipt: 'Fallback until public/team/cockpit.json loads',
    },
  ],
  buildStatus: {
    queueLabel: 'Hermes Kanban mirror',
    summary: 'Static fallback. Browser clients cannot mutate Kanban from this cockpit.',
    activeTasks: [
      {
        id: 't_preview',
        title: 'Build status placeholder',
        status: 'planned',
        assignee: 'tac-builder',
        priority: 0,
        receipt: 'Fallback task projection',
      },
    ],
  },
  artifactReceipts: [
    {
      id: 'artifact-placeholder',
      title: 'Artifact receipt placeholder',
      status: 'planned',
      kind: 'receipt',
      url: '/artifacts',
      receipt: 'Fallback artifact projection',
    },
  ],
  runReceipts: [
    {
      id: 'run-placeholder',
      title: 'Run receipt placeholder',
      status: 'planned',
      actor: 'Hermes exporter',
      receipt: 'Fallback run projection until generated receipts are mirrored',
      evidence: ['public/team/cockpit.json'],
    },
  ],
  releaseReceipts: [
    {
      id: 'release-placeholder',
      title: 'Release receipt placeholder',
      status: 'planned',
      version: 'v0',
      date: 'TBD',
      evidence: ['Static read model pending generated receipts'],
    },
  ],
};
