import { useEffect, useRef, useState } from 'react';
import { Bot, Network, BarChart2, Shield, MessageSquare, ArrowLeft, ArrowRight } from 'lucide-react';

const agents = [
  {
    unit: 'Neural-01',
    name: 'The Generalist',
    Icon: Bot,
    role: 'Versatile AI Agent',
    body: 'Modular Robotics, Exposed Chassis',
    capabilities: ['Neural Net v2', 'DB Integration', 'Auto-Ops'],
    useCases: ['Web Scraper & Data Mining', 'Autonomous Code Refactoring', 'System Diagnostics'],
    image: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?q=80&w=1000&auto=format&fit=crop'
  },
  {
    unit: 'Logic-X9',
    name: 'The Architect',
    Icon: Network,
    role: 'System Designer',
    body: 'Reinforced Core, Logic Gates',
    capabilities: ['Schema Design', 'AWS Config', 'Flow Logic'],
    useCases: ['Infrastructure as Code', 'Database Optimization', 'Workflow Mapping'],
    image: 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?q=80&w=1000&auto=format&fit=crop'
  },
  {
    unit: 'Atlas-M2',
    name: 'The Analyst',
    Icon: BarChart2,
    role: 'Data Processor',
    body: 'High-Bandwidth Sensors',
    capabilities: ['Pattern Rec', 'Vector Embeddings'],
    useCases: ['Financial Modeling', 'User Behavior Tracking', 'Predictive Analytics'],
    image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1000&auto=format&fit=crop'
  },
  {
    unit: 'Sentry-V4',
    name: 'The Guardian',
    Icon: Shield,
    role: 'Security & Audit',
    body: 'Hardened Shell, Encrypted Core',
    capabilities: ['Pen Testing', 'Code Audit'],
    useCases: ['Vulnerability Scanning', 'Legal Document Review', 'Compliance Checks'],
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1000&auto=format&fit=crop'
  },
  {
    unit: 'Echo-D7',
    name: 'The Interface',
    Icon: MessageSquare,
    role: 'Customer Engagement',
    body: 'Humanoid Form, Vocal Syntax',
    capabilities: ['NLP Engines', 'Sentiment Analysis'],
    useCases: ['24/7 Customer Support', 'Multi-language Translation', 'Sales Outreach'],
    image: 'https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/917d6f93-fb36-439a-8c48-884b67b35381_1600w.jpg'
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
      const scrollAmount = direction === 'left' ? -470 : 470;
      sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const visClass = isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5';

  return (
    <section id="portfolio" ref={sectionRef} className="py-24 border-t border-[#D6D4C8]/60 overflow-hidden relative">
      <div className="absolute inset-0 bg-[#E6E4D9]/20 -z-10"></div>

      {/* Section Header */}
      <div className={`max-w-7xl mx-auto px-6 mb-12 flex items-end justify-between transition-all duration-700 ${visClass}`}>
        <div>
          <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase">
            Portfolio
          </span>
          <h2 className="text-4xl font-serif font-medium text-[#191919] tracking-tight mt-2">
            Deployed Architectures
          </h2>
        </div>
        {/* Slider Controls */}
        <div className="hidden md:flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="w-10 h-10 rounded-full border border-[#D6D4C8] flex items-center justify-center bg-white/50 hover:bg-[#191919] hover:text-[#F3F1E7] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-10 h-10 rounded-full border border-[#D6D4C8] flex items-center justify-center bg-white/50 hover:bg-[#191919] hover:text-[#F3F1E7] transition-all"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slider Container */}
      <div
        ref={sliderRef}
        className={`flex overflow-x-auto snap-x snap-mandatory gap-6 px-6 pb-12 scroll-smooth transition-all duration-700 delay-100 ${visClass}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {agents.map((agent, index) => {
          const IconComponent = agent.Icon;
          return (
            <div
              key={agent.unit}
              className="min-w-[85%] md:min-w-[450px] snap-center glass-panel p-0 rounded-2xl border border-[#D6D4C8] flex flex-col group overflow-hidden"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Image Section */}
              <div className="h-48 bg-[#F3F1E7] relative overflow-hidden flex items-center justify-center border-b border-[#D6D4C8]">
                <img
                  src={agent.image}
                  alt={`${agent.unit} Robot`}
                  className="absolute inset-0 w-full h-full object-cover grayscale opacity-90 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#E6E4D9] to-transparent opacity-60"></div>
                <div className="relative z-10 px-4 py-1 bg-white/80 backdrop-blur border border-[#D6D4C8] rounded-full text-[10px] uppercase tracking-widest font-bold text-[#191919]">
                  Unit: {agent.unit}
                </div>
              </div>

              {/* Content Section */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-serif font-medium text-[#191919] underline decoration-[#D6D4C8] decoration-1 underline-offset-4">
                    {agent.name}
                  </h3>
                  <div className="w-8 h-8 rounded-full border border-[#D6D4C8] flex items-center justify-center text-[#D97757]">
                    <IconComponent className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Role */}
                  <div className="grid grid-cols-3 border-t border-[#D6D4C8] py-2">
                    <span className="text-[10px] uppercase font-bold text-[#8C8A84] tracking-wider col-span-1 pt-1">Role</span>
                    <span className="text-xs text-[#191919] col-span-2 font-medium">{agent.role}</span>
                  </div>

                  {/* Body */}
                  <div className="grid grid-cols-3 border-t border-[#D6D4C8] py-2">
                    <span className="text-[10px] uppercase font-bold text-[#8C8A84] tracking-wider col-span-1 pt-1">Body</span>
                    <span className="text-xs text-[#5C5C5C] col-span-2">{agent.body}</span>
                  </div>

                  {/* Capabilities */}
                  <div className="grid grid-cols-3 border-t border-[#D6D4C8] py-2">
                    <span className="text-[10px] uppercase font-bold text-[#8C8A84] tracking-wider col-span-1 pt-1">Capabilities</span>
                    <div className="col-span-2 flex flex-wrap gap-1">
                      {agent.capabilities.map((cap) => (
                        <span key={cap} className="px-1.5 py-0.5 bg-[#F3F1E7] border border-[#D6D4C8] rounded text-[9px] text-[#5C5C5C]">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Use Cases */}
                  <div className="grid grid-cols-3 border-t border-[#D6D4C8] py-2">
                    <span className="text-[10px] uppercase font-bold text-[#8C8A84] tracking-wider col-span-1 pt-1">Use Cases</span>
                    <ul className="col-span-2 text-xs text-[#5C5C5C] space-y-1 list-disc pl-3">
                      {agent.useCases.map((useCase) => (
                        <li key={useCase}>{useCase}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
