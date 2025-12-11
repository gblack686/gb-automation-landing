import { useEffect, useRef, useState } from 'react';

export default function Features() {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const agents = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>
        </svg>
      ),
      title: 'Orchestrator Agent',
      description: 'Manages workflows, integrations, and deployments across your entire system. The project manager of your AI fleet.'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
        </svg>
      ),
      title: 'Developer Agent',
      description: 'Codes, tests, and ships features through vibe coding. Rapidly iterates on internal tools and user-facing products.'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h.01"/><path d="M17 7h.01"/><path d="M7 17h.01"/><path d="M17 17h.01"/>
        </svg>
      ),
      title: 'Specialized Agent',
      description: 'Custom agent tuned to your specific domain (analytics, ops, product) with deep knowledge graph access.'
    }
  ];

  const deliverables = [
    { title: 'Internal AI Application', desc: 'Custom internal app built around workflows.' },
    { title: 'External AI Product', desc: 'Customer-facing interface with ChatGPT-style chat.' },
    { title: 'RAG + Knowledge Graph', desc: 'Private data embeddings + relational graph DB.' },
    { title: 'AWS CloudFormation Kit', desc: 'Full infrastructure-as-code deployment.' },
    { title: 'CI/CD Integration', desc: 'GitHub Actions + Claude Code.' },
    { title: 'Interface Options', desc: 'Slack, Telegram, or Microsoft Teams.' }
  ];

  const visClass = isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5';

  return (
    <section id="features" ref={sectionRef} className="py-24 px-6 border-y border-[#D6D4C8]/60 relative z-10 bg-[#E6E4D9]/30">
      <div className="max-w-6xl mx-auto">
        <div className={`text-center mb-16 transition-all duration-700 ${visClass}`}>
          <h2 className="text-4xl font-serif font-medium text-[#191919] tracking-tight mb-4">
            Your Autonomous Team
          </h2>
          <p className="text-[#5C5C5C] text-sm font-normal">
            Three Claude-based agents working together as your development unit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {agents.map((agent, index) => (
            <div
              key={index}
              className={`glass-panel p-8 rounded-3xl group hover-shiny border border-[#D6D4C8] transition-all duration-700 ${visClass}`}
              style={{ transitionDelay: index * 100 + 'ms' }}
            >
              <div className="w-12 h-12 rounded-xl bg-white border border-[#D6D4C8] flex items-center justify-center mb-6 text-[#D97757] group-hover:scale-110 transition-transform duration-300">
                {agent.icon}
              </div>
              <h3 className="text-xl font-serif font-medium text-[#191919] mb-3">
                {agent.title}
              </h3>
              <p className="text-sm text-[#5C5C5C] font-normal leading-relaxed">
                {agent.description}
              </p>
            </div>
          ))}
        </div>

        <div className={`mt-20 glass-panel p-10 rounded-3xl border border-[#D6D4C8] hover-mini transition-all duration-700 ${visClass}`} style={{ transitionDelay: '400ms' }}>
          <h3 className="text-xl font-serif font-medium text-[#191919] mb-8 border-b border-[#D6D4C8] pb-4">
            Complete System Includes
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deliverables.map((item, index) => (
              <div key={index} className="flex items-start gap-3 group">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D97757] shrink-0 group-hover:scale-110 transition-transform mt-0.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <div>
                  <span className="block text-sm font-semibold text-[#191919]">
                    {item.title}
                  </span>
                  <span className="text-xs text-[#5C5C5C] mt-1">
                    {item.desc}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
