import { useEffect, useRef, useState } from 'react';
import './ParticleBackground.css';

// A decorative, fixed background. Its design has no public controls or settings.
export default function ParticleBackground() {
  const hostRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let disposed = false;
    let loading = false;
    let failed = false;
    let scene;

    function fallback() {
      failed = true;
      scene?.dispose();
      if (!disposed) setReady(false);
    }

    async function syncMotion() {
      if (disposed || failed) return;
      const playing = !reducedMotion.matches && !document.hidden;
      if (scene) {
        scene.setPlaying(playing);
        setReady(!reducedMotion.matches);
        return;
      }
      // Reduced-motion visitors see the still image without downloading Three.js.
      if (!playing || loading) return;
      loading = true;
      try {
        const { createParticleScene } = await import('../lib/gbParticleScene');
        if (disposed) return;
        const created = await createParticleScene(host, fallback);
        if (disposed) {
          created.dispose();
          return;
        }
        scene = created;
        setReady(!reducedMotion.matches);
        scene.setPlaying(!reducedMotion.matches && !document.hidden);
      } catch {
        fallback();
      }
    }

    // Let the homepage content paint before loading the optional motion layer.
    const timer = window.setTimeout(syncMotion, 150);
    reducedMotion.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncMotion);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      reducedMotion.removeEventListener('change', syncMotion);
      document.removeEventListener('visibilitychange', syncMotion);
      scene?.dispose();
    };
  }, []);

  return (
    <div className="particle-background" data-ready={ready} aria-hidden="true">
      <div className="particle-scene-surface">
        <img className="particle-poster" src="/gb-particle-poster.jpg" alt="" />
        <div className="particle-canvas" ref={hostRef} />
      </div>
      <div className="particle-scrim" />
    </div>
  );
}
