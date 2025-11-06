import { useRef, useEffect, useState } from 'react'

export default function ParticleHero() {
  const canvasRef = useRef(null)
  const mousePositionRef = useRef({ x: 0, y: 0 })
  const isTouchingRef = useRef(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      setIsMobile(window.innerWidth < 768)
    }

    updateCanvasSize()

    let particles = []
    let textImageData = null

    function createTextImage() {
      if (!ctx || !canvas) return 0

      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          ctx.fillStyle = 'white'
          ctx.save()

          // Scale the logo to fit nicely on screen
          const maxWidth = isMobile ? canvas.width * 0.6 : canvas.width * 0.4
          const maxHeight = isMobile ? canvas.height * 0.3 : canvas.height * 0.4

          const scale = Math.min(maxWidth / img.width, maxHeight / img.height)
          const width = img.width * scale
          const height = img.height * scale

          const x = (canvas.width - width) / 2
          const y = (canvas.height - height) / 2 - (isMobile ? 140 : 200) // Move logo up 2 line widths

          // Draw the image in white
          ctx.globalCompositeOperation = 'source-over'
          ctx.drawImage(img, x, y, width, height)

          ctx.restore()

          textImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          resolve(scale)
        }
        img.onerror = () => {
          // Fallback to text if image fails to load
          ctx.fillStyle = 'white'
          ctx.save()
          const fontSize = isMobile ? 180 : 300
          ctx.font = `bold ${fontSize}px Inter, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('GB', canvas.width / 2, canvas.height / 2)
          ctx.restore()
          textImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          resolve(fontSize)
        }
        // Set the image source to your logo
        img.src = '/gb-logo.png'
      })
    }

    function createParticle(scale) {
      if (!ctx || !canvas || !textImageData) return null

      const data = textImageData.data

      for (let attempt = 0; attempt < 100; attempt++) {
        const x = Math.floor(Math.random() * canvas.width)
        const y = Math.floor(Math.random() * canvas.height)

        if (data[(y * canvas.width + x) * 4 + 3] > 128) {
          // Cyan color for GB automation
          return {
            x: x,
            y: y,
            baseX: x,
            baseY: y,
            size: Math.random() * 1.5 + 0.5,
            color: 'white',
            scatteredColor: '#00DCFF', // Cyan accent
            life: Math.random() * 100 + 50
          }
        }
      }

      return null
    }

    function createInitialParticles(scale) {
      const baseParticleCount = 7000
      const particleCount = Math.floor(baseParticleCount * Math.sqrt((canvas.width * canvas.height) / (1920 * 1080)))
      for (let i = 0; i < particleCount; i++) {
        const particle = createParticle(scale)
        if (particle) particles.push(particle)
      }
    }

    let animationFrameId

    function animate(scale) {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'black'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const { x: mouseX, y: mouseY } = mousePositionRef.current
      const maxDistance = 240

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        const dx = mouseX - p.x
        const dy = mouseY - p.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance < maxDistance && (isTouchingRef.current || !('ontouchstart' in window))) {
          const force = (maxDistance - distance) / maxDistance
          const angle = Math.atan2(dy, dx)
          const moveX = Math.cos(angle) * force * 60
          const moveY = Math.sin(angle) * force * 60
          p.x = p.baseX - moveX
          p.y = p.baseY - moveY

          ctx.fillStyle = p.scatteredColor
        } else {
          p.x += (p.baseX - p.x) * 0.1
          p.y += (p.baseY - p.y) * 0.1
          ctx.fillStyle = 'white'
        }

        ctx.fillRect(p.x, p.y, p.size, p.size)

        p.life--
        if (p.life <= 0) {
          const newParticle = createParticle(scale)
          if (newParticle) {
            particles[i] = newParticle
          } else {
            particles.splice(i, 1)
            i--
          }
        }
      }

      const baseParticleCount = 7000
      const targetParticleCount = Math.floor(baseParticleCount * Math.sqrt((canvas.width * canvas.height) / (1920 * 1080)))
      while (particles.length < targetParticleCount) {
        const newParticle = createParticle(scale)
        if (newParticle) particles.push(newParticle)
      }

      animationFrameId = requestAnimationFrame(() => animate(scale))
    }

    createTextImage().then(scale => {
      createInitialParticles(scale)
      animate(scale)
    })

    const handleResize = () => {
      updateCanvasSize()
      createTextImage().then(newScale => {
        particles = []
        createInitialParticles(newScale)
      })
    }

    const handleMove = (x, y) => {
      mousePositionRef.current = { x, y }
    }

    const handleMouseMove = (e) => {
      handleMove(e.clientX, e.clientY)
    }

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        e.preventDefault()
        handleMove(e.touches[0].clientX, e.touches[0].clientY)
      }
    }

    const handleTouchStart = () => {
      isTouchingRef.current = true
    }

    const handleTouchEnd = () => {
      isTouchingRef.current = false
      mousePositionRef.current = { x: 0, y: 0 }
    }

    const handleMouseLeave = () => {
      if (!('ontouchstart' in window)) {
        mousePositionRef.current = { x: 0, y: 0 }
      }
    }

    window.addEventListener('resize', handleResize)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })
    canvas.addEventListener('mouseleave', handleMouseLeave)
    canvas.addEventListener('touchstart', handleTouchStart)
    canvas.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('touchmove', handleTouchMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchend', handleTouchEnd)
      cancelAnimationFrame(animationFrameId)
    }
  }, [isMobile])

  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="relative w-full h-screen flex flex-col items-center justify-center bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute top-0 left-0 touch-none"
        aria-label="Interactive particle effect with GB logo"
      />

      {/* Content overlay */}
      <div className="absolute bottom-32 md:bottom-40 text-center z-10 px-4 max-w-5xl">
        <p className="font-mono text-gray-300 text-lg sm:text-xl md:text-2xl lg:text-3xl mb-8 leading-relaxed">
          Build Smarter and Faster with an AI Developer
          <br />
          <span className="text-cyan-400">That Codes in Your Vibe</span>
        </p>

        <p className="text-gray-400 text-base sm:text-lg md:text-xl mb-10 max-w-3xl mx-auto">
          90-Day Agentic Systems Program: Internal tools, external products, and autonomous AI workflows built for your business
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
          <button
            onClick={scrollToContact}
            className="bg-cyan-400 text-black px-10 py-4 rounded-md text-base md:text-lg font-semibold hover:bg-cyan-300 transition-colors duration-300"
          >
            Schedule Discovery Call
          </button>
          <button
            onClick={scrollToFeatures}
            className="border border-gray-600 text-gray-300 px-10 py-4 rounded-md text-base md:text-lg font-semibold hover:border-cyan-400 hover:text-cyan-400 transition-colors duration-300"
          >
            Learn More
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-4 text-sm">
          <span className="bg-gray-900 text-gray-300 px-5 py-2.5 rounded-full border border-gray-800">3 Claude Agents</span>
          <span className="bg-gray-900 text-gray-300 px-5 py-2.5 rounded-full border border-gray-800">RAG + Knowledge Graph</span>
          <span className="bg-gray-900 text-gray-300 px-5 py-2.5 rounded-full border border-gray-800">AWS CloudFormation Kit</span>
          <span className="bg-gray-900 text-gray-300 px-5 py-2.5 rounded-full border border-gray-800">20+ hrs/week Support</span>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="animate-bounce">
          <svg className="w-6 h-6 text-gray-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </div>
    </div>
  )
}
