import { useEffect, useRef, useState } from "react"
import HeroIntroVideo from "./HeroIntroVideo"

export default function VideoHero() {
  const [isRevealed, setIsRevealed] = useState(false)
  const headerRef = useRef(null)

  useEffect(() => {
    const header = headerRef.current
    const home = header.closest('.particle-home')
    const measure = () => home.style.setProperty('--home-header-height', `${header.getBoundingClientRect().height}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setIsRevealed(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }

  return (
    <div className="home-hero relative min-h-screen selection:bg-[#D97757] selection:text-white">
      {/* Navigation Bar */}
      <header ref={headerRef} id="home-header" className="fixed top-0 w-full z-50 border-b border-[#D6D4C8]/60 bg-[#F3F1E7]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-3 xl:py-0 xl:h-16 flex flex-wrap items-center justify-center xl:justify-between gap-x-6 gap-y-2">
          <div className="flex items-center gap-3 hover-mini cursor-default">
            <img
              src="/gb-signature.png"
              alt="GB"
              className="h-8 w-auto opacity-90"
            />
            <span className="font-serif text-lg font-semibold tracking-tight text-[#191919]">
              GB AUTOMATION
            </span>
          </div>

          <nav aria-label="Main navigation" className="order-last xl:order-none w-full xl:w-auto flex flex-wrap justify-center gap-x-5 gap-y-1 text-[11px] font-medium tracking-widest uppercase text-[#8C8A84]">
            <a href="#features" className="hover:text-[#D97757] transition-colors hover-mini">
              Services
            </a>
            <a href="#process" className="hover:text-[#D97757] transition-colors hover-mini">
              90-Day Process
            </a>
            <a href="#contact" className="hover:text-[#D97757] transition-colors hover-mini">
              Work with me
            </a>
            <a href="/ai-resume.html" className="hover:text-[#D97757] transition-colors hover-mini">
              Resume
            </a>
            <a href="/zero-touch-engineering.html" className="hover:text-[#D97757] transition-colors hover-mini">
              Zero Touch Engineering
            </a>
          </nav>

          <a href="/forge/" className="flex shrink-0 items-center gap-2 px-4 py-1.5 bg-white border border-[#D6D4C8] text-[#191919] text-[11px] font-medium tracking-wide rounded-full hover:bg-[#191919] hover:text-[#F3F1E7] transition-all shadow-sm hover-mini group">
            Explore Agent Forge
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </a>
        </div>
      </header>

      {/* Hero Content */}
      <section id="home-hero-copy" className="relative pt-40 pb-20 px-6 overflow-hidden flex flex-col items-center text-center z-10 min-h-screen justify-center">
        {/* Status Indicator */}
        <div id="home-status" className={`mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#D6D4C8] bg-white/60 backdrop-blur-sm hover-mini cursor-default shadow-sm transition-all duration-700 ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D97757] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D97757]"></span>
          </span>
          <span className="text-[10px] uppercase tracking-widest text-[#5C5C5C] font-semibold">
            Ideas into useful software
          </span>
        </div>

        <h1 className={`text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-serif font-medium text-[#191919] tracking-tight mb-8 max-w-5xl leading-[1] transition-all duration-700 delay-100 ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          Build Smarter with
          <br />
          <span className="text-[#D97757] italic">
            An AI Developer.
          </span>
        </h1>

        <p className={`text-[#5C5C5C] text-sm md:text-base max-w-2xl mx-auto mb-6 leading-relaxed font-normal transition-all duration-700 delay-200 ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          Websites, automations, data pipelines, and custom AI systems, designed and built around your business.
        </p>

        <HeroIntroVideo />

        <div className={`flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-center transition-all duration-700 delay-300 ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <button
            id="home-discovery"
            onClick={scrollToContact}
            className="relative group overflow-hidden rounded-full bg-[#191919] hover:bg-[#333] transition-all hover-mini shadow-lg shadow-[#191919]/10 w-full sm:w-auto"
          >
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full px-8 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#F3F1E7]">
              Let's build together
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
                <path d="m9 18 6-6-6-6"></path>
              </svg>
            </span>
          </button>
        </div>
        <p className="text-sm max-w-2xl mt-6 leading-relaxed">
          Work directly with me to turn your ideas into useful, well-designed software, with the speed of AI and an experienced developer guiding the work.
        </p>
      </section>
    </div>
  )
}
