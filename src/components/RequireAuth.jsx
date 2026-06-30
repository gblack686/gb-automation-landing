import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { fetchAuthSession, getCurrentUser, signOut } from 'aws-amplify/auth';

/**
 * Gate a route: if the user has no Cognito session, redirect to /login
 * with the originally requested path stashed in `?next=`.
 */
export default function RequireAuth({ children, allowedGroups = [], allowedEmails = [] }) {
  const [authState, setAuthState] = useState('checking'); // 'checking' | 'authed' | 'unauthed'
  const [signedInEmail, setSignedInEmail] = useState('');
  const location = useLocation();
  const allowedGroupsKey = allowedGroups.join('|');
  const allowedEmailsKey = allowedEmails.map((email) => email.toLowerCase()).join('|');

  useEffect(() => {
    let cancelled = false;
    const localDevBypass = import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (localDevBypass) {
      setAuthState('authed');
      return () => { cancelled = true; };
    }

    const requiredGroups = allowedGroupsKey ? allowedGroupsKey.split('|') : [];
    const requiredEmails = allowedEmailsKey ? allowedEmailsKey.split('|') : [];
    getCurrentUser()
      .then(async () => {
        if (!requiredGroups.length && !requiredEmails.length) {
          if (!cancelled) setAuthState('authed');
          return;
        }

        const session = await fetchAuthSession();
        const groups = session.tokens?.accessToken?.payload?.['cognito:groups'] || [];
        const email = String(session.tokens?.idToken?.payload?.email || '').toLowerCase();
        if (!cancelled) setSignedInEmail(email);
        const hasGroup = requiredGroups.some((group) => groups.includes(group));
        const hasEmail = requiredEmails.includes(email);
        if (!cancelled) setAuthState(hasGroup || hasEmail ? 'authed' : 'forbidden');
      })
      .catch(() => { if (!cancelled) setAuthState('unauthed'); });
    return () => { cancelled = true; };
  }, [allowedEmailsKey, allowedGroupsKey, location.pathname]);

  if (authState === 'checking') {
    return (
      <div className="min-h-screen bg-[#F3F1E7] flex items-center justify-center">
        <p className="text-xs uppercase tracking-widest text-[#191919]/40">Authenticating…</p>
      </div>
    );
  }

  if (authState === 'unauthed') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (authState === 'forbidden') {
    const next = encodeURIComponent(location.pathname + location.search);
    const switchAccount = async () => {
      await signOut();
      window.location.assign(`/login?next=${next}`);
    };

    return (
      <div className="min-h-screen bg-[#F3F1E7] flex items-center justify-center px-6">
        <div className="max-w-md rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/70 p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#D97757]">403</p>
          <h1 className="mt-3 font-serif text-3xl text-[#191919]">Tenant access required</h1>
          <p className="mt-3 text-sm leading-6 text-[#191919]/65">
            Your account is signed in, but it is not assigned to this tenant group.
          </p>
          {signedInEmail && (
            <p className="mt-3 font-mono text-xs text-[#191919]/45">
              Signed in as {signedInEmail}
            </p>
          )}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={switchAccount}
              className="rounded-md border border-[#191919] bg-[#191919] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#F3F1E7] transition hover:border-[#D97757] hover:bg-[#D97757]"
            >
              Sign out
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="rounded-md border border-[#D6D4C8] bg-white/55 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#191919]/60 transition hover:border-[#D97757] hover:text-[#D97757]"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
