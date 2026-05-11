export const portalData = {
  tenant: {
    slug: 'gbautomation',
    name: 'GBAutomation',
    tagline: 'Internal client portal validation',
    status: 'Validation tenant',
    repository: 'gbauto/gbautomation',
  },
  metrics: [
    { label: 'Active clients', value: '7', detail: 'Tracked in second-brain client profiles' },
    { label: 'TTFW milestones', value: '5', detail: 'Standard client onboarding journey' },
    { label: 'Sync target', value: '<5m', detail: 'Push to visible portal update' },
    { label: 'Validation', value: 'Pass', detail: 'TAC receipt written 2026-05-10' },
  ],
  activity: [
    {
      title: 'Client portal validation accepted',
      detail: 'TAC validation passed for the gbautomation tenant route and sync pattern.',
      timestamp: '2026-05-10',
    },
    {
      title: 'Website route scaffold ready',
      detail: 'The tenant route is mounted under /clients/gbautomation/* behind existing auth.',
      timestamp: 'Next',
    },
    {
      title: 'Repository sync pending',
      detail: 'Submodule and repository_dispatch wiring are staged as the reusable external-client path.',
      timestamp: 'Planned',
    },
  ],
  nextSteps: [
    'Promote this internal tenant to the reusable client portal template.',
    'Create the first external tenant source repo, starting with Jason when ready.',
    'Add a repository_dispatch smoke event after GitHub secrets are installed.',
  ],
};
