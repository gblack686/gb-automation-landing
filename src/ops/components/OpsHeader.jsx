import { Link, NavLink } from 'react-router-dom';
import { Activity, LogOut, ShieldCheck } from 'lucide-react';
import SignOutButton from '../../components/SignOutButton';

const navItems = [
  { label: 'Overview', to: '/ops' },
  { label: 'Mac Mini', to: '/ops/mac-mini' },
  { label: 'Systems', to: '/ops/systems' },
  { label: 'Runs', to: '/ops/runs' },
  { label: 'Observability', to: '/ops/observability' },
  { label: 'Kanban', to: '/ops/kanban' },
  { label: 'Data', to: '/ops/data' },
  { label: 'Capabilities', to: '/ops/capabilities' },
  { label: 'Supabase', to: '/ops/supabase' },
];

export default function OpsHeader() {
  return (
    <header className="border-b border-[#D6D4C8]/70 bg-[#F3F1E7]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <Link to="/" className="flex min-h-0 items-center gap-3" aria-label="GB Automation home">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#D6D4C8] bg-[#191919]">
            <Activity className="h-4 w-4 text-[#F3F1E7]" />
          </span>
          <span>
            <span className="block text-xs font-semibold uppercase text-[#191919]/50">
              Operations
            </span>
            <span className="block font-serif text-xl text-[#191919]">Mac Mini Mirror</span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex max-w-full overflow-x-auto rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/70 p-1 text-xs font-semibold uppercase">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/ops'}
                className={({ isActive }) =>
                  `min-h-0 whitespace-nowrap rounded px-3 py-2 transition-colors ${
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
          <Link
            to="/clients/gbautomation"
            className="inline-flex min-h-0 items-center gap-2 rounded-md border border-[#D6D4C8] px-3 py-2 text-xs font-semibold uppercase text-[#191919]/60 hover:border-[#D97757] hover:text-[#D97757]"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Portal
          </Link>
          <span className="hidden h-4 w-px bg-[#D6D4C8] sm:block" aria-hidden="true" />
          <div className="inline-flex items-center gap-1">
            <LogOut className="h-3.5 w-3.5 text-[#191919]/40" aria-hidden="true" />
            <SignOutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
