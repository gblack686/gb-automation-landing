import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';
import { LogOut } from 'lucide-react';

export default function SignOutButton({ className = '' }) {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleClick() {
    setBusy(true);
    try {
      await signOut();
    } catch (e) {
      console.warn('sign out failed', e);
    } finally {
      navigate('/');
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#191919]/60 hover:text-[#D97757] transition-colors disabled:opacity-50 ${className}`}
      aria-label="Sign out"
    >
      <LogOut className="w-3.5 h-3.5" />
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
