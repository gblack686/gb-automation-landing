import { ExternalLink } from 'lucide-react';
import OpsPageShell from '../../ops/components/OpsPageShell';
import CollapsibleSection from '../../ops/components/CollapsibleSection';

const archonPath = '/clients/jid5274/archon/';

export default function Jid5274Portal() {
  return (
    <div className="relative min-h-screen bg-[#F3F1E7] text-[#191919]">
      <div className="gb-ambient" aria-hidden="true">
        <span className="g1" />
        <span className="g2" />
      </div>

      <main className="relative mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <OpsPageShell
          eyebrow="Practice Management Consultants"
          title="Jason Diaz Portal"
          meta={
            <a
              href={archonPath}
              target="_blank"
              rel="noopener noreferrer"
              className="hover-shiny inline-flex items-center gap-2 rounded-md border border-[#D6D4C8] bg-[rgba(255,255,255,.55)] px-3 py-2 text-sm font-semibold text-[#191919]/75 transition hover:border-[#D97757] hover:text-[#D97757]"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          }
        >
          <p className="reveal max-w-2xl text-sm leading-7 text-[#191919]/70">
            Tenant workspace for Jason Diaz. The embedded Archon application below
            runs at <span className="gb-tag key">{archonPath}</span>. Use{' '}
            <strong className="font-semibold text-[#191919]">Open</strong> to launch
            it in a dedicated tab.
          </p>

          <div className="space-y-3">
            <CollapsibleSection
              eyebrow="01"
              title="Portal Access"
              meta={
                <span className="gb-chip gb-chip-green">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-[#D97757]"
                    aria-hidden="true"
                  />
                  Live
                </span>
              }
            >
              <div className="glass-panel reveal rounded-xl p-5">
                <p className="gb-eyebrow">Practice Management Consultants</p>
                <h3 className="mt-1 font-serif text-lg font-semibold text-[#191919]">
                  Jason Diaz Portal
                </h3>
                <p className="mt-2 text-sm leading-7 text-[#191919]/70">
                  Single-tenant entry point. The Archon workspace is embedded inline
                  below; for a full-screen session open it in a new tab.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="gb-pill">Tenant - jid5274</span>
                  <span className="gb-pill">Archon</span>
                  <a
                    href={archonPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover-mini inline-flex items-center gap-2 rounded-md border border-[#D6D4C8] bg-[rgba(255,255,255,.55)] px-3 py-1.5 text-sm font-semibold text-[#191919]/75 transition hover:border-[#D97757] hover:text-[#D97757]"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in new tab
                  </a>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              eyebrow="02"
              title="Embedded Workspace"
              defaultOpen
              meta={<span className="gb-pill">Archon</span>}
            >
              <div className="glass-panel reveal overflow-hidden rounded-xl p-1.5">
                <iframe
                  title="Jason Diaz Archon"
                  src={archonPath}
                  className="block h-[calc(100vh-260px)] min-h-[520px] w-full rounded-lg border-0 bg-[#F3F1E7]"
                />
              </div>
            </CollapsibleSection>
          </div>
        </OpsPageShell>
      </main>
    </div>
  );
}
