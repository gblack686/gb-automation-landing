import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { ArrowLeft, LockKeyhole, ShieldCheck } from 'lucide-react';

function getNextPath(search) {
  const params = new URLSearchParams(search);
  const next = params.get('next');
  if (!next || !next.startsWith('/')) return '/clients/smoke-client';
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
      <header className="border-b border-[#D6D4C8]/60 py-5">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex min-h-0 items-center gap-2 text-xs uppercase tracking-widest text-[#191919]/60 hover:text-[#D97757]"
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

      <main className="mx-auto grid min-h-[calc(100vh-88px)] max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[0.85fr_1fr]">
        <section className="max-w-xl">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-md border border-[#D6D4C8] bg-[#E6E4D9]">
            <LockKeyhole className="h-5 w-5 text-[#D97757]" />
          </div>
          <span className="text-[#D97757] text-xs font-bold tracking-widest uppercase">Restricted Access</span>
          <h1 className="mt-3 font-serif text-4xl font-medium leading-tight text-[#191919] md:text-5xl">
            Sign in to continue.
          </h1>
          <p className="mt-4 max-w-md text-base leading-7 text-[#191919]/65">
            Apps, artifacts, and client portals are private. Use your admin-created
            GBAutomation account to continue.
          </p>

          <div className="mt-8 grid max-w-md gap-3 text-sm text-[#191919]/65">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-[#D97757]" />
              <span>Protected by the existing Amplify Cognito user pool.</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-[#D97757]" />
              <span>Tenant group checks are available for client portals.</span>
            </div>
          </div>
        </section>

        <section className="login-auth-shell">
          <Authenticator
            hideSignUp={true}
            loginMechanisms={['email']}
          >
            <PostAuthRedirect />
          </Authenticator>

          <p className="mt-5 text-center text-[10px] uppercase tracking-widest text-[#191919]/40">
            New accounts are admin-created.
          </p>
        </section>
      </main>
    </div>
  );
}
