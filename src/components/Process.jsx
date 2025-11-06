export default function Process() {
  const phases = [
    {
      number: '1',
      title: 'Vibe Discovery',
      duration: '2 weeks',
      description: 'Map workflows, define validation gates, and understand your business context'
    },
    {
      number: '2',
      title: 'Development Sprint',
      duration: '6 weeks',
      description: 'Build internal + external apps, integrate agents, and establish core functionality'
    },
    {
      number: '3',
      title: 'Agent Orchestration & Training',
      duration: '2 weeks',
      description: 'RAG setup, specialized agent training, and system optimization'
    },
    {
      number: '4',
      title: 'Handoff & Enablement',
      duration: 'Final week',
      description: 'CloudFormation kit, team training, documentation, and full system transfer'
    }
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">The 90-Day Process</h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            A structured approach to building production-ready AI systems
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Connection line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-400 via-cyan-500 to-cyan-600 transform -translate-x-1/2"></div>

          <div className="space-y-12">
            {phases.map((phase, index) => (
              <div key={index} className={`flex flex-col md:flex-row items-center gap-8 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                {/* Content */}
                <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                  <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-cyan-400 transition-all duration-300">
                    <h3 className="text-2xl font-bold text-white mb-2">{phase.title}</h3>
                    <p className="text-sm text-cyan-400 font-semibold mb-3">{phase.duration}</p>
                    <p className="text-gray-400">{phase.description}</p>
                  </div>
                </div>

                {/* Circle number */}
                <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500 text-black text-2xl font-bold shadow-lg flex-shrink-0">
                  {phase.number}
                </div>

                {/* Spacer for alternating layout */}
                <div className="flex-1 hidden md:block"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Collaboration Model */}
        <div className="mt-16 bg-gray-900 p-8 rounded-xl border border-gray-800">
          <h3 className="text-2xl font-bold text-white mb-4 text-center">Collaboration Model</h3>
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="flex justify-center mb-3">
                <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-300">Weekly Strategy Meetings</p>
            </div>
            <div>
              <div className="flex justify-center mb-3">
                <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-300">Daily Check-ins</p>
            </div>
            <div>
              <div className="flex justify-center mb-3">
                <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="font-semibold text-gray-300">Developer Training</p>
            </div>
            <div>
              <div className="flex justify-center mb-3">
                <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-300">In-person or Virtual</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
