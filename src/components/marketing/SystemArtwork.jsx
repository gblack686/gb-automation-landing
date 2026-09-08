import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

// Original contour geometry: complete as a static SVG, with optional CSS motion.
export default function SystemArtwork() {
  const artworkRef = useRef(null);
  const [canAnimate, setCanAnimate] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let inView = false;
    const sync = () => {
      setReduced(preference.matches);
      setCanAnimate(inView && !document.hidden && !preference.matches);
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    }, { threshold: 0.1 });
    if (artworkRef.current) observer.observe(artworkRef.current);
    document.addEventListener('visibilitychange', sync);
    preference.addEventListener('change', sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      preference.removeEventListener('change', sync);
    };
  }, []);

  return (
    <div className="system-artwork" ref={artworkRef} data-motion={canAnimate && !paused ? 'playing' : 'paused'}>
      <div className="art-coordinate art-coordinate-top"><span>CONTEXT → CONNECTION → ACTION</span><span>FIG. 01</span></div>
      <svg className="system-sculpture" viewBox="0 0 600 580" fill="none" role="img" aria-label="Interconnected terracotta contours forming a flowing system">
        <defs>
          <linearGradient id="studio-contour" x1="90" y1="80" x2="500" y2="500" gradientUnits="userSpaceOnUse"><stop stopColor="#B4563A" /><stop offset=".5" stopColor="#D97757" /><stop offset="1" stopColor="#713D2D" /></linearGradient>
          <radialGradient id="studio-art-wash"><stop stopColor="#D97757" stopOpacity=".14" /><stop offset="1" stopColor="#D97757" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx="300" cy="290" r="270" fill="url(#studio-art-wash)" />
        <g className="sculpture-contours" stroke="url(#studio-contour)" strokeWidth="1.15">
          {Array.from({ length: 43 }, (_, i) => {
            const t = i / 42;
            return <path key={i} d={`M ${100 + t * 130} ${150 - t * 70} C ${300 + t * 100} ${-30 + t * 85}, ${600 - t * 65} ${180 + t * 180}, ${449 - t * 80} ${400 + t * 48} C ${290 - t * 50} ${624 - t * 50}, ${16 + t * 120} ${376 + t * 45}, ${131 + t * 120} ${263 + t * 15} C ${222 + t * 62} ${168 + t * 65}, ${490 - t * 70} ${246 + t * 75}, ${362 - t * 53} ${365 - t * 63} C ${292 - t * 40} ${446 - t * 100}, ${30 + t * 90} ${240 - t * 40}, ${100 + t * 130} ${150 - t * 70} Z`} />;
          })}
        </g>
        <g stroke="#82796D" strokeWidth=".75" opacity=".5"><path d="M35 40h14m-7-7v14M551 40h14m-7-7v14M35 535h14m-7-7v14M551 535h14m-7-7v14" /><path d="M42 70v435M558 70v435" strokeDasharray="1 7" /></g>
      </svg>
      <div className="art-coordinate art-coordinate-bottom"><span>A SYSTEM BUILT AROUND YOUR WORK</span><button className="art-motion-toggle" type="button" disabled={reduced} aria-label={reduced ? 'Artwork motion disabled by preference' : paused ? 'Play artwork motion' : 'Pause artwork motion'} onClick={() => setPaused(!paused)}>{reduced ? 'MOTION OFF' : paused ? <><Play size={10} /> PLAY MOTION</> : <><Pause size={10} /> PAUSE MOTION</>}</button></div>
    </div>
  );
}
