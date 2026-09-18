import { ArrowUpRight } from 'lucide-react';

export default function AgentForgePreview() {
  return (
    <section id="agent-forge" aria-labelledby="forge-heading" className="py-24 px-6 border-t border-[#D6D4C8]/60">
      <div className="max-w-6xl mx-auto forge-showcase">
        <div>
          <span className="home-eyebrow">Built by GBAutomation</span>
          <h2 id="forge-heading" className="text-4xl md:text-5xl font-serif font-medium tracking-tight mt-4 mb-6">Meet Agent Forge.</h2>
          <p className="text-sm md:text-base text-[#5C5C5C] leading-relaxed mb-7">
            Explore one example of what we can build together. Tell Agent Forge how your business works and get a tailored AI team design, workflow, and configuration preview by email.
          </p>
          <a className="home-showcase-link" href="/forge/">Explore Agent Forge <ArrowUpRight size={18} aria-hidden="true" /></a>
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
          <figcaption>Workspace design preview <span>Start with your free team design</span></figcaption>
        </figure>
      </div>
    </section>
  );
}
