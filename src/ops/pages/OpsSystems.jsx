import { opsData } from '../data/opsData';
import { SystemCard } from '../components/OpsCards';

export default function OpsSystems() {
  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-bold uppercase text-[#D97757]">Runtime Inventory</span>
        <h1 className="mt-3 font-serif text-4xl text-[#191919] md:text-5xl">Systems Dashboard</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#191919]/70">
          Curated state for the infrastructure that should be mirrored from the Mac Mini and
          supporting cloud services.
        </p>
      </div>
      <section className="grid gap-5 xl:grid-cols-2">
        {opsData.systems.map((system) => (
          <SystemCard key={system.name} system={system} />
        ))}
      </section>
    </div>
  );
}
