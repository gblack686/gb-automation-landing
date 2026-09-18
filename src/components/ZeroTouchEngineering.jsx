import { createElement } from 'react';
import { ArrowUpRight } from 'lucide-react';
import tiles from '../data/zeroTouchTiles.json';

export default function ZeroTouchEngineering() {
  return (
    <section id="zero-touch" aria-labelledby="zero-touch-heading" className="py-24 px-6 border-b border-[#D6D4C8]/60">
      <div className="max-w-6xl mx-auto">
        <div className="zero-touch-heading">
          <h2 id="zero-touch-heading" className="text-4xl font-serif font-medium tracking-tight">Zero Touch Engineering</h2>
          <a href="/zero-touch-engineering.html" className="home-text-link">Explore the approach <ArrowUpRight size={16} aria-hidden="true" /></a>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiles.map((tile, index) => (
            <article className="zero-touch-tile glass-panel hover-shiny" key={tile.title}>
              <div className="zero-touch-icon" aria-hidden="true">
                <svg {...tile.icon.attrs}>
                  {tile.icon.children.map((element, key) => createElement(element.tag, { ...element.attrs, key }))}
                </svg>
              </div>
              <span className="home-eyebrow">{String(index + 1).padStart(2, '0')} / Metaphor</span>
              <h3 className="text-xl font-serif font-medium mt-3 mb-4">{tile.title}</h3>
              <p className="text-sm text-[#5C5C5C] leading-relaxed">{tile.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
