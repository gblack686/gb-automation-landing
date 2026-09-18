import AnimatedCta from './AnimatedCta';

export default function AgentForgePreview() {
  return (
    <section id="agent-forge" aria-labelledby="forge-heading" className="py-24 px-6 border-t border-[#D6D4C8]/60">
      <div className="max-w-6xl mx-auto forge-showcase">
        <div>
          <span className="home-eyebrow">Built by GBAutomation</span>
          <h2 id="forge-heading" className="text-4xl md:text-5xl font-serif font-medium tracking-tight mt-4 mb-6">Meet Agent Forge.</h2>
          <p className="text-sm md:text-base text-[#5C5C5C] leading-relaxed mb-7">
            Explore one example of what we can build together: an AI workspace for expert agents, connected workflows, and shared context. Preview Agent Forge, then talk with Greg about a team designed around your business.
          </p>
          <AnimatedCta href="/forge/">Explore Agent Forge</AnimatedCta>
        </div>
        <figure className="forge-preview-frame glass-panel">
          <div className="forge-preview-chrome" aria-hidden="true">
            <span className="forge-window-dots"><i /><i /><i /></span>
            <span>Agent Forge</span>
          </div>
          <img
            src="/images/forge-workspace-preview.png"
            alt="Agent Forge workspace concept showing an expert profile, configuration, and work area"
            width="2160" height="1410" loading="lazy" decoding="async"
          />
          <figcaption>Workspace design preview <span>Automated team design coming soon</span></figcaption>
        </figure>
      </div>
    </section>
  );
}
