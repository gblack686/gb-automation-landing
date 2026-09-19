import { lazy, Suspense, useState } from 'react';
import { ArrowUpRight, Grid2X2, Globe2 } from 'lucide-react';
import examples from '../data/showcaseGallery.json';
import './ArtifactGallery.css';

const GalleryGlobe = lazy(() => import('./GalleryGlobe'));
const categories = ['All', ...new Set(examples.map((item) => item.category))];
const atlas = 'https://expert-atlas--gbautoxyz.netlify.app';
const exampleUrl = (item) => `${atlas}/style-guide/library/${item.id}.html`;

export default function ArtifactGallery() {
  const [mode, setMode] = useState('grid');
  const [category, setCategory] = useState('All');
  const [expanded, setExpanded] = useState(false);
  const [notice, setNotice] = useState('');
  const filtered = category === 'All' ? examples : examples.filter((item) => item.category === category);
  const visible = expanded ? filtered : filtered.slice(0, 6);

  function showMode(next) {
    setMode(next);
    setNotice('');
  }

  return (
    <section id="gallery" aria-labelledby="gallery-heading" className="artifact-gallery py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="gallery-heading">
          <div>
            <span className="home-eyebrow">The gallery</span>
            <h2 id="gallery-heading" className="text-4xl md:text-5xl font-serif font-medium tracking-tight mt-4 mb-5">See what we can build.</h2>
            <p>Websites, dashboards, agent workspaces, and visual stories. Explore a selection of interactive design examples from the GBAutomation library.</p>
          </div>
          <a className="home-text-link" href={`${atlas}/#view=gallery`} target="_blank" rel="noopener noreferrer">Explore the full gallery <ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
        </div>

        <div className="gallery-toolbar">
          <div className="gallery-filters" role="group" aria-label="Example categories">
            {categories.map((name) => <button type="button" key={name} aria-pressed={category === name} onClick={() => { setCategory(name); setExpanded(false); }}>{name}</button>)}
          </div>
          <div className="gallery-view-switch" role="group" aria-label="Gallery view">
            <button type="button" aria-pressed={mode === 'grid'} onClick={() => showMode('grid')}><Grid2X2 size={15} aria-hidden="true" /> Grid</button>
            <button type="button" aria-pressed={mode === 'globe'} onClick={() => showMode('globe')}><Globe2 size={15} aria-hidden="true" /> Globe</button>
          </div>
        </div>
        <p className="gallery-count" role="status">{mode === 'grid' ? visible.length : filtered.length} of {filtered.length} examples{category !== 'All' ? ` · ${category}` : ' · 6 categories'}</p>
        {notice && <p className="gallery-notice" role="status">{notice}</p>}

        {mode === 'globe' ? (
          <Suspense fallback={<div className="gallery-loading" role="status">Opening the globe…</div>}>
            <GalleryGlobe key={category} items={filtered} onUnavailable={() => { setNotice('Globe view is unavailable in this browser. Explore the examples in the grid.'); setMode('grid'); }} />
          </Suspense>
        ) : (
          <>
            <div className="gallery-grid">
              {visible.map((item) => (
                <a className="gallery-card" key={item.id} href={exampleUrl(item)} target="_blank" rel="noopener noreferrer">
                  <div className="gallery-card-image"><img src={`/images/gallery/${item.id}.jpg`} alt="" width="1200" height="800" loading="lazy" decoding="async" /><span>Explore example <ArrowUpRight size={15} aria-hidden="true" /></span></div>
                  <div className="gallery-card-copy"><span className="gallery-category">{item.category}</span><h3>{item.title}<ArrowUpRight size={17} aria-hidden="true" /></h3><p>{item.description}</p><span className="sr-only">Opens in a new tab.</span></div>
                </a>
              ))}
            </div>
            {filtered.length > 6 && <button className="gallery-show-more" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer examples' : `Show all ${filtered.length} examples`}</button>}
          </>
        )}
        <p className="gallery-footnote">Design examples from our style guide. Explore an idea, then let’s make it yours.</p>
      </div>
    </section>
  );
}
