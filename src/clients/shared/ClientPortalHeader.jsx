import { Link, NavLink } from 'react-router-dom';
import { LogOut, ShieldCheck } from 'lucide-react';
import SignOutButton from '../../components/SignOutButton';

export default function ClientPortalHeader({ tenant }) {
  if (!tenant) return null;
  const { name, eyebrow, navItems = [], quickLinks = [] } = tenant;

  return (
    <header className="border-b border-[#D6D4C8]/70 bg-[#F3F1E7]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
        <Link
          to="/"
          className="flex min-h-0 items-center gap-3"
          aria-label="GB Automation home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#D6D4C8] bg-[#E6E4D9]">
            <ShieldCheck className="h-4 w-4 text-[#D97757]" />
          </span>
          <span>
            <span className="block text-xs font-semibold uppercase tracking-widest text-[#191919]/50">
              {eyebrow}
            </span>
            <span className="block font-serif text-xl text-[#191919]">{name}</span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          {navItems.length > 0 && (
            <nav className="flex flex-wrap rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/70 p-1 text-xs font-semibold uppercase tracking-widest">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end ?? item.to === navItems[0].to}
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
          )}
          {quickLinks.length > 0 && (
            <div className="flex items-center gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="inline-flex min-h-0 items-center gap-2 rounded-md border border-[#D6D4C8] px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[#191919]/60 hover:border-[#D97757] hover:text-[#D97757]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
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
