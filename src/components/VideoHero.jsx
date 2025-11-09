import { ChevronDown } from "lucide-react"

export default function VideoHero() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Background Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover z-0"
        autoPlay
        muted
        loop
        playsInline
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
            <a href="#features" className="hover:text-white hover:scale-105 transition-colors duration-300">
              Features
            </a>
            <a href="#contact" className="hover:text-white hover:scale-105 transition-colors duration-300">
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
              className="bg-white text-gray-900 font-sans font-medium px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-sm sm:text-base hover:bg-gray-100 hover:scale-105 hover:shadow-lg transition-all duration-300 w-full sm:w-auto"
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
