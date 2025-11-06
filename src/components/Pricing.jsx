export default function Pricing() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const included = [
    'Fully deployed AI platform (internal + external apps)',
    'Multi-agent ecosystem trained on your business data',
    'Reusable AWS kit to scale or replicate environments',
    'Documentation and test-driven pipelines',
    'Team trained on agentic development workflow',
    '20+ hours/week full-time development support'
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Investment</h2>
          <p className="text-xl text-gray-400">
            One engagement. Complete transformation.
          </p>
        </div>

        <div className="bg-gray-900 rounded-2xl overflow-hidden border-2 border-cyan-400">
          <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-black py-8 px-8 text-center">
            <h3 className="text-3xl font-bold mb-2">90-Day Agentic Systems Program</h3>
            <p className="text-gray-900 text-lg mt-4">Full-service development support</p>
          </div>

          <div className="p-8">
            <h4 className="text-xl font-bold text-white mb-6">What's Included</h4>
            <ul className="space-y-4 mb-8">
              {included.map((item, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-6 h-6 text-cyan-400 mr-3 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-300">{item}</span>
                </li>
              ))}
            </ul>

            <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
              <h5 className="font-bold text-white mb-3">After 90 Days, You Own:</h5>
              <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-300">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Complete AI infrastructure
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Self-running agent systems
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Deployment automation
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Trained development team
                </div>
              </div>
            </div>

            <button
              onClick={scrollToContact}
              className="w-full bg-cyan-400 text-black py-4 px-8 rounded-lg text-lg font-semibold hover:bg-cyan-300 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Start Your Transformation
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-500">
          <p className="text-sm">Optional add-ons available: Ongoing maintenance, additional specialized agents</p>
        </div>
      </div>
    </section>
  );
}
