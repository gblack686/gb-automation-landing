import { ArrowRight, PlayCircle } from 'lucide-react';
import { CLIENT_ACCESS_GATEWAY } from '../lib/clientAccess';

/** Entry page for invite-only YouTube Intel clients. The button starts sign-in at the gateway,
 * which comes straight back to /workspace/handoff. The group check here is a convenience only;
 * the gateway checks the token, groups, invitation and workspace on the server. */
export default function Workspace() {
  return (
    <div className="min-h-screen bg-[#F3F1E7] selection:bg-[#D97757] selection:text-white">
      <main className="max-w-2xl mx-auto px-6 py-20">
        <p className="text-xs uppercase tracking-widest text-[#191919]/50 mb-4">YouTube Intel</p>
        <h1 className="text-4xl font-serif text-[#191919] mb-4">Your workspace</h1>
        <p className="text-[#191919]/70 mb-10 leading-relaxed">
          Your workspace runs on its own: scans of your chosen channels, saved reports, and questions you can ask about them.
        </p>
        <a
          href={`${CLIENT_ACCESS_GATEWAY}/auth/start`}
          className="inline-flex items-center gap-2 rounded-full bg-[#191919] text-[#F3F1E7] px-6 py-3 text-sm hover:bg-[#D97757] transition-colors"
        >
          <PlayCircle size={18} aria-hidden="true" /> Open my workspace <ArrowRight size={16} aria-hidden="true" />
        </a>
        <p className="mt-6 text-xs text-[#191919]/50">Sessions end after 12 hours, or 2 hours without use.</p>
      </main>
    </div>
  );
}
