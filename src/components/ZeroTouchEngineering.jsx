import { createElement, useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import tiles from '../data/zeroTouchTiles.json';

// One motion clip per metaphor card, in card order (01-09). Files live in public/media/zero-touch/.
const CLIPS = ['air-traffic', 'review-desk', 'factory-floor', 'senior-associate', 'approval-queue', 'operating-room', 'ai-factory', 'pit-crew', 'self-driving'];
const FLIP_MS = 800;   // matches the CSS transition
const REST_MS = 500;   // pause between one card turning back and the next turning over

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function ZeroTouchEngineering() {
  const sectionRef = useRef(null);
  const videos = useRef([]);
  const timers = useRef([]);
  const [inView, setInView] = useState(false);
  const [active, setActive] = useState(-1); // index of the card showing its back, -1 for none
  const [reduced, setReduced] = useState(reducedMotion);
  const next = useRef(0);

  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(media.matches);
    media.addEventListener('change', onChange);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => { observer.disconnect(); media.removeEventListener('change', onChange); clearTimers(); };
  }, []);

  // Auto sequence: while the section is on screen, turn the cards over one at a time.
  useEffect(() => {
    if (!inView || reduced || active !== -1) return undefined;
    const t = setTimeout(() => setActive(next.current), REST_MS);
    return () => clearTimeout(t);
  }, [inView, reduced, active]);

  // Play the clip on the card that is turned over; stop every other clip.
  useEffect(() => {
    videos.current.forEach((video, i) => {
      if (!video || i === active) return;
      video.pause();
    });
    const video = videos.current[active];
    if (!video) return undefined;
    if (!inView) { video.pause(); return undefined; }
    const t = setTimeout(() => { video.currentTime = 0; video.play().catch(() => {}); }, reduced ? 0 : FLIP_MS * 0.6);
    return () => clearTimeout(t);
  }, [active, inView, reduced]);

  function finish(index) {
    if (reduced || index !== active) return;
    later(() => {
      next.current = (index + 1) % tiles.length;
      setActive(-1);
    }, 600);
  }

  function toggle(index) {
    clearTimers();
    next.current = (index + 1) % tiles.length;
    setActive((current) => (current === index ? -1 : index));
  }

  return (
    <section ref={sectionRef} id="zero-touch" aria-labelledby="zero-touch-heading" className="py-24 px-6 border-b border-[#D6D4C8]/60">
      <div className="max-w-6xl mx-auto">
        <div className="zero-touch-heading">
          <h2 id="zero-touch-heading" className="text-4xl font-serif font-medium tracking-tight">Zero Touch Engineering</h2>
          <a href="/zero-touch-engineering.html" className="home-text-link">Explore the approach <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiles.map((tile, index) => {
            const flipped = active === index;
            const slug = CLIPS[index];
            return (
              <article className={`zero-touch-card${flipped ? ' is-flipped' : ''}`} key={tile.title} onClick={() => toggle(index)}>
                <div className="zero-touch-inner">
                  <div className="zero-touch-face zero-touch-tile glass-panel hover-shiny" aria-hidden={flipped}>
                    <div className="zero-touch-icon" aria-hidden="true">
                      <svg {...tile.icon.attrs}>
                        {tile.icon.children.map((element, key) => createElement(element.tag, { ...element.attrs, key }))}
                      </svg>
                    </div>
                    <span className="home-eyebrow">{String(index + 1).padStart(2, '0')} / Metaphor</span>
                    <h3 className="text-xl font-serif font-medium mt-3 mb-4">{tile.title}</h3>
                    <p className="text-sm text-[#5C5C5C] leading-relaxed">{tile.description}</p>
                  </div>
                  <div className="zero-touch-face zero-touch-back" aria-hidden={!flipped}>
                    <video
                      ref={(el) => { videos.current[index] = el; }}
                      src={`/media/zero-touch/${slug}.mp4`}
                      poster={`/media/zero-touch/${slug}.jpg`}
                      muted
                      playsInline
                      preload="none"
                      width="540"
                      height="750"
                      aria-label={`${tile.title}: animated illustration`}
                      onEnded={() => finish(index)}
                    />
                  </div>
                </div>
                <button type="button" className="sr-only" aria-pressed={flipped} onClick={(event) => { event.stopPropagation(); toggle(index); }}>
                  {flipped ? `Show the ${tile.title} description` : `Show the ${tile.title} animation`}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
