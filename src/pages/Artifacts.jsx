import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ArtifactsGallery from '../components/ArtifactsGallery';
import Footer from '../components/Footer';
import SignOutButton from '../components/SignOutButton';

function RegistryArtifacts() {
  const [manifest, setManifest] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/artifacts/manifest.json', { cache: 'no-cache' })
      .then((res) => {
        if (res.status === 404) return { artifacts: [] };
        if (!res.ok) throw new Error(`Manifest returned ${res.status}`);
        return res.json();
      })
      .then((data) => { if (!cancelled) setManifest(data); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Unable to load registry manifest'); });
    return () => { cancelled = true; };
  }, []);

  const artifacts = useMemo(() => {
    return [...(manifest?.artifacts || [])].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }, [manifest]);

  if (error) {
    return <p className="text-sm text-[#191919]/60">Registry manifest unavailable: {error}</p>;
  }

  if (!manifest) {
    return <p className="text-sm text-[#191919]/60">Loading registry artifacts...</p>;
  }

  if (!artifacts.length) {
    return <p className="text-sm text-[#191919]/60">No registry artifacts have been mirrored to the site yet.</p>;
  }

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
      {artifacts.map((artifact) => (
        <Link
          key={`${artifact.client}-${artifact.artifact_id}`}
          to={`/artifacts/${encodeURIComponent(artifact.client)}/${encodeURIComponent(artifact.artifact_id)}`}
          className="group rounded-3xl border border-[#D6D4C8] bg-white/70 p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#D97757]/50 hover:shadow-xl"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[#D97757] text-[11px] font-bold tracking-widest uppercase">{artifact.client}</span>
            <span className="rounded-full bg-[#D97757]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#D97757]">{artifact.type}</span>
          </div>
          <h3 className="mt-4 text-xl font-serif font-medium text-[#191919] group-hover:text-[#D97757]">
            {artifact.filename?.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')}
          </h3>
          <p className="mt-3 line-clamp-2 text-sm text-[#191919]/60">{artifact.project || artifact.artifact_id}</p>
          <div className="mt-5 text-[11px] uppercase tracking-widest text-[#191919]/40">{artifact.created_at || 'Published artifact'}</div>
        </Link>
      ))}
    </div>
  );
}

export default function Artifacts() {
  return (
    <div className="min-h-screen bg-[#F3F1E7] selection:bg-[#D97757] selection:text-white">
      <header className="py-10 border-b border-[#D6D4C8]/60">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 hover-mini" aria-label="GB Automation home">
            <div className="w-4 h-4 bg-[#D97757]/20 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-[#D97757] rounded-full"></div>
            </div>
            <span className="text-xs font-serif font-semibold text-[#191919] tracking-widest uppercase">GB Automation</span>
          </Link>

          <nav className="flex items-center gap-4 text-xs uppercase tracking-widest">
            <Link to="/apps" className="text-[#191919]/60 hover:text-[#D97757]">Apps</Link>
            <Link to="/artifacts" className="text-[#191919] font-bold border-b border-[#D97757] pb-0.5">Artifacts</Link>
            <Link to="/plan" className="text-[#191919]/60 hover:text-[#D97757]">Plan</Link>
            <span className="w-px h-3 bg-[#D6D4C8]" aria-hidden="true" />
            <SignOutButton />
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-12">
          <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase">Artifacts Feed</span>
          <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#191919] tracking-tight mt-2 mb-4">Everything the Agents Have Generated</h1>
          <p className="text-base text-[#191919]/70 max-w-2xl leading-relaxed">A unified feed of artifacts produced across apps and the production artifact registry.</p>
        </div>

        <section className="mb-16">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase">Registry</span>
              <h2 className="mt-2 text-2xl font-serif text-[#191919]">Published client artifacts</h2>
            </div>
          </div>
          <RegistryArtifacts />
        </section>

        <section>
          <div className="mb-6">
            <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase">Gallery</span>
            <h2 className="mt-2 text-2xl font-serif text-[#191919]">Generated media feed</h2>
          </div>
          <ArtifactsGallery />
        </section>
      </main>

      <Footer />
    </div>
  );
}
