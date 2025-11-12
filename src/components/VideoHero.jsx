import { ChevronDown } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export default function VideoHero() {
  const videoRef = useRef(null)
  const [isMobile, setIsMobile] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Ensure video plays on mobile
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
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Background Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover z-0"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onLoadedData={() => setVideoLoaded(true)}
        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1920 1080'%3E%3Crect fill='%23000000' width='1920' height='1080'/%3E%3C/svg%3E"
      >
        <source
          src="https://res.cloudinary.com/doevp9obh/video/upload/v1751630378/social_u7865913127_httpss.mj.runfy9I6hP3bjY_A_serene_cinematic_anima_3732f431-944f-4ee3-9b66-c82c1462de47_1_vjttzg.mp4"
          type="video/mp4"
        />
      </video>

      {/* Video Overlay */}
      <div className="absolute inset-0 bg-black/20 z-0" />

      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/10 backdrop-blur-sm py-3 sm:py-4 px-4 sm:px-6">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="text-white font-serif text-lg sm:text-xl">GB Automation</div>

          <div className="flex items-center gap-4 sm:gap-8 text-white/90 font-sans text-xs sm:text-sm font-light">
            <a
              href="#features"
              className="hover:text-white hover:scale-105 transition-colors duration-300 min-h-[44px] flex items-center"
              aria-label="View features"
            >
              Features
            </a>
            <a
              href="#contact"
              className="hover:text-white hover:scale-105 transition-colors duration-300 min-h-[44px] flex items-center"
              aria-label="Contact us"
            >
              Contact
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Content */}
      <div className="relative z-10 flex items-center min-h-screen pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="max-w-2xl fade-in">
            <h1 className="font-serif text-white text-3xl sm:text-4xl lg:text-6xl font-normal tracking-tight mb-6 sm:mb-8 leading-tight">
              Build Smarter and Faster with an AI Developer <em className="text-cyan-400">That Codes in Your Vibe</em>
            </h1>

            {/* Hero Subheading */}
            <p className="font-sans text-gray-200 text-base sm:text-lg lg:text-xl font-light leading-relaxed mb-8 sm:mb-12 max-w-xl">
              90-Day Agentic Systems Program: Internal tools, external products, and autonomous AI workflows built for your business
            </p>

            <button
              onClick={scrollToContact}
              className="bg-white text-gray-900 font-sans font-medium px-6 sm:px-8 py-4 sm:py-4 rounded-lg text-sm sm:text-base hover:bg-gray-100 hover:scale-105 hover:shadow-lg transition-all duration-300 w-full sm:w-auto min-h-[48px] active:scale-95 touch-manipulation"
              aria-label="Schedule discovery call"
            >
              Schedule Discovery Call
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-center items-center">
            <p className="font-sans text-white/70 text-xs font-light">GB Automation</p>
          </div>
        </div>
      </div>
    </div>
  )
}
