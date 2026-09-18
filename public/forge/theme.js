// Vanilla adapter for landing ParticleBackground.jsx; the scene itself is reused.
(() => {
  const background = document.querySelector('.particle-background');
  const host = document.querySelector('.particle-canvas');
  const toggle = document.getElementById('motion-toggle');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let scene, loading = false, failed = false, paused = false;
  function fallback() {
    failed = true;
    scene?.dispose();
    background.dataset.ready = 'false';
    toggle.hidden = true;
  }
  async function syncMotion() {
    if (failed) return;
    const playing = !reducedMotion.matches && !document.hidden && !paused;
    if (scene) {
      scene.setPlaying(playing);
      background.dataset.ready = String(!reducedMotion.matches);
      toggle.hidden = reducedMotion.matches;
      toggle.textContent = paused ? 'Play background' : 'Pause background';
      toggle.setAttribute('aria-pressed', String(paused));
      return;
    }
    // Same poster as the homepage; no Three.js download for reduced motion.
    if (!playing || loading) return;
    loading = true;
    try {
      const { createParticleScene } = await import('./particle-scene.js');
      scene = await createParticleScene(host, fallback);
      if (failed) { scene.dispose(); return; }
      await syncMotion();
    } catch { fallback(); }
  }
  toggle.addEventListener('click', () => { paused = !paused; syncMotion(); });
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('pagehide', () => scene?.setPlaying(false));
  window.addEventListener('pageshow', event => { if (event.persisted) syncMotion(); });
  setTimeout(syncMotion, 150);
})();
