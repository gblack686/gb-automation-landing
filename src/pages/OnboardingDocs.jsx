import { Link, useParams } from 'react-router-dom';
import {
  adminChecklistGroups,
  gettingStartedGuide,
  requirementTasks,
  sourceReferences,
  welcomePage,
  welcomeEmailVariants,
} from '../clients/gbautomation/data/contentSystem';

const routeSections = [
  { id: 'flow', label: 'Flow', title: 'Current client onboarding flow' },
  { id: 'prep', label: 'Prep', title: gettingStartedGuide.title },
  { id: 'requirements', label: 'Requirements', title: 'Client-safe requirements' },
  { id: 'admin', label: 'Admin', title: 'Internal admin checklist' },
  { id: 'templates', label: 'Templates', title: 'Welcome email variants' },
  { id: 'sources', label: 'Sources', title: 'Source-backed references' },
];

const phaseCards = [
  {
    phase: '01',
    title: 'Prep and welcome packet',
    summary: 'Send the welcome note, prep guide, agenda, key terms, and service agreement when applicable.',
  },
  {
    phase: '02',
    title: 'Discovery and intake',
    summary: 'Collect the client profile, tools, departments, workflows, briefing needs, and agent style.',
  },
  {
    phase: '03',
    title: 'Requirements and boundaries',
    summary: 'Confirm access needs, approval gates, autonomy limits, deployment target, and safety rules.',
  },
  {
    phase: '04',
    title: 'Build plan and Kanban',
    summary: 'Turn the intake into source-backed work items, route implementation through Hermes Kanban, and keep receipts.',
  },
  {
    phase: '05',
    title: 'Deploy and walkthrough',
    summary: 'Provision secrets safely, bootstrap the Hermes profile, smoke test, register monitoring, and schedule handoff.',
  },
];

function SectionShell({ id, eyebrow, title, children }) {
  return (
    <section id={id} className="onboarding-doc-section scroll-mt-8" aria-labelledby={`${id}-title`}>
      <p className="onboarding-doc-eyebrow">{eyebrow}</p>
      <h2 id={`${id}-title`}>{title}</h2>
      {children}
    </section>
  );
}

function AnchorNav({ activeSection }) {
  return (
    <nav className="onboarding-doc-nav" aria-label="Onboarding docs sections">
      <span className="onboarding-doc-nav-label">Docs</span>
      {routeSections.map((section) => (
        <Link
          key={section.id}
          to={`/docs/onboarding/${section.id}`}
          className={section.id === activeSection ? 'active' : undefined}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}

export default function OnboardingDocs() {
  const { sectionId } = useParams();
  const activeSection = routeSections.some((section) => section.id === sectionId) ? sectionId : 'flow';
  const requirementsBySection = requirementTasks.reduce((groups, task) => {
    groups[task.section] = groups[task.section] || [];
    groups[task.section].push(task);
    return groups;
  }, {});

  return (
    <main className="onboarding-docs-shell">
      <style>{`
        :root {
          --docs-bg: #05070b;
          --docs-panel: rgba(15, 23, 42, 0.72);
          --docs-panel-strong: rgba(17, 24, 39, 0.92);
          --docs-line: rgba(148, 163, 184, 0.22);
          --docs-line-strong: rgba(125, 211, 252, 0.34);
          --docs-text: #e5eef8;
          --docs-muted: #9aa7b8;
          --docs-faint: #64748b;
          --docs-accent: #38bdf8;
          --docs-accent-2: #a78bfa;
          --docs-good: #34d399;
          --docs-warn: #fbbf24;
        }
        body { background: var(--docs-bg); }
        .onboarding-docs-shell {
          min-height: 100vh;
          color: var(--docs-text);
          background:
            radial-gradient(circle at top left, rgba(56, 189, 248, 0.16), transparent 30rem),
            radial-gradient(circle at 78% 8%, rgba(167, 139, 250, 0.14), transparent 24rem),
            linear-gradient(135deg, #05070b 0%, #0a1020 46%, #05070b 100%);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .onboarding-doc-frame {
          display: grid;
          grid-template-columns: 15rem minmax(0, 1fr);
          min-height: 100vh;
        }
        .onboarding-doc-sidebar {
          position: sticky;
          top: 0;
          height: 100vh;
          border-right: 1px solid var(--docs-line);
          background: rgba(2, 6, 23, 0.72);
          backdrop-filter: blur(20px);
          padding: 1.25rem;
        }
        .onboarding-doc-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }
        .onboarding-doc-orb {
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 1rem;
          background:
            linear-gradient(135deg, rgba(255,255,255,0.92), rgba(148,163,184,0.42)) padding-box,
            conic-gradient(from 160deg, var(--docs-accent), var(--docs-accent-2), var(--docs-good), var(--docs-accent)) border-box;
          border: 1px solid transparent;
          box-shadow: 0 0 36px rgba(56, 189, 248, 0.28);
        }
        .onboarding-doc-brand strong {
          display: block;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-size: 0.8rem;
        }
        .onboarding-doc-brand span {
          display: block;
          color: var(--docs-muted);
          font-size: 0.75rem;
          margin-top: 0.15rem;
        }
        .onboarding-doc-nav {
          display: grid;
          gap: 0.35rem;
        }
        .onboarding-doc-nav-label,
        .onboarding-doc-eyebrow {
          color: var(--docs-accent);
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .onboarding-doc-nav a {
          color: var(--docs-muted);
          text-decoration: none;
          border: 1px solid transparent;
          border-radius: 0.85rem;
          padding: 0.7rem 0.8rem;
          font-size: 0.92rem;
        }
        .onboarding-doc-nav a:hover,
        .onboarding-doc-nav a.active {
          color: var(--docs-text);
          background: rgba(15, 23, 42, 0.78);
          border-color: var(--docs-line);
        }
        .onboarding-doc-nav a.active { border-color: var(--docs-line-strong); }
        .onboarding-doc-main {
          width: min(100%, 76rem);
          margin: 0 auto;
          padding: 4rem 2rem 5rem;
        }
        .onboarding-doc-hero {
          border: 1px solid var(--docs-line);
          border-radius: 1.5rem;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.84), rgba(2, 6, 23, 0.64));
          box-shadow: 0 32px 90px rgba(0, 0, 0, 0.35);
          padding: clamp(1.5rem, 4vw, 3rem);
          overflow: hidden;
          position: relative;
        }
        .onboarding-doc-hero::after {
          content: '';
          position: absolute;
          inset: auto -14rem -16rem auto;
          width: 28rem;
          height: 28rem;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(56,189,248,0.18), transparent 68%);
          pointer-events: none;
        }
        .onboarding-doc-hero h1 {
          max-width: 58rem;
          margin: 0.8rem 0 1rem;
          font-size: clamp(2.5rem, 8vw, 5.8rem);
          line-height: 0.9;
          letter-spacing: -0.07em;
        }
        .onboarding-doc-hero p {
          max-width: 50rem;
          color: var(--docs-muted);
          font-size: clamp(1rem, 2vw, 1.18rem);
          line-height: 1.75;
        }
        .onboarding-doc-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 1.6rem;
        }
        .onboarding-doc-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 2.75rem;
          border-radius: 999px;
          padding: 0 1.1rem;
          border: 1px solid var(--docs-line);
          color: var(--docs-text);
          text-decoration: none;
          background: rgba(15, 23, 42, 0.72);
          font-weight: 700;
        }
        .onboarding-doc-button.primary {
          color: #031019;
          background: linear-gradient(135deg, var(--docs-accent), #7dd3fc);
          border-color: transparent;
        }
        .onboarding-doc-section {
          margin-top: 1.2rem;
          border: 1px solid var(--docs-line);
          border-radius: 1.25rem;
          background: var(--docs-panel);
          padding: clamp(1.15rem, 3vw, 2rem);
        }
        .onboarding-doc-section h2 {
          margin: 0.45rem 0 1.2rem;
          font-size: clamp(1.5rem, 4vw, 2.45rem);
          letter-spacing: -0.035em;
        }
        .onboarding-doc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
          gap: 1rem;
        }
        .onboarding-doc-card,
        .onboarding-doc-list-card {
          border: 1px solid var(--docs-line);
          border-radius: 1rem;
          background: rgba(2, 6, 23, 0.38);
          padding: 1rem;
        }
        .onboarding-doc-card strong {
          display: block;
          color: var(--docs-text);
          font-size: 1.02rem;
          margin-bottom: 0.45rem;
        }
        .onboarding-doc-card p,
        .onboarding-doc-list-card p,
        .onboarding-doc-list-card li {
          color: var(--docs-muted);
          line-height: 1.65;
          font-size: 0.93rem;
        }
        .onboarding-doc-phase {
          color: var(--docs-accent);
          font-family: 'SF Mono', ui-monospace, monospace;
          font-size: 0.78rem;
          font-weight: 800;
          margin-bottom: 0.9rem;
        }
        .onboarding-doc-list {
          display: grid;
          gap: 0.65rem;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .onboarding-doc-list li {
          border-radius: 0.8rem;
          background: rgba(15, 23, 42, 0.52);
          padding: 0.85rem;
        }
        .onboarding-doc-table {
          width: 100%;
          border-collapse: collapse;
          overflow: hidden;
          border-radius: 1rem;
        }
        .onboarding-doc-table th,
        .onboarding-doc-table td {
          border-bottom: 1px solid var(--docs-line);
          padding: 0.8rem;
          text-align: left;
          vertical-align: top;
          font-size: 0.9rem;
        }
        .onboarding-doc-table th {
          color: var(--docs-accent);
          background: rgba(15, 23, 42, 0.65);
          font-size: 0.72rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .onboarding-doc-table td { color: var(--docs-muted); }
        .onboarding-doc-pill {
          display: inline-flex;
          border: 1px solid var(--docs-line);
          border-radius: 999px;
          padding: 0.18rem 0.55rem;
          color: var(--docs-good);
          font-size: 0.75rem;
          white-space: nowrap;
        }
        .onboarding-doc-source a {
          color: var(--docs-accent);
          word-break: break-word;
        }
        @media (max-width: 820px) {
          .onboarding-doc-frame { display: block; }
          .onboarding-doc-sidebar {
            position: static;
            height: auto;
            border-right: 0;
            border-bottom: 1px solid var(--docs-line);
            padding: 1rem;
          }
          .onboarding-doc-brand { margin-bottom: 0.9rem; }
          .onboarding-doc-nav {
            display: flex;
            gap: 0.5rem;
            overflow-x: auto;
            padding-bottom: 0.2rem;
          }
          .onboarding-doc-nav-label { display: none; }
          .onboarding-doc-nav a { white-space: nowrap; }
          .onboarding-doc-main { padding: 1rem 1rem 3rem; }
          .onboarding-doc-table { display: block; overflow-x: auto; }
        }
      `}</style>
      <div className="onboarding-doc-frame">
        <aside className="onboarding-doc-sidebar">
          <div className="onboarding-doc-brand">
            <span className="onboarding-doc-orb" aria-hidden="true" />
            <div>
              <strong>GBAuto Docs</strong>
              <span>Onboarding / 9119</span>
            </div>
          </div>
          <AnchorNav activeSection={activeSection} />
        </aside>

        <div className="onboarding-doc-main">
          <header className="onboarding-doc-hero">
            <p className="onboarding-doc-eyebrow">{welcomePage.eyebrow}</p>
            <h1>Client onboarding runbook</h1>
            <p>{welcomePage.intro}</p>
            <div className="onboarding-doc-hero-actions">
              <Link className="onboarding-doc-button primary" to="/docs/onboarding/prep">Start prep guide</Link>
              <Link className="onboarding-doc-button" to="/docs/onboarding/requirements">Review requirements</Link>
            </div>
          </header>

          <SectionShell id="flow" eyebrow="Flow" title="Current client onboarding flow">
            <div className="onboarding-doc-grid">
              {phaseCards.map((card) => (
                <article key={card.phase} className="onboarding-doc-card">
                  <div className="onboarding-doc-phase">{card.phase}</div>
                  <strong>{card.title}</strong>
                  <p>{card.summary}</p>
                </article>
              ))}
            </div>
          </SectionShell>

          <SectionShell id="prep" eyebrow={gettingStartedGuide.eyebrow} title={gettingStartedGuide.title}>
            <p className="onboarding-doc-list-card">{gettingStartedGuide.intro}</p>
            <div className="onboarding-doc-grid" style={{ marginTop: '1rem' }}>
              {gettingStartedGuide.sections.map((section) => (
                <article key={section.title} className="onboarding-doc-list-card">
                  <strong>{section.title}</strong>
                  <ul className="onboarding-doc-list" style={{ marginTop: '0.7rem' }}>
                    {section.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </SectionShell>

          <SectionShell id="requirements" eyebrow="Checklist" title="Client-safe requirements">
            <div className="onboarding-doc-grid">
              {Object.entries(requirementsBySection).map(([section, tasks]) => (
                <article key={section} className="onboarding-doc-list-card">
                  <strong>{section}</strong>
                  <ul className="onboarding-doc-list" style={{ marginTop: '0.7rem' }}>
                    {tasks.map((task) => (
                      <li key={`${section}-${task.requirement}`}>
                        {task.requirement}
                        <br />
                        <span className="onboarding-doc-pill">{task.owner}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </SectionShell>

          <SectionShell id="admin" eyebrow="Operations" title="Internal admin checklist">
            <div className="onboarding-doc-grid">
              {adminChecklistGroups.map((group) => (
                <article key={group.title} className="onboarding-doc-list-card">
                  <strong>{group.title}</strong>
                  <ul className="onboarding-doc-list" style={{ marginTop: '0.7rem' }}>
                    {group.items.map((item) => (
                      <li key={item.task}>
                        {item.task}
                        <br />
                        <span className="onboarding-doc-pill">{item.owner}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </SectionShell>

          <SectionShell id="templates" eyebrow="Comms" title="Welcome email variants">
            <div className="onboarding-doc-grid">
              {welcomeEmailVariants.map((variant) => (
                <article key={variant.title} className="onboarding-doc-list-card">
                  <strong>{variant.title}</strong>
                  <ul className="onboarding-doc-list" style={{ marginTop: '0.7rem' }}>
                    {variant.subjects.map((subject) => <li key={subject}>{subject}</li>)}
                  </ul>
                  <p style={{ marginTop: '0.8rem' }}>Source basis: {variant.sourceBasis}</p>
                </article>
              ))}
            </div>
          </SectionShell>

          <SectionShell id="sources" eyebrow="Receipts" title="Source-backed references">
            <table className="onboarding-doc-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Path</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {sourceReferences.map((reference) => (
                  <tr key={reference.path} className="onboarding-doc-source">
                    <td>{reference.label}</td>
                    <td>{reference.path}</td>
                    <td>{reference.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionShell>
        </div>
      </div>
    </main>
  );
}
