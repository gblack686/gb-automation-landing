import { Link, NavLink } from 'react-router-dom';
import { LogOut, Flame } from 'lucide-react';
import SignOutButton from '../../../components/SignOutButton';

const navItems = [
  { label: 'Overview', to: '/clients/smoke-client' },
  { label: 'Schedules', to: '/clients/smoke-client/schedules' },
  { label: 'Runs', to: '/clients/smoke-client/runs' },
  { label: 'Board', to: '/clients/smoke-client/board' },
  { label: 'Catalog', to: '/clients/smoke-client/catalog' },
  { label: 'Jobs', to: '/clients/smoke-client/jobs' },
  { label: 'Traces', to: '/clients/smoke-client/traces' },
  { label: 'Lineage', to: '/clients/smoke-client/lineage' },
  { label: 'Visual', to: '/clients/smoke-client/visual' },
  { label: 'Tests', to: '/clients/smoke-client/tests' },
  { label: 'Data', to: '/clients/smoke-client/data' },
];

export default function PortalHeader() {
  return (
    <header className="border-b border-[#D6D4C8]/70 bg-[#F3F1E7]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <Link to="/" className="flex min-h-0 items-center gap-3" aria-label="GB Automation home">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#D6D4C8] bg-[#E6E4D9]">
            <Flame className="h-4 w-4 text-[#D97757]" />
          </span>
          <span>
            <span className="block text-xs font-semibold uppercase tracking-widest text-[#191919]/50">
              Client Portal
            </span>
            <span className="block font-serif text-xl text-[#191919]">Smoke Client</span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/70 p-1 text-xs font-semibold uppercase tracking-widest">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/clients/smoke-client'}
                className={({ isActive }) =>
                  `min-h-0 rounded px-3 py-2 transition-colors ${
                    isActive
                      ? 'bg-[#191919] text-[#F3F1E7]'
                      : 'text-[#191919]/60 hover:bg-white/50 hover:text-[#191919]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden h-4 w-px bg-[#D6D4C8] sm:block" aria-hidden="true" />
            <div className="inline-flex items-center gap-1">
              <LogOut className="h-3.5 w-3.5 text-[#191919]/40" aria-hidden="true" />
              <SignOutButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
