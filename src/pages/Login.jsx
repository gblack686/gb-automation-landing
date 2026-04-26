import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { ArrowLeft } from 'lucide-react';

function getNextPath(search) {
  const params = new URLSearchParams(search);
  const next = params.get('next');
  if (!next || !next.startsWith('/')) return '/apps';
  return next;
}

/**
 * Redirects to ?next= (or /apps) once the user is authenticated.
 */
function PostAuthRedirect() {
  const { authStatus } = useAuthenticator((ctx) => [ctx.authStatus]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (authStatus === 'authenticated') {
      navigate(getNextPath(location.search), { replace: true });
    }
  }, [authStatus, location.search, navigate]);

  return null;
}

export default function Login() {
  return (
    <div className="min-h-screen bg-[#F3F1E7] selection:bg-[#D97757] selection:text-white">
      <header className="py-10 border-b border-[#D6D4C8]/60">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#191919]/60 hover:text-[#D97757]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to home
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#D97757]/20 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-[#D97757] rounded-full"></div>
            </div>
            <span className="text-xs font-serif font-semibold text-[#191919] tracking-widest uppercase">
              GB Automation
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase">
            Restricted Access
          </span>
          <h1 className="text-3xl font-serif font-medium text-[#191919] tracking-tight mt-2 mb-3">
            Sign in to continue
          </h1>
          <p className="text-sm text-[#191919]/60 leading-relaxed">
            Apps and artifacts are private. Sign in with your Google account or
            email to view the catalog.
          </p>
        </div>

        <div className="bg-white border border-[#D6D4C8] rounded-lg p-6 shadow-sm">
          <Authenticator
            hideSignUp={true}
            loginMechanisms={['email']}
          >
            <PostAuthRedirect />
          </Authenticator>
        </div>

        <p className="text-center text-[10px] uppercase tracking-widest text-[#191919]/40 mt-6">
          New accounts are admin-created.
        </p>
      </main>
    </div>
  );
}
