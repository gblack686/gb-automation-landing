import { Briefcase, Code, Edit3, Search, Settings, TrendingUp, Users } from 'lucide-react';

const steps = [
  ['Intake', 'Fill a 10-minute form the day before. You pick departments and share the operating context.'],
  ['Live Build', 'We scaffold the orchestrator and profiles in Zoom while you watch, steer, and ask questions.'],
  ["You're Live", 'DM your AI team from your phone. Your agents know your business and route work immediately.'],
];

const departments = [
  { name: 'Chief of Staff', Icon: Briefcase, description: 'Daily brief, inbox, meeting prep' },
  { name: 'Research Analyst', Icon: Search, description: 'Prospect intel and competitive research' },
  { name: 'Sales Agent', Icon: TrendingUp, description: 'Outreach drafts, lead qualification, CRM' },
  { name: 'Content Creator', Icon: Edit3, description: 'Posts, newsletters, scripts' },
  { name: 'Ops Director', Icon: Settings, description: 'SOPs, vendors, reporting' },
  { name: 'Tactical Coder', Icon: Code, description: 'Writes code and opens PRs' },
];

const deliverables = [
  ['Named AI Agents', 'Your orchestrator routes tasks to specialist departments and delegates to the right profile.'],
  ['Reachable from Telegram', 'Every agent can be reached from your phone for quick tasks, checks, and follow-ups.'],
  ['Yours to Keep', 'Profiles are portable YAML files with a Loom walkthrough so the system is reproducible.'],
];

export default function HermesTeamSession() {
  const scrollToContact = () => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section id="hermes-team-session" className="border-y border-[#D6D4C8]/60 bg-[#F3F1E7] px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#D97757]">1-Hour Build Session</span>
            <h2 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#191919] md:text-5xl">
              Your AI team. Live. From your phone.
            </h2>
            <p className="mt-5 text-sm leading-7 text-[#5C5C5C] md:text-base">
              A 60-minute working session where we scaffold your AI agent team, wire it to Telegram,
              and verify that the first delegated workflow runs before the call ends.
            </p>
            <div className="mt-8 rounded-lg border border-[#D97757]/30 bg-[#D97757]/10 p-5">
              <div className="text-3xl font-bold tracking-tight text-[#191919]">$2,000 - $5,000</div>
              <p className="mt-2 text-sm leading-6 text-[#5C5C5C]">
                Starter, growth, or full-team package depending on departments and infrastructure.
              </p>
            </div>
            <button
              type="button"
              onClick={scrollToContact}
              className="mt-8 rounded-lg bg-[#D97757] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#c46845] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] focus-visible:ring-offset-2"
            >
              Book a session
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map(([title, copy], index) => (
                <div key={title} className="rounded-lg border border-[#D6D4C8] bg-white/70 p-5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-[#D97757]">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <h3 className="mt-3 font-serif text-xl font-medium text-[#191919]">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#5C5C5C]">{copy}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-[#D6D4C8] bg-white/70 p-6">
              <div className="mb-5 flex items-center gap-3">
                <Users className="h-5 w-5 text-[#D97757]" />
                <h3 className="font-serif text-2xl font-medium text-[#191919]">Department picker</h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {departments.map((department) => {
                  const Icon = department.Icon;
                  return (
                    <div key={department.name} className="rounded-lg border border-[#D6D4C8] bg-[#F3F1E7]/70 p-4">
                      <Icon className="h-4 w-4 text-[#D97757]" />
                      <div className="mt-3 text-sm font-semibold text-[#191919]">{department.name}</div>
                      <div className="mt-1 text-xs leading-5 text-[#5C5C5C]">{department.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {deliverables.map(([title, copy]) => (
                <div key={title} className="rounded-lg border border-[#D6D4C8] bg-[#E6E4D9]/55 p-5">
                  <h3 className="font-serif text-xl font-medium text-[#191919]">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#5C5C5C]">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
