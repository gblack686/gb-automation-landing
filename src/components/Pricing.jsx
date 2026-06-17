import { useEffect, useRef, useState } from 'react';

export default function Pricing() {
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

  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const tiers = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/>
        </svg>
      ),
      title: 'System Blueprint',
      price: '$500',
      period: 'One-time',
      features: ['Vibe Discovery', 'Workflow Mapping', 'Validation Gates', 'Implementation Roadmap'],
      cta: 'Get Blueprint',
      primary: false
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      ),
      title: 'Agent Implementation',
      price: '$4,999',
      period: 'Single Agent',
      features: ['Full Implementation Plan', 'Custom Agent Development', 'Validation & Testing', 'Deployment Guide', 'Knowledge Base Setup'],
      cta: 'Start Build',
      primary: true
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"/>
        </svg>
      ),
      title: 'Development Leadership',
      price: '$9,999',
      period: '/ Month',
      features: ['Full Development Leadership', 'Unlimited Agent Support', 'Strategic Planning Sessions', 'Code Review & Optimization', 'Priority Access & Response', 'Continuous System Monitoring'],
      cta: 'Apply Now',
      primary: false
    }
  ];

  const visClass = isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5';

  return (
    <section id="pricing" ref={sectionRef} className="py-32 px-6 relative overflow-hidden bg-[#F3F1E7]">
      <div className={`max-w-6xl mx-auto text-center transition-all duration-700 ${visClass}`}>
        <h2 className="text-4xl md:text-5xl font-serif font-medium text-[#191919] tracking-tighter mb-6">
          Investment
        </h2>
        <p className="text-[#5C5C5C] mb-16 text-sm font-normal">
          One engagement. Complete transformation.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {tiers.map((tier, index) => (
            <div
              key={index}
              className={`glass-panel p-8 rounded-3xl border border-[#D6D4C8] hover-shiny flex flex-col items-start text-left bg-[#E6E4D9] transition-all duration-700 ${visClass}`}
              style={{ transitionDelay: (index * 100) + 'ms' }}
            >
              <div className={`mb-4 p-2 rounded-lg ${tier.primary ? 'bg-[#D97757]/10 border border-[#D97757]/20 text-[#D97757]' : 'bg-white/40 border border-[#D6D4C8] text-[#191919]'}`}>
                {tier.icon}
              </div>
              <h3 className="text-[#191919] font-serif text-xl font-medium mb-1">{tier.title}</h3>
              <div className="mb-6">
                <span className="text-3xl font-bold text-[#191919] tracking-tight">
                  {tier.price}
                </span>
                <span className="block text-[10px] text-[#8C8A84] uppercase tracking-widest mt-1">
                  {tier.period}
                </span>
              </div>

              <ul className="text-left text-xs text-[#5C5C5C] space-y-3 mb-8 w-full">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex gap-2 items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D97757]">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={scrollToContact}
                className={`w-full py-3 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all mt-auto shadow-sm hover-mini ${tier.primary ? 'bg-[#191919] border border-transparent hover:bg-[#333] text-[#F3F1E7] shadow-lg' : 'bg-white border border-[#D6D4C8] hover:bg-[#191919] hover:text-[#F3F1E7] text-[#191919]'}`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-[#8C8A84] italic">
          *Engagement scope is finalized in the implementation plan before work begins.
        </p>
      </div>
    </section>
  );
}
