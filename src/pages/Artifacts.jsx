import { Link } from 'react-router-dom';
import ArtifactsGallery from '../components/ArtifactsGallery';
import Footer from '../components/Footer';
import SignOutButton from '../components/SignOutButton';

export default function Artifacts() {
  return (
    <div className="min-h-screen bg-[#F3F1E7] selection:bg-[#D97757] selection:text-white">
      <header className="py-10 border-b border-[#D6D4C8]/60">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 hover-mini"
            aria-label="GB Automation home"
          >
            <div className="w-4 h-4 bg-[#D97757]/20 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-[#D97757] rounded-full"></div>
            </div>
            <span className="text-xs font-serif font-semibold text-[#191919] tracking-widest uppercase">
              GB Automation
            </span>
          </Link>

          <nav className="flex items-center gap-4 text-xs uppercase tracking-widest">
            <Link to="/apps" className="text-[#191919]/60 hover:text-[#D97757]">
              Apps
            </Link>
            <Link to="/artifacts" className="text-[#191919] font-bold border-b border-[#D97757] pb-0.5">
              Artifacts
            </Link>
            <Link to="/plan" className="text-[#191919]/60 hover:text-[#D97757]">
              Plan
            </Link>
            <span className="w-px h-3 bg-[#D6D4C8]" aria-hidden="true" />
            <SignOutButton />
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-12">
          <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase">
            Artifacts Feed
          </span>
          <h1 className="text-4xl md:text-5xl font-serif font-medium text-[#191919] tracking-tight mt-2 mb-4">
            Everything the Agents Have Generated
          </h1>
          <p className="text-base text-[#191919]/70 max-w-2xl leading-relaxed">
            A unified, time-sorted feed of every artifact produced across all apps —
            videos, images, GIFs, HTML mini-apps, JSON manifests. Filter by type or app.
          </p>
        </div>

        <ArtifactsGallery />
      </main>

      <Footer />
    </div>
  );
}
