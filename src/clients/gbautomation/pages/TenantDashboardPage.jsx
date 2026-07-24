import { Activity, AlertTriangle, CheckCircle2, Eye } from 'lucide-react';
import ClientSection from '../../shared/ClientSection';
import ClientMetric, { ClientStatusRail } from '../../shared/ClientMetric';
import { useTenantData } from '../../shared/useTenantData';
import { getTenantConfig } from '../../shared/tenantConfig';

const STATE_TONE = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  watch: 'border-amber-200 bg-amber-50 text-amber-800',
  alert: 'border-rose-200 bg-rose-50 text-rose-800',
};

function stateIcon(state) {
  if (state === 'ok') return CheckCircle2;
  if (state === 'watch') return Eye;
  return AlertTriangle;
}

export default function TenantDashboardPage({ slug = 'gbautomation' }) {
  const tenant = getTenantConfig(slug);
  const { data, error, loading } = useTenantData(`${tenant.dataPath}/dashboard.json`);

  if (loading) {
    return (
      <p className="text-sm text-[#191919]/60">Loading {tenant.name} dashboard…</p>
    );
  }
  if (error) {
    return (
      <p className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        Failed to load dashboard: <code className="font-mono">{error}</code>
      </p>
    );
  }

  return (
    <div className="space-y-12">
      <ClientSection
        eyebrow={`${tenant.productLabel} dashboard`}
        title={data.headline}
        description={`Live snapshot of the ${tenant.name} portal. Pulled from ${tenant.dataPath}/dashboard.json.`}
      >
        <ClientStatusRail>
          {data.metrics.map((metric) => (
            <ClientMetric
              key={metric.label}
              label={metric.label}
              value={metric.value}
              detail={metric.detail}
              accent={metric.accent}
            />
          ))}
        </ClientStatusRail>
      </ClientSection>

      <ClientSection
        eyebrow="Status rail"
        title="Operational checks"
        description="Each row reflects a real check exercised by the tenant-sync workflow."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.status_rail.map((rail) => {
            const tone = STATE_TONE[rail.state] || STATE_TONE.watch;
            const Icon = stateIcon(rail.state);
            return (
              <div
                key={rail.label}
                className={`rounded-md border p-4 ${tone}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    {rail.label}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 opacity-80">{rail.detail}</p>
              </div>
            );
          })}
        </div>
      </ClientSection>

      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <ClientSection
          eyebrow="Activity"
          title="Recent events"
          description="Anything operationally interesting in the last seven days."
        >
          <div className="divide-y divide-[#D6D4C8] rounded-md border border-[#D6D4C8] bg-white/55">
            {data.activity.map((item) => (
              <div key={item.title} className="grid gap-3 p-5 sm:grid-cols-[8rem_1fr]">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#191919]/55">
                  <Activity className="h-3.5 w-3.5 text-[#D97757]" />
                  {item.timestamp.slice(0, 10)}
                </span>
                <div>
                  <h3 className="font-medium text-[#191919]">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[#191919]/65">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ClientSection>

        <ClientSection
          eyebrow="Next"
          title="Up next"
          description="Ordered. Owner is Greg unless noted in the activity feed."
        >
          <ol className="space-y-3 rounded-md border border-[#D6D4C8] bg-white/55 p-5">
            {data.next_steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#191919] text-xs font-bold text-[#F3F1E7]">
                  {index + 1}
                </span>
                <span className="pt-1 text-sm leading-6 text-[#191919]/70">{step}</span>
              </li>
            ))}
          </ol>
        </ClientSection>
      </div>
    </div>
  );
}
