import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, RotateCcw } from 'lucide-react';

export default function GalleryGlobe({ items, onUnavailable }) {
  const hostRef = useRef(null);
  const sceneRef = useRef(null);
  const unavailableRef = useRef(onUnavailable);
  const [selected, setSelected] = useState(0);
  const [ready, setReady] = useState(false);
  const item = items[selected];

  useEffect(() => { unavailableRef.current = onUnavailable; }, [onUnavailable]);
  useEffect(() => {
    let disposed = false;
    import('../lib/artifactGlobe').then(({ createArtifactGlobe }) => {
      if (disposed) return;
      const scene = createArtifactGlobe(hostRef.current, items, setSelected, () => unavailableRef.current());
      if (disposed) { scene.dispose(); return; }
      sceneRef.current = scene;
      setReady(true);
    }).catch(() => { if (!disposed) unavailableRef.current(); });
    return () => { disposed = true; sceneRef.current?.dispose(); sceneRef.current = null; };
  }, [items]);

  useEffect(() => { if (ready) sceneRef.current?.select(selected); }, [selected, ready]);

  return (
    <div className="gallery-globe-panel">
      <div className="gallery-globe-stage">
        <div className="gallery-globe-canvas" ref={hostRef} aria-hidden="true" />
        {!ready && <p className="gallery-globe-loading" role="status">Loading examples…</p>}
        <div className="gallery-globe-controls" role="group" aria-label="Rotate the gallery">
          <button type="button" aria-label="Rotate globe left" disabled={!ready} onClick={() => sceneRef.current?.rotate(-1)}><ArrowLeft size={17} aria-hidden="true" /></button>
          <button type="button" aria-label="Reset globe view" disabled={!ready} onClick={() => sceneRef.current?.reset()}><RotateCcw size={16} aria-hidden="true" /></button>
          <button type="button" aria-label="Rotate globe right" disabled={!ready} onClick={() => sceneRef.current?.rotate(1)}><ArrowRight size={17} aria-hidden="true" /></button>
        </div>
        <p className="gallery-globe-instructions">Drag to rotate. Select a preview to explore.</p>
      </div>
      <div className="gallery-globe-detail">
        <label htmlFor="gallery-example">Choose an example</label>
        <select id="gallery-example" value={selected} onChange={(event) => setSelected(Number(event.target.value))}>{items.map((entry, index) => <option key={entry.id} value={index}>{entry.title}</option>)}</select>
        <img src={`/images/gallery/${item.id}.jpg`} alt="" width="1200" height="800" />
        <span className="gallery-category">{item.category}</span>
        <h3>{item.title}</h3><p>{item.description}</p>
        <a className="home-text-link" href={`https://expert-atlas--gbautoxyz.netlify.app/style-guide/library/${item.id}.html`} target="_blank" rel="noopener noreferrer">Open example <ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
        <div className="gallery-example-nav" role="group" aria-label="Browse gallery examples">
          <button type="button" aria-label="Previous example" onClick={() => setSelected((selected + items.length - 1) % items.length)}><ArrowLeft size={16} aria-hidden="true" /></button>
          <span aria-live="polite">{selected + 1} / {items.length}</span>
          <button type="button" aria-label="Next example" onClick={() => setSelected((selected + 1) % items.length)}><ArrowRight size={16} aria-hidden="true" /></button>
        </div>
      </div>
    </div>
  );
}
