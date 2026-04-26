import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from 'aws-amplify/auth';

/**
 * Gate a route: if the user has no Cognito session, redirect to /login
 * with the originally requested path stashed in `?next=`.
 */
export default function RequireAuth({ children }) {
  const [authState, setAuthState] = useState('checking'); // 'checking' | 'authed' | 'unauthed'
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then(() => { if (!cancelled) setAuthState('authed'); })
      .catch(() => { if (!cancelled) setAuthState('unauthed'); });
    return () => { cancelled = true; };
  }, [location.pathname]);

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

  return children;
}
