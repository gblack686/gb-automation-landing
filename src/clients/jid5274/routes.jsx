import { ExternalLink } from 'lucide-react';

const archonPath = '/clients/jid5274/archon/';

export default function Jid5274Portal() {
  return (
    <div className="min-h-screen bg-[#F3F1E7] text-[#191919]">
      <header className="flex items-center justify-between gap-4 border-b border-[#D6D4C8] bg-[#F3F1E7] px-5 py-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#D97757]">
            Practice Management Consultants
          </p>
          <h1 className="font-serif text-xl font-semibold">Jason Diaz Portal</h1>
        </div>
        <a
          href={archonPath}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-[#D6D4C8] px-3 py-2 text-sm font-semibold text-[#191919]/75 hover:border-[#D97757] hover:text-[#D97757]"
        >
          <ExternalLink className="h-4 w-4" />
          Open
        </a>
      </header>
      <iframe
        title="Jason Diaz Archon"
        src={archonPath}
        className="block h-[calc(100vh-73px)] w-full border-0 bg-white"
      />
    </div>
  );
}
