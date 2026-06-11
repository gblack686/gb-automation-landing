import { Navigate, Route, Routes } from 'react-router-dom';
import { getRoutesByClass } from '../routes/routeRegistry';

const cardClass = 'rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/70 p-5';

function TeamShell({ title, eyebrow, children }) {
  return (
    <div className="min-h-screen bg-[#F3F1E7] text-[#191919]">
      <header className="border-b border-[#D6D4C8] px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#D97757]">{eyebrow}</p>
        <h1 className="mt-2 font-serif text-3xl">{title}</h1>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}

function TeamHome() {
  const routes = getRoutesByClass('team');
  return (
    <TeamShell title="Team workspace" eyebrow="Read-only build cockpit">
      <div className="grid gap-4 md:grid-cols-3">
        {routes.map((route) => (
          <a key={route.id} href={route.path.replace('/*', '')} className={cardClass}>
            <p className="text-xs font-bold uppercase tracking-widest text-[#D97757]">{route.authPolicy}</p>
            <h2 className="mt-2 font-serif text-xl">{route.label}</h2>
            <p className="mt-3 text-sm text-[#191919]/65">{route.dataContract}</p>
          </a>
        ))}
      </div>
    </TeamShell>
  );
}

function TeamBuilds() {
  return (
    <TeamShell title="Build receipts" eyebrow="Mirror contract">
      <div className={cardClass}>
        <p className="text-sm leading-6 text-[#191919]/70">
          This skeleton is intentionally read-only. It is reserved for sanitized build receipts,
          approved specs, and task summaries from generated mirrors.
        </p>
      </div>
    </TeamShell>
  );
}

function TeamDispatch() {
  return (
    <TeamShell title="Dispatch specs" eyebrow="No live Kanban mutations">
      <div className={cardClass}>
        <p className="text-sm leading-6 text-[#191919]/70">
          V1 exposes copyable dispatch specs only. Browser code must not create, update, block,
          or complete live Kanban tasks.
        </p>
      </div>
    </TeamShell>
  );
}

export default function TeamRoutes() {
  return (
    <Routes>
      <Route index element={<TeamHome />} />
      <Route path="builds" element={<TeamBuilds />} />
      <Route path="dispatch" element={<TeamDispatch />} />
      <Route path="*" element={<Navigate to="/team" replace />} />
    </Routes>
  );
}
