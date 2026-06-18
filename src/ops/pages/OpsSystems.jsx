import { opsData } from '../data/opsData';
import { SystemCard } from '../components/OpsCards';
import OpsPageShell from '../components/OpsPageShell';
import CollapsibleSection from '../components/CollapsibleSection';

export default function OpsSystems() {
  const systems = opsData.systems;
  const onlineCount = systems.filter((s) => s.state === 'online').length;
  const degradedCount = systems.filter((s) => s.state === 'degraded').length;

  return (
    <OpsPageShell>
      {/* Header — Runtime Inventory eyebrow + title + intro. Open by default so
          the page isn't empty on load. */}
      <CollapsibleSection
        className="reveal"
        eyebrow="Runtime Inventory"
        title="Systems Dashboard"
        defaultOpen
        meta={
          <span className="gb-pill">
            {systems.length} systems
          </span>
        }
      >
        <p className="max-w-3xl text-sm leading-7 text-[#191919]/70">
          Curated state for the infrastructure that should be mirrored from the Mac Mini and
          supporting cloud services.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="gb-chip gb-chip-green">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
            {onlineCount} online
          </span>
          {degradedCount > 0 ? (
            <span className="gb-chip gb-chip-amber">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
              {degradedCount} degraded
            </span>
          ) : null}
        </div>
      </CollapsibleSection>

      {/* Systems grid — collapsed by default. */}
      <CollapsibleSection
        className="reveal"
        eyebrow="Inventory"
        title="Service Catalog"
        meta={<span className="gb-pill">{systems.length} entries</span>}
      >
        <section className="grid gap-5 xl:grid-cols-2">
          {systems.map((system) => (
            <SystemCard key={system.name} system={system} />
          ))}
        </section>
      </CollapsibleSection>
    </OpsPageShell>
  );
}
