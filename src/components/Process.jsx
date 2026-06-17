import { useEffect, useRef, useState } from 'react';

export default function Process() {
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

  const phases = [
    {
      number: '01',
      title: 'Vibe Discovery',
      duration: 'Discovery',
      description: 'Map workflows, define validation gates, and understand your business context deeply to calibrate the agents.'
    },
    {
      number: '02',
      title: 'Development Sprint',
      duration: 'Sprint',
      description: 'Build internal + external apps, integrate agents, and establish core functionality using iterative vibe coding sessions.'
    },
    {
      number: '03',
      title: 'Agent Orchestration & Training',
      duration: 'Orchestration',
      description: 'RAG setup, specialized agent training, and system optimization for autonomy.'
    },
    {
      number: '04',
      title: 'Handoff & Enablement',
      duration: 'Handoff',
      description: 'CloudFormation kit, team training, documentation, and full system transfer plan.'
    }
  ];

  const visClass = isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5';

  return (
    <section id="process" ref={sectionRef} className="py-24 px-6 relative bg-[#F3F1E7]">
      <div className="max-w-5xl mx-auto">
        <div className={`mb-16 transition-all duration-700 ${visClass}`}>
          <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase">
            Methodology
          </span>
          <h2 className="text-4xl font-serif font-medium text-[#191919] tracking-tight mt-2">
            The Implementation Process
          </h2>
          <p className="text-[#5C5C5C] text-sm mt-2">
            A structured approach to building production-ready AI systems.
          </p>
        </div>

        <div className="relative border-l border-[#D6D4C8] ml-4 md:ml-0 space-y-16">
          {phases.map((phase, index) => (
            <div
              key={index}
              className={`relative pl-12 md:pl-0 md:grid md:grid-cols-5 gap-8 items-start group transition-all duration-700 ${visClass}`}
              style={{ transitionDelay: (index * 150) + 'ms' }}
            >
              <div className="md:col-span-1 md:text-right">
                <span className="text-xs font-mono text-[#8C8A84] uppercase tracking-wider">
                  Phase {phase.number}
                </span>
                <div className="text-xl font-serif text-[#191919] mt-1">{phase.duration}</div>
              </div>
              <div className="absolute left-[-5px] top-1 md:relative md:left-auto md:top-auto md:flex md:justify-center md:col-span-1">
                <div className={`w-2.5 h-2.5 rounded-full ring-4 ring-[#F3F1E7] group-hover:scale-125 transition-transform ${index === 0 ? 'bg-[#D97757]' : index === 3 ? 'bg-[#191919]' : 'bg-[#8C8A84]'}`}></div>
              </div>
              <div className="md:col-span-3 hover-mini p-4 rounded-xl hover:bg-white/50 border border-transparent hover:border-[#D6D4C8] transition-all">
                <h3 className="text-lg font-semibold text-[#191919] mb-2">
                  {phase.title}
                </h3>
                <p className="text-sm text-[#5C5C5C] leading-relaxed">
                  {phase.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
