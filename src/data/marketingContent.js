export const discoveryUrl = 'https://calendar.app.google/X4SN26PYLgvVYPRp8';

// Curated public evidence only. Source and claim ledger: docs/website-redesign.md.
export const selectedWork = [
  {
    id: 'session-summary',
    number: '01',
    title: 'A session ends. The knowledge stays.',
    category: 'Knowledge systems',
    kind: 'Internal system · public build report',
    description: 'Useful context gets lost when a work session closes. A session-summary system captures the work, decisions, and references in a searchable knowledge base.',
    image: '/marketing/session-report.webp',
    alt: 'Public build report documenting the GBauto session-summary system',
    href: '/prds/pr-500-session-exit-summary.html',
    action: 'Read the build report',
  },
  {
    id: 'design-library',
    number: '02',
    title: 'One language. Every interface.',
    category: 'Internal tools',
    kind: 'Design system · public library',
    description: 'Scattered interface patterns become a shared library of reports, workspaces, and reusable components, all speaking the same visual language.',
    image: '/marketing/design-library.webp',
    alt: 'GBauto public design library with report, marketing, and workspace examples',
    href: '/theme/',
    action: 'Explore the library',
  },
  {
    id: 'logo-motion',
    number: '03',
    title: 'From brand asset to moving image.',
    category: 'Creative automation',
    kind: 'Experiment · generated motion sample',
    description: 'A repeatable creative pipeline turns a brand asset into generated keyframes and a finished motion clip. An experiment in keeping automation on brand.',
    image: '/marketing/logo-motion.webp',
    alt: 'Generated GB Automation logo with a terracotta halo, from the logo-motion experiment',
    href: '/portfolio/samples/logo-motion/clip.mp4',
    action: 'Watch the motion sample',
  },
];

export const approach = [
  ['Understand the work.', 'We start with the actual workflow: the people, the tools, the friction, and what a useful result looks like.'],
  ['Build something useful.', 'Start with a focused system you can see and use. Connect it to the tools and context your work depends on.'],
  ['Validate together.', 'Review real outputs, test the edge cases, and make the human review points clear before expanding the scope.'],
  ['Keep improving.', 'Use what we learn to refine the system. Document the decisions so the next improvement has a solid starting point.'],
];

export const faqs = [
  ['What kind of work is a good fit?', 'Repeatable research, scattered business knowledge, manual reporting, and work that moves between several tools. We start with a concrete workflow and decide together where automation would be useful.'],
  ['Can you work with the tools we already use?', 'That is the starting point. We review your existing tools, available integrations, and access requirements before choosing an approach.'],
  ['Will the system make decisions on its own?', 'The level of autonomy is a design decision. We agree on what the system can do, what needs your review, and how exceptions should be handled.'],
  ['What happens to the system after the build?', 'We agree on documentation, access, ownership, and ongoing support as part of the project scope, so you know how the system will be operated and maintained.'],
  ['How do we get started?', 'Book a discovery call or send a short project brief below. Bring one workflow you would like to improve; we will work through the context and a useful first step.'],
];
