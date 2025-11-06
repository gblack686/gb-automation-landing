export default function Features() {
  const agents = [
    {
      icon: (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
      title: 'Orchestrator Agent',
      description: 'Manages workflows, integrations, and deployments across your entire system'
    },
    {
      icon: (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      title: 'Developer Agent',
      description: 'Codes, tests, and ships features through vibe coding'
    },
    {
      icon: (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: 'Specialized Agent',
      description: 'Custom agent tuned to your domain (analytics, ops, product)'
    }
  ];

  const deliverables = [
    'Internal AI Application - Custom internal app built around team workflows',
    'External AI Product - Customer-facing interface with ChatGPT-style chat',
    'RAG + Knowledge Graph backend - Private data embeddings + relational graph DB',
    'AWS CloudFormation Kit - Full infrastructure-as-code deployment',
    'CI/CD Integration - GitHub Actions + Claude Code',
    'Interface options - Slack, Telegram, or Microsoft Teams'
  ];

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">What You Get</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Three Claude-based agents working together as your autonomous development team
          </p>
        </div>

        {/* Agents Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {agents.map((agent, index) => (
            <div key={index} className="bg-gray-900 p-8 rounded-xl border border-gray-800 hover:border-cyan-400 transition-all duration-300">
              <div className="text-cyan-400 mb-6">{agent.icon}</div>
              <h3 className="text-2xl font-bold text-white mb-3">{agent.title}</h3>
              <p className="text-gray-400">{agent.description}</p>
            </div>
          ))}
        </div>

        {/* Deliverables */}
        <div className="bg-gray-900 p-8 rounded-xl border border-gray-800">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">Complete System Includes</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {deliverables.map((item, index) => (
              <div key={index} className="flex items-start">
                <svg className="w-6 h-6 text-cyan-400 mr-3 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <strong className="text-white">{item.split(' - ')[0]}</strong>
                  {item.includes(' - ') && <span className="text-gray-400"> - {item.split(' - ')[1]}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
