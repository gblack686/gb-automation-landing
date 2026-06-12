import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { tenantWorkspacePath } from './tenantDataAdapter';

export function WorkspaceLoading({ label = 'workspace' }) {
  return <p className="text-sm text-[#191919]/60">Loading {label}…</p>;
}

export function WorkspaceError({ title = 'Workspace data failed to load', error }) {
  return (
    <p className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      {title}: <code className="font-mono">{error}</code>
    </p>
  );
}

export function WorkspaceEmpty({ children }) {
  return (
    <p className="rounded-md border border-dashed border-[#D6D4C8] bg-white/40 p-6 text-sm text-[#191919]/55">
      {children}
    </p>
  );
}

export function WorkspaceBackLink({ slug, to = '', label = 'Workspace' }) {
  return (
    <Link
      to={tenantWorkspacePath(slug, to)}
      className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#191919]/60 hover:text-[#D97757]"
    >
      <ArrowLeft className="h-3 w-3" />
      {label}
    </Link>
  );
}
