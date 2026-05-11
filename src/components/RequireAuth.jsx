import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';

/**
 * Gate a route: if the user has no Cognito session, redirect to /login
 * with the originally requested path stashed in `?next=`.
 */
export default function RequireAuth({ children, allowedGroups = [], allowedEmails = [] }) {
  const [authState, setAuthState] = useState('checking'); // 'checking' | 'authed' | 'unauthed'
  const location = useLocation();
  const allowedGroupsKey = allowedGroups.join('|');
  const allowedEmailsKey = allowedEmails.map((email) => email.toLowerCase()).join('|');

  useEffect(() => {
    let cancelled = false;
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
    return (
      <div className="min-h-screen bg-[#F3F1E7] flex items-center justify-center px-6">
        <div className="max-w-md rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/70 p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#D97757]">403</p>
          <h1 className="mt-3 font-serif text-3xl text-[#191919]">Tenant access required</h1>
          <p className="mt-3 text-sm leading-6 text-[#191919]/65">
            Your account is signed in, but it is not assigned to this tenant group.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
