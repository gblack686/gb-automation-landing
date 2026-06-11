import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import SignOutButton from '../components/SignOutButton';

export default function MallScanner() {
  return (
    <div className="min-h-screen bg-[#F3F1E7] selection:bg-[#D97757] selection:text-white">
      <header className="border-b border-[#D6D4C8]/60 py-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6">
          <Link to="/" className="flex items-center gap-2" aria-label="GB Automation home">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#D97757]/20">
              <div className="h-2 w-2 rounded-full bg-[#D97757]" />
            </div>
            <span className="font-serif text-xs font-semibold uppercase tracking-widest text-[#191919]">
              GB Automation
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-xs uppercase tracking-widest">
            <Link to="/apps" className="font-bold text-[#191919]">
              Apps
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-xs font-bold uppercase tracking-widest text-[#D97757]">The Mall Scanner</p>
        <h1 className="mt-3 font-serif text-5xl font-medium text-[#191919]">Brand Catalog Console</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[#191919]/70">
          This route is retained for the existing app gallery link. Live catalog data will be wired through
          the generated app manifest and client proof gate in a follow-up portal data contract.
        </p>
      </main>

      <Footer />
    </div>
  );
}
