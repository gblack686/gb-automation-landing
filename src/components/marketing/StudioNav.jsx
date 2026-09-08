import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { discoveryUrl } from '../../data/marketingContent';

export default function StudioNav() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);
  const navRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const closeOutside = (event) => {
      if (!navRef.current?.contains(event.target)) setOpen(false);
    };
    const desktop = window.matchMedia('(min-width: 901px)');
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOutside);
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, [open]);

  const followAnchor = (event) => {
    setOpen(false);
    const target = document.querySelector(event.currentTarget.hash);
    // Move keyboard focus into the destination when the disclosure closes.
    target?.focus({ preventScroll: true });
  };

  return (
    <header className="studio-header" ref={navRef}>
      <a className="studio-brand" href="#top" aria-label="GB Automation home">
        <img src="/marketing/gb-logo.webp" width="48" height="48" alt="" />
        <span>GB<span className="brand-light">AUTOMATION</span><span className="brand-period">●</span></span>
      </a>
      <button className="studio-menu-toggle" type="button" ref={toggleRef} aria-expanded={open} aria-controls="studio-navigation" onClick={() => setOpen(!open)}>
        {open ? 'Close' : 'Menu'}{open ? <X size={19} /> : <Menu size={19} />}
      </button>
      <nav id="studio-navigation" aria-label="Main navigation" className={`studio-nav ${open ? 'is-open' : ''}`}>
        <div className="studio-nav-sections">
          {[['Work', '#work'], ['Systems', '#systems'], ['Approach', '#approach'], ['About', '#about']].map(([label, href]) => <a key={href} href={href} onClick={followAnchor}>{label}</a>)}
        </div>
        <a className="studio-client-link" href="/login">Client sign in</a>
        <a className="studio-nav-cta" href={discoveryUrl} target="_blank" rel="noreferrer">Let’s talk <ArrowUpRight size={17} /></a>
      </nav>
    </header>
  );
}
