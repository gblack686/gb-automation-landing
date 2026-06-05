import { Bot, Database, LockKeyhole, Radio } from 'lucide-react';

const features = [
  {
    title: 'Always on',
    Icon: Radio,
    description: 'Runs 24/7 on dedicated infrastructure. Telegram-first, reachable from the workflows you already use.',
  },
  {
    title: 'Context-isolated',
    Icon: LockKeyhole,
    description: 'Each client profile has separate context and credentials so one business never touches another.',
  },
  {
    title: 'Vault-aware',
    Icon: Database,
    description: 'Reads the operating vault: meeting notes, client files, project history, decisions, and active blockers.',
  },
];

export default function HermesProfile() {
  return (
    <section id="hermes-profile" className="bg-[#E6E4D9]/35 px-6 py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#D97757]">
            The Hermes Profile Model
          </span>
          <h2 className="mt-3 font-serif text-4xl font-medium tracking-tight text-[#191919] md:text-5xl">
            Your dedicated AI companion.
          </h2>
          <p className="mt-5 text-sm leading-7 text-[#5C5C5C] md:text-base">
            Every GBAutomation client gets a named AI agent, deployed just for them. Not a shared bot:
            your own isolated Hermes profile with its own Telegram handle, context, and runtime.
          </p>
          <p className="mt-5 text-sm leading-7 text-[#5C5C5C] md:text-base">
            Carlos knows Jason's business. Finn knows Mike's portfolio. Your agent knows yours.
          </p>
        </div>

        <div className="rounded-lg border border-[#D6D4C8] bg-white/70 p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3 border-b border-[#D6D4C8] pb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#191919] text-[#F3F1E7]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="font-serif text-2xl text-[#191919]">Named agent profile</div>
              <div className="text-xs uppercase tracking-widest text-[#8C8A84]">Telegram + vault + delegated tools</div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.Icon;
              return (
                <div key={feature.title} className="rounded-lg border border-[#D6D4C8] bg-[#F3F1E7]/70 p-5">
                  <Icon className="h-5 w-5 text-[#D97757]" />
                  <h3 className="mt-4 font-serif text-xl font-medium text-[#191919]">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#5C5C5C]">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
