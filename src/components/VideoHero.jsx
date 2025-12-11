import { useEffect, useRef, useState } from "react"

export default function VideoHero() {
  const videoRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    // Trigger reveal animation
    setTimeout(() => setIsRevealed(true), 100)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (videoRef.current && isMobile) {
      videoRef.current.play().catch(err => {
        console.log('Video autoplay prevented:', err)
      })
    }
  }, [isMobile, videoLoaded])

  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="relative min-h-screen overflow-hidden selection:bg-[#D97757] selection:text-white">
      {/* Ambient Background Glow */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#D97757]/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#C26D52]/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Background Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-30"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onLoadedData={() => setVideoLoaded(true)}
        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'%3E%3Crect fill='%23F3F1E7' width='1920' height='1080'/%3E%3C/svg%3E"
      >
        <source
          src="https://res.cloudinary.com/doevp9obh/video/upload/v1751630378/social_u7865913127_httpss.mj.runfy9I6hP3bjY_A_serene_cinematic_anima_3732f431-944f-4ee3-9b66-c82c1462de47_1_vjttzg.mp4"
          type="video/mp4"
        />
      </video>

      {/* Video Overlay - cream tint */}
      <div className="absolute inset-0 bg-[#F3F1E7]/70 z-0" />

      {/* Navigation Bar */}
      <header className="fixed top-0 w-full z-50 border-b border-[#D6D4C8]/60 bg-[#F3F1E7]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 hover-mini cursor-default">
            <div className="relative w-6 h-6 flex items-center justify-center">
              <div className="absolute inset-0 bg-[#D97757]/20 blur-md rounded-full"></div>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#D97757] relative z-10">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <span className="font-serif text-lg font-semibold tracking-tight text-[#191919]">
              GB AUTOMATION
            </span>
          </div>

          <nav className="hidden md:flex gap-8 text-[11px] font-medium tracking-widest uppercase text-[#8C8A84]">
            <a href="#features" className="hover:text-[#D97757] transition-colors hover-mini">
              Features
            </a>
            <a href="#process" className="hover:text-[#D97757] transition-colors hover-mini">
              90-Day Process
            </a>
            <a href="#pricing" className="hover:text-[#D97757] transition-colors hover-mini">
              Investment
            </a>
          </nav>

          <a href="#contact" className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-white border border-[#D6D4C8] text-[#191919] text-[11px] font-medium tracking-wide rounded-full hover:bg-[#191919] hover:text-[#F3F1E7] transition-all shadow-sm hover-mini group">
            Start Vibe Coding
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </header>

      {/* Hero Content */}
      <section className="relative pt-40 pb-20 px-6 overflow-hidden flex flex-col items-center text-center z-10 min-h-screen justify-center">
        {/* Status Indicator */}
        <div className={`mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D6D4C8] bg-white/60 backdrop-blur-sm hover-mini cursor-default shadow-sm transition-all duration-700 ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D97757] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D97757]"></span>
          </span>
          <span className="text-[10px] uppercase tracking-widest text-[#5C5C5C] font-semibold">
            Powered by ElevenLabs Agents
          </span>
        </div>

        <h1 className={`text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-serif font-medium text-[#191919] tracking-tight mb-8 max-w-5xl leading-[1] transition-all duration-700 delay-100 ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          Build Smarter with
          <br />
          <span className="text-[#D97757] italic">
            An AI Developer.
          </span>
        </h1>

        <p className={`text-[#5C5C5C] text-sm md:text-base max-w-2xl mx-auto mb-12 leading-relaxed font-normal transition-all duration-700 delay-200 ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          90-Day Agentic Systems Program: Internal tools, external products, and autonomous AI workflows built for your business. An AI developer that codes in your vibe.
        </p>

        <div className={`flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-center transition-all duration-700 delay-300 ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <button
            onClick={scrollToContact}
            className="relative group overflow-hidden rounded-full bg-[#191919] hover:bg-[#333] transition-all hover-mini shadow-lg shadow-[#191919]/10 w-full sm:w-auto"
          >
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full px-8 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#F3F1E7]">
              Schedule Discovery Call
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                <path d="m9 18 6-6-6-6"></path>
              </svg>
            </span>
          </button>
        </div>
      </section>
    </div>
  )
}
