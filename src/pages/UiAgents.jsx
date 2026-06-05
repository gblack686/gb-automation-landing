import { Link } from 'react-router-dom';
import { ExternalLink, GitBranch } from 'lucide-react';
import SignOutButton from '../components/SignOutButton';

const uiAgentsPath = '/mini-apps/ui-agents/#/gbautomation/site';

export default function UiAgents() {
  return (
    <div className="min-h-screen bg-[#F3F1E7] text-[#191919] selection:bg-[#D97757] selection:text-white">
      <header className="border-b border-[#D6D4C8]/60 bg-[#F3F1E7] px-5 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link to="/apps" className="flex items-center gap-3 hover-mini" aria-label="Back to apps">
            <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#D6D4C8] bg-white">
              <GitBranch className="h-4 w-4 text-[#D97757]" />
            </span>
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-[#D97757]">
                UI Agents
              </span>
              <span className="block font-serif text-xl font-semibold">GB Automation Site Workspace</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <a
              href={uiAgentsPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-[#D6D4C8] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#191919]/70 transition hover:border-[#D97757] hover:text-[#D97757]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </a>
            <span className="hidden h-4 w-px bg-[#D6D4C8] sm:block" aria-hidden="true" />
            <SignOutButton />
          </div>
        </div>
      </header>

      <iframe
        title="UI Agents GB Automation workspace"
        src={uiAgentsPath}
        className="block h-[calc(100vh-65px)] w-full border-0 bg-white"
      />
    </div>
  );
}
