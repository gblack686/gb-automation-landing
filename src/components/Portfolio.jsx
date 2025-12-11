import { useEffect, useRef, useState } from 'react';

const agents = [
  {
    id: 'neural-01',
    unit: 'UNIT-01',
    name: 'Neural-01',
    role: 'The Generalist',
    icon: String.fromCodePoint(129504),
    body: 'Our flagship model for everyday workflows. Lightning-fast inference with broad domain knowledge.',
    capabilities: ['Multi-modal', 'Context-aware', 'Self-improving'],
    useCases: ['Email drafting', 'Document summarization', 'Research assistance'],
    image: 'https://res.cloudinary.com/drlpfkpzt/image/upload/v1749229614/nnn_h0ofnl.webp'
  },
  {
    id: 'logic-x9',
    unit: 'UNIT-09',
    name: 'Logic-X9',
    role: 'The Architect',
    icon: String.fromCodePoint(127959),
    body: 'Specialized in system design and technical architecture. Built for complex planning tasks.',
    capabilities: ['System Design', 'Code Generation', 'Technical Docs'],
    useCases: ['API design', 'Infrastructure planning', 'Code review automation'],
    image: 'https://res.cloudinary.com/drlpfkpzt/image/upload/v1749229614/mmm_qwabk2.webp'
  },
  {
    id: 'atlas-m2',
    unit: 'UNIT-M2',
    name: 'Atlas-M2',
    role: 'The Navigator',
    icon: String.fromCodePoint(128506),
    body: 'Data exploration and visualization specialist. Transforms raw data into actionable insights.',
    capabilities: ['Data Analysis', 'Visualization', 'Pattern Recognition'],
    useCases: ['Business intelligence', 'Market research', 'Trend forecasting'],
    image: 'https://res.cloudinary.com/drlpfkpzt/image/upload/v1749229614/ooo_a9ddoy.webp'
  },
  {
    id: 'sentry-v4',
    unit: 'UNIT-V4',
    name: 'Sentry-V4',
    role: 'The Guardian',
    icon: String.fromCodePoint(128737),
    body: 'Security-focused agent for compliance and risk assessment. Always vigilant, always learning.',
    capabilities: ['Security Audit', 'Compliance Check', 'Risk Analysis'],
    useCases: ['Code security review', 'Policy enforcement', 'Vulnerability scanning'],
    image: 'https://res.cloudinary.com/drlpfkpzt/image/upload/v1749229614/ppp_sdbqpz.webp'
  },
  {
    id: 'echo-d7',
    unit: 'UNIT-D7',
    name: 'Echo-D7',
    role: 'The Communicator',
    icon: String.fromCodePoint(128225),
    body: 'Customer interaction specialist. Handles support, feedback, and engagement at scale.',
    capabilities: ['NLP', 'Sentiment Analysis', 'Multi-language'],
    useCases: ['Customer support', 'Feedback analysis', 'Community management'],
    image: 'https://res.cloudinary.com/drlpfkpzt/image/upload/v1749229614/qqq_r0dymz.webp'
  }
];

export default function Portfolio() {
  const sectionRef = useRef(null);
  const sliderRef = useRef(null);
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

  const scroll = (direction) => {
    if (sliderRef.current) {
      const scrollAmount = 340;
      sliderRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  const visClass = isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5";

  return (
    <section id="portfolio" ref={sectionRef} className="py-24 px-6 border-t border-[#D6D4C8]/60">
      <div className={`max-w-7xl mx-auto transition-all duration-700 ${visClass}`}>
        <div className="text-center mb-16">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#8C8A84] mb-3">Portfolio</p>
          <h2 className="text-4xl md:text-5xl font-serif font-medium text-[#191919] tracking-tight mb-4">
            Deployed Architectures
          </h2>
          <p className="text-[#5C5C5C] text-sm max-w-xl mx-auto">
            Meet our specialized agents, each designed for distinct operational domains.
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-[#191919] text-[#F3F1E7] rounded-full flex items-center justify-center hover:bg-[#333] transition-colors shadow-lg -ml-5 hidden md:flex"
            aria-label="Scroll left"
          >
            ←
          </button>
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-[#191919] text-[#F3F1E7] rounded-full flex items-center justify-center hover:bg-[#333] transition-colors shadow-lg -mr-5 hidden md:flex"
            aria-label="Scroll right"
          >
            →
          </button>

          <div
            ref={sliderRef}
            className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {agents.map((agent, index) => (
              <div
                key={agent.id}
                className="flex-shrink-0 w-[320px] glass-panel rounded-2xl overflow-hidden hover-shiny snap-start"
                style={{
                  transitionDelay: `${index * 100}ms`,
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.5s ease, transform 0.5s ease"
                }}
              >
                <div className="h-48 bg-[#E6E4D9] relative overflow-hidden">
                  <img
                    src={agent.image}
                    alt={agent.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="text-[9px] uppercase tracking-wider bg-[#191919] text-[#F3F1E7] px-2 py-1 rounded-full font-bold">
                      {agent.unit}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{agent.icon}</span>
                    <h3 className="text-lg font-serif font-semibold text-[#191919]">{agent.name}</h3>
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-[#D97757] font-bold mb-3">
                    {agent.role}
                  </p>
                  <p className="text-sm text-[#5C5C5C] mb-4 leading-relaxed">
                    {agent.body}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {agent.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-[9px] uppercase tracking-wider bg-[#E6E4D9] text-[#5C5C5C] px-2 py-1 rounded-full"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>

                  <div className="border-t border-[#D6D4C8]/60 pt-4">
                    <p className="text-[9px] uppercase tracking-wider text-[#8C8A84] font-bold mb-2">
                      Use Cases
                    </p>
                    <ul className="space-y-1">
                      {agent.useCases.map((useCase) => (
                        <li key={useCase} className="text-xs text-[#5C5C5C] flex items-center gap-2">
                          <span className="w-1 h-1 bg-[#D97757] rounded-full"></span>
                          {useCase}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[10px] text-[#8C8A84] mt-4 md:hidden">
          Swipe to explore
        </p>
      </div>
    </section>
  );
}
