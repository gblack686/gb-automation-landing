import { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { exchangeForm, handoffState } from '../lib/clientAccess';

const MESSAGES = {
  state_missing: 'This sign-in link is incomplete or was already used. Start again from your workspace page.',
  token_unavailable: 'We could not confirm your sign-in. Sign in again, then open your workspace.',
};

/** Gets a fresh ID token and posts it, with the gateway's single-use state, to the gateway.
 * The token is never logged, stored or put in a URL; the fragment is cleared before submitting. */
export default function WorkspaceHandoff() {
  const [error, setError] = useState('');
  // Read once, before the fragment is cleared (effects may run twice in development).
  const [state] = useState(() => handoffState(window.location.hash));

  useEffect(() => {
    let active = true;
    window.history.replaceState(null, '', window.location.pathname);
    if (!state) { setError('state_missing'); return undefined; }
    fetchAuthSession({ forceRefresh: true })
      .then((session) => {
        const token = session.tokens?.idToken?.toString();
        if (!active) return;
        if (!token) { setError('token_unavailable'); return; }
        const form = exchangeForm(document, token, state);
        document.body.appendChild(form);
        form.submit();
      })
      .catch(() => { if (active) setError('token_unavailable'); });
    return () => { active = false; };
  }, [state]);

  return (
    <div className="min-h-screen bg-[#F3F1E7] flex items-center justify-center px-6">
      {error ? (
        <div role="alert" className="max-w-md text-center">
          <p className="text-[#191919] mb-4">{MESSAGES[error]}</p>
          <p className="text-xs text-[#191919]/40 mb-6">{error}</p>
          <a href="/workspace" className="text-sm underline text-[#D97757]">Back to my workspace page</a>
        </div>
      ) : (
        <p role="status" className="text-xs uppercase tracking-widest text-[#191919]/40">Opening your workspace…</p>
      )}
    </div>
  );
}
