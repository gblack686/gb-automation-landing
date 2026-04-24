export default function Hero() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F3F1E7' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight" style={{ color: '#191919', fontFamily: "'Newsreader', serif" }}>
            Build Smarter and Faster with an AI Developer<br />
            <span style={{ color: '#D97757' }}>That Codes in Your Vibe</span>
          </h1>

          <p className="text-xl sm:text-2xl mb-8 max-w-4xl mx-auto" style={{ color: '#5C5C5C' }}>
            90-Day Agentic Systems Program: Internal tools, external products, and autonomous AI workflows built for your business
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={scrollToContact}
              className="px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              style={{ backgroundColor: '#D97757', color: '#F3F1E7' }}
              onMouseEnter={e => e.target.style.backgroundColor = '#c5653f'}
              onMouseLeave={e => e.target.style.backgroundColor = '#D97757'}
            >
              Schedule Discovery Call
            </button>
            <button
              onClick={scrollToFeatures}
              className="px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200"
              style={{ backgroundColor: 'rgba(230, 228, 217, 0.6)', backdropFilter: 'blur(12px)', color: '#191919', border: '1px solid rgba(214, 212, 200, 0.6)' }}
            >
              Learn More
            </button>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm uppercase tracking-wide mb-4" style={{ color: '#8C8A84' }}>Key Deliverables</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="px-4 py-2 rounded-full font-semibold shadow-sm" style={{ backgroundColor: '#E6E4D9', color: '#191919', border: '1px solid #D6D4C8' }}>3 Claude Agents</span>
              <span className="px-4 py-2 rounded-full font-semibold shadow-sm" style={{ backgroundColor: '#E6E4D9', color: '#191919', border: '1px solid #D6D4C8' }}>RAG + Knowledge Graph</span>
              <span className="px-4 py-2 rounded-full font-semibold shadow-sm" style={{ backgroundColor: '#E6E4D9', color: '#191919', border: '1px solid #D6D4C8' }}>AWS CloudFormation Kit</span>
              <span className="px-4 py-2 rounded-full font-semibold shadow-sm" style={{ backgroundColor: '#E6E4D9', color: '#191919', border: '1px solid #D6D4C8' }}>20+ hrs/week Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
          <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="white"/>
        </svg>
      </div>
    </section>
  );
}
