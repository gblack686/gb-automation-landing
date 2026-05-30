import { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, File, Folder } from 'lucide-react';

function assetPath(artifact) {
  return `/artifacts/${encodeURIComponent(artifact.client)}/${encodeURIComponent(artifact.artifact_id)}/${encodeURIComponent(artifact.filename)}`;
}

function formatSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return 'Undated';
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function typeLabel(artifact) {
  return artifact.type || artifact.mime_type || 'file';
}

function Preview({ artifact }) {
  const path = assetPath(artifact);
  const type = artifact.type || '';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(type);

  if (isImage) {
    return <img src={path} alt={artifact.filename} className="max-h-[620px] max-w-full rounded-2xl object-contain" />;
  }
  if (type === 'mp4') {
    return (
      <video controls preload="metadata" className="max-h-[620px] w-full rounded-2xl bg-black">
        <source src={path} type={artifact.mime_type || 'video/mp4'} />
      </video>
    );
  }
  if (type === 'html' || type === 'pdf') {
    return <iframe title={artifact.filename} src={path} className="h-[620px] w-full rounded-2xl border border-[#D6D4C8] bg-white" />;
  }
  return (
    <div className="grid min-h-[420px] place-items-center rounded-2xl border border-[#D6D4C8] bg-white/50 p-10 text-center text-[#191919]/60">
      <div>
        <File className="mx-auto h-10 w-10 text-[#D97757]" />
        <p className="mt-4 text-sm">Preview unavailable for this file type.</p>
      </div>
    </div>
  );
}

export default function ArtifactsPage() {
  const [manifest, setManifest] = useState(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/artifacts/manifest.json', { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(`Manifest returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setManifest(data);
        const first = data.artifacts?.find((item) => item.client === 'gbautomation' && !item.archived);
        setSelectedId(first?.artifact_id || '');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load artifact manifest');
      });
    return () => { cancelled = true; };
  }, []);

  const artifacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...(manifest?.artifacts || [])]
      .filter((artifact) => artifact.client === 'gbautomation' && !artifact.archived)
      .filter((artifact) => {
        if (!q) return true;
        return [artifact.artifact_id, artifact.filename, artifact.project, artifact.type, artifact.mime_type]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }, [manifest, query]);

  const selected = artifacts.find((artifact) => artifact.artifact_id === selectedId) || artifacts[0];

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#D97757]">Artifact Registry</p>
          <h1 className="mt-2 font-serif text-4xl font-medium text-[#191919]">GBAutomation Files</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#191919]/65">
            {artifacts.length || 0} mirrored folders from the production artifact registry.
          </p>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search files"
          className="h-11 w-full rounded-md border border-[#D6D4C8] bg-white/80 px-4 text-sm text-[#191919] outline-none focus:border-[#D97757] md:max-w-sm"
        />
      </div>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>}
      {!manifest && !error && <p className="text-sm text-[#191919]/60">Loading artifacts...</p>}
      {manifest && !artifacts.length && <p className="text-sm text-[#191919]/60">No artifacts matched.</p>}

      {selected && (
        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="max-h-[760px] overflow-auto rounded-2xl border border-[#D6D4C8] bg-white/55">
            {artifacts.map((artifact) => (
              <button
                key={artifact.artifact_id}
                type="button"
                onClick={() => setSelectedId(artifact.artifact_id)}
                className={`grid w-full grid-cols-[24px_1fr] gap-3 border-b border-[#D6D4C8] px-4 py-4 text-left transition last:border-b-0 ${
                  artifact.artifact_id === selected.artifact_id ? 'bg-[#191919] text-[#F3F1E7]' : 'text-[#191919] hover:bg-white'
                }`}
              >
                <Folder className="mt-0.5 h-4 w-4 text-[#D97757]" />
                <span className="min-w-0">
                  <span className="block break-words text-sm font-semibold">{artifact.artifact_id}</span>
                  <span className={`mt-1 block text-xs ${artifact.artifact_id === selected.artifact_id ? 'text-[#F3F1E7]/60' : 'text-[#191919]/50'}`}>
                    {formatDate(artifact.created_at)} · {typeLabel(artifact)}
                  </span>
                </span>
              </button>
            ))}
          </aside>

          <section className="min-w-0 rounded-2xl border border-[#D6D4C8] bg-white/65 p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <p className="break-words text-xs uppercase tracking-widest text-[#191919]/45">Artifact Registry / gbautomation / {selected.artifact_id}</p>
                <h2 className="mt-2 break-words font-serif text-3xl font-medium text-[#191919]">{selected.filename}</h2>
                <p className="mt-2 text-sm text-[#191919]/55">{selected.mime_type} · {formatSize(selected.size)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={assetPath(selected)} className="inline-flex items-center gap-2 rounded-md bg-[#191919] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#F3F1E7] hover:bg-[#D97757]">
                  <Download className="h-3.5 w-3.5" />
                  Raw
                </a>
                {selected.drive?.url && (
                  <a href={selected.drive.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-[#D97757] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#D97757] hover:bg-[#D97757] hover:text-white">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Drive
                  </a>
                )}
              </div>
            </div>
            <div className="grid min-h-[460px] place-items-center rounded-3xl bg-[#F3F1E7] p-3">
              <Preview artifact={selected} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
