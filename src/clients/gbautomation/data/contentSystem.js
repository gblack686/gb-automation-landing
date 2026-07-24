export const sourceReferences = [
  {
    label: 'Recovered PRD',
    path: 'git:d568fe56c229dade7a46a6b96f57f028538fbd42:second-brain/inbox/plans/2026-06-11-client-welcome-admin-content-system.md',
    note: 'Requested PRD path is absent in the current gbautomation worktree, so the source was recovered from git history.',
  },
  {
    label: 'Content draft package',
    path: '/Users/greg/repos/gbautomation/second-brain/intelligence/integration-experts/t_c1e90cba-welcome-admin-content-drafts.md',
    note: 'Parent Kanban handoff with source-backed welcome, requirements, admin, and how-to copy.',
  },
  {
    label: 'Welcome email template',
    path: '/Users/greg/repos/gbautomation/resources/skills/consulting-intake/client-facing/welcome-email.md',
    note: 'Canonical structure for client setup welcome email copy.',
  },
  {
    label: 'Client onboarding workflow',
    path: '/Users/greg/repos/gbautomation/second-brain/workflows/client-onboarding.md',
    note: 'Canonical onboarding sequence and Hermes deployment language.',
  },
  {
    label: 'Requirements source',
    path: '/Users/greg/repos/gbautomation/resources/requirements.yaml',
    note: 'Internal requirements source. Client pages must render only redacted, client-safe rows.',
  },
  {
    label: 'Sales material source',
    path: '/Users/greg/repos/gbautomation/second-brain/systems/sales-materials/tac-pipeline-production-readiness.html',
    note: 'Sales claims source, with stale Linear wording replaced by Hermes Kanban where current docs supersede it.',
  },
];

export const welcomePage = {
  eyebrow: 'Client onboarding',
  title: 'Welcome to GBAutomation',
  intro:
    'This is the path from first conversation to a working AI agent system: prep, discovery, requirements, build, verification, deployment, and ongoing monitoring.',
  steps: [
    'Complete the prep guide.',
    'Join the discovery and intake session.',
    'Confirm tools, workflows, and safety boundaries.',
    'Review the build plan and required access.',
    'Approve deployment and complete the walkthrough.',
  ],
  primaryCta: { label: 'Start the prep guide', to: '/clients/gbautomation/getting-started' },
  secondaryCta: { label: 'Review key terms', to: '/clients/gbautomation/requirements' },
  safetyNote:
    'Credentials are handled through approved secure paths. Do not paste API keys or passwords into the portal unless the portal explicitly provides a secure credential flow.',
};

export const gettingStartedGuide = {
  eyebrow: 'Prep guide',
  title: 'Getting started with your GBAutomation agent',
  intro:
    'This guide collects the information needed to design your agent around your actual work. Rough answers are fine. The session will refine them.',
  sections: [
    {
      title: 'Your tools',
      items: [
        'List the apps you use weekly and what each one is for.',
        'If you know whether a tool has an API, include that too.',
      ],
    },
    {
      title: 'Your departments',
      items: [
        'Name 3 to 5 areas of responsibility in your work.',
        'Think of them as roles you would hire for: Client Ops, Content, Finance, Sales, Personal Admin.',
      ],
    },
    {
      title: 'Your recurring workflows',
      items: [
        'Pick one task you do often that takes 30+ minutes and follows a pattern.',
        'Write rough steps as if training a new hire.',
      ],
    },
    {
      title: 'Your briefing',
      items: [
        'Choose what your morning briefing should include: calendar, email, tasks, project status, financials, content performance, or industry news.',
      ],
    },
    {
      title: 'Your agent style',
      items: [
        'Tell us what the agent should call you, how it should sound, and whether you already have a name in mind.',
      ],
    },
  ],
};

export const requirementTasks = [
  {
    section: 'Identity',
    requirement: 'Confirm legal or business name, preferred name, email, timezone, and working hours.',
    owner: 'Client',
    dueTrigger: 'Before discovery or intake',
    proofField: 'Submitted profile form or session transcript note',
    source: 'session-agenda.md Phase 1',
  },
  {
    section: 'Communication',
    requirement: 'Choose preferred support or agent channel and provide approved phone or chat accounts.',
    owner: 'Client + admin',
    dueTrigger: 'Before deployment',
    proofField: 'Channel setup receipt or allowlist confirmation',
    source: 'welcome-email.md, session-agenda.md, key-terms.md',
  },
  {
    section: 'Tools',
    requirement: 'List weekly apps and tools and what each is used for.',
    owner: 'Client',
    dueTrigger: 'Before discovery or intake',
    proofField: 'Completed prep guide or transcript',
    source: 'pre-session-prep.md Exercise 1',
  },
  {
    section: 'API or admin access',
    requirement: 'Identify which tools have APIs, existing keys, admin users, or OAuth access.',
    owner: 'Client + admin',
    dueTrigger: 'Before build starts',
    proofField: 'Access checklist with redacted status only',
    source: 'pre-session-prep.md, requirements.yaml auth and secrets sections',
  },
  {
    section: 'Departments',
    requirement: 'Name 3 to 5 departments or domains of the client work.',
    owner: 'Client',
    dueTrigger: 'During prep or session',
    proofField: 'Completed prep guide or transcript',
    source: 'pre-session-prep.md Exercise 2',
  },
  {
    section: 'Workflows',
    requirement: 'Describe one high-value recurring task with rough steps, frequency, trigger, and output.',
    owner: 'Client',
    dueTrigger: 'During prep or session',
    proofField: 'Workflow notes in transcript',
    source: 'pre-session-prep.md Exercise 3; session-agenda.md Phase 3',
  },
  {
    section: 'Morning briefing',
    requirement: 'Select briefing contents, format, and tone.',
    owner: 'Client',
    dueTrigger: 'During prep or session',
    proofField: 'Morning briefing answers',
    source: 'pre-session-prep.md Exercise 4',
  },
  {
    section: 'Agent personality',
    requirement: 'Confirm what the agent should call the client, communication style, and optional name.',
    owner: 'Client',
    dueTrigger: 'During prep or session',
    proofField: 'Agent style notes',
    source: 'pre-session-prep.md Bonus; session-agenda.md Phase 1',
  },
  {
    section: 'Autonomy',
    requirement: 'Decide what the agent can do alone and what requires approval.',
    owner: 'Client + consultant',
    dueTrigger: 'During session',
    proofField: 'Autonomy and safety notes',
    source: 'session-agenda.md Phase 4; key-terms.md approval gate and blast radius',
  },
  {
    section: 'Billing and admin',
    requirement: 'Complete service agreement and payment link steps where applicable.',
    owner: 'Client + admin',
    dueTrigger: 'Before build or deployment',
    proofField: 'Signed agreement and payment receipt status',
    source: 'service-agreement.md',
  },
  {
    section: 'Infrastructure target',
    requirement: 'Confirm whether deployment target is Mac Mini, VPS, or another approved environment.',
    owner: 'Client + admin',
    dueTrigger: 'Before deployment',
    proofField: 'Deployment target note with no secrets exposed',
    source: 'welcome-email.md, requirements.yaml infrastructure',
  },
  {
    section: 'Walkthrough',
    requirement: 'Schedule walkthrough within delivery window.',
    owner: 'Admin + client',
    dueTrigger: 'After deployment verification',
    proofField: 'Calendar invite or confirmed date',
    source: 'session-agenda.md, service-agreement.md',
  },
];

export const adminChecklistGroups = [
  {
    title: 'Welcome packet',
    items: [
      {
        task: 'Create Drive folder.',
        owner: 'Admin',
        dueTrigger: 'After prospect qualifies or before session',
        proofField: 'Drive folder URL',
        source: 'client-onboarding.md step 2',
      },
      {
        task: 'Draft and approve welcome email.',
        owner: 'Admin',
        dueTrigger: 'Before session',
        proofField: 'Draft path or approval note',
        source: 'requirements.yaml draft-first convention',
      },
      {
        task: 'Attach prep guide, agenda, key terms, and service agreement if applicable.',
        owner: 'Admin',
        dueTrigger: 'Before session',
        proofField: 'Welcome packet receipt',
        source: 'welcome-email.md and client-facing intake files',
      },
    ],
  },
  {
    title: 'Session operations',
    items: [
      {
        task: 'Confirm call link and recording consent.',
        owner: 'Consultant',
        dueTrigger: 'Scheduled session time',
        proofField: 'Calendar event and consent notation',
        source: 'welcome-email.md and service-agreement.md',
      },
      {
        task: 'Capture transcript and store source artifacts in the right client folder.',
        owner: 'Consultant',
        dueTrigger: 'After session ends',
        proofField: 'Transcript path or meeting receipt',
        source: 'client-onboarding.md steps 3 to 5',
      },
    ],
  },
  {
    title: 'Build prep',
    items: [
      {
        task: 'Process transcript into workspace files, domain experts, and requirements.',
        owner: 'Builder',
        dueTrigger: 'After transcript lands',
        proofField: 'Processing receipt or path',
        source: 'client-onboarding.md step 5',
      },
      {
        task: 'Open or update Hermes Kanban cards.',
        owner: 'Builder',
        dueTrigger: 'Before implementation starts',
        proofField: 'Kanban card or receipt',
        source: 'Current PRD and CLAUDE.md Kanban guidance',
      },
    ],
  },
  {
    title: 'Secure configuration',
    items: [
      {
        task: 'Provision required secrets through the internal secret manager.',
        owner: 'Ops',
        dueTrigger: 'Before deployment',
        proofField: 'Redacted secret creation receipt',
        source: 'client-onboarding.md step 6; requirements.yaml secrets',
      },
      {
        task: 'Provision non-secret config through the internal config path.',
        owner: 'Ops',
        dueTrigger: 'Before deployment',
        proofField: 'Parameter or config receipt',
        source: 'client-onboarding.md step 6',
      },
    ],
  },
  {
    title: 'Deployment and monitoring',
    items: [
      {
        task: 'Render and bootstrap the Hermes profile.',
        owner: 'Builder/Ops',
        dueTrigger: 'After config exists',
        proofField: 'Deploy receipt or smoke result',
        source: 'client-onboarding.md step 7',
      },
      {
        task: 'Register in systems, start monitoring, and schedule walkthrough.',
        owner: 'Ops/Admin',
        dueTrigger: 'After deployment smoke',
        proofField: 'Registry diff, status output, calendar event',
        source: 'client-onboarding.md steps 8 to 10',
      },
    ],
  },
];

export const salesHowItWorks = {
  eyebrow: 'How it works',
  title: 'How GBAutomation builds production-ready agent systems',
  intro:
    'GBAutomation delivery is built around engineering discipline: source-backed plans, isolated implementation, auditable traces, human review, and verification before handoff.',
  claims: [
    'Every build starts from a written plan and source audit.',
    'Work is routed through Hermes Kanban and isolated worktrees.',
    'Agent work is designed for traceability: logs, receipts, and replayable decisions.',
    'High-impact steps go through human approval gates.',
    'Outputs are checked for silent failures, not just clean exit codes.',
    'Secrets and OAuth credentials are handled through secure internal paths.',
    'Visual and client-facing artifacts should pass brand and quality gates.',
  ],
  excludedClaims: [
    'Linear issue, Linear-driven dispatch, or Linear to done as current execution truth.',
    'Named client proof, success metrics, or testimonials without a vetted source.',
  ],
};

export const welcomeEmailVariants = [
  {
    title: 'Prospect discovery invitation',
    subjects: [
      'Your GBAutomation discovery call: what to expect',
      'Before we build your agent: quick prep and next steps',
      'Getting ready for your AI agent discovery session',
    ],
    sourceBasis: 'welcome-email.md, pre-session-prep.md, client-onboarding.md',
  },
  {
    title: 'Confirmed client setup welcome',
    subjects: [
      'Your GBAutomation agent setup session: what to expect',
      'Confirmed: your agent setup session on {session_date}',
      'Welcome to GBAutomation: setup session details',
    ],
    sourceBasis: 'welcome-email.md, session-agenda.md, service-agreement.md, client-onboarding.md',
  },
  {
    title: 'Internal teammate/admin handoff',
    subjects: [
      'New client onboarding handoff: {client_name}',
      'Admin checklist for {client_name} setup',
      'GBAutomation onboarding packet ready: {client_name}',
    ],
    sourceBasis: 'client-onboarding.md, requirements.yaml, service-agreement.md',
  },
];
