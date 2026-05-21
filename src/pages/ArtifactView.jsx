import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, useParams } from 'react-router-dom';
import Footer from '../components/Footer';
import SignOutButton from '../components/SignOutButton';

const MANIFEST_URL = '/artifacts/manifest.json';

function artifactAssetPath(artifact) {
  if (!artifact) return '';
  return `/artifacts/${encodeURIComponent(artifact.client)}/${encodeURIComponent(artifact.artifact_id)}/${encodeURIComponent(artifact.filename)}`;
}

function Header() {
  return (
    <header className="py-8 border-b border-[#D6D4C8]/60 bg-[#F3F1E7]/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 hover-mini" aria-label="GB Automation home">
          <div className="w-4 h-4 bg-[#D97757]/20 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-[#D97757] rounded-full" />
          </div>
          <span className="text-xs font-serif font-semibold text-[#191919] tracking-widest uppercase">GB Automation</span>
        </Link>
        <nav className="flex items-center gap-4 text-xs uppercase tracking-widest">
          <Link to="/artifacts" className="text-[#191919]/60 hover:text-[#D97757]">Artifacts</Link>
          <Link to="/apps" className="text-[#191919]/60 hover:text-[#D97757]">Apps</Link>
          <span className="w-px h-3 bg-[#D6D4C8]" aria-hidden="true" />
          <SignOutButton />
        </nav>
      </div>
    </header>
  );
}

export default function ArtifactView() {
  const { client, artifactId } = useParams();
  const [manifest, setManifest] = useState(null);
  const [markdown, setMarkdown] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [status, setStatus] = useState({ loading: true, error: '' });

  useEffect(() => {
    let cancelled = false;
    setStatus({ loading: true, error: '' });
    fetch(MANIFEST_URL, { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) throw new Error(`Manifest returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setManifest(data);
          setStatus({ loading: false, error: '' });
        }
      })
      .catch((err) => {
        if (!cancelled) setStatus({ loading: false, error: err.message || 'Unable to load artifact manifest' });
      });
    return () => { cancelled = true; };
  }, []);

  const artifact = useMemo(() => {
    const decodedClient = decodeURIComponent(client || '');
    const decodedArtifactId = decodeURIComponent(artifactId || '');
    return manifest?.artifacts?.find((item) => item.client === decodedClient && item.artifact_id === decodedArtifactId);
  }, [manifest, client, artifactId]);

  const assetPath = artifactAssetPath(artifact);

  useEffect(() => {
    if (!artifact || artifact.type !== 'md') return;
    let cancelled = false;
    fetch(assetPath)
      .then((res) => {
        if (!res.ok) throw new Error(`Markdown returned ${res.status}`);
        return res.text();
      })
      .then((text) => { if (!cancelled) setMarkdown(text); })
      .catch((err) => { if (!cancelled) setMarkdown(`Unable to load markdown artifact: ${err.message}`); });
    return () => { cancelled = true; };
  }, [artifact, assetPath]);



  useEffect(() => {
    if (!artifact || artifact.type !== 'json') return;
    let cancelled = false;
    fetch(assetPath)
      .then((res) => {
        if (!res.ok) throw new Error(`JSON returned ${res.status}`);
        return res.text();
      })
      .then((text) => {
        if (cancelled) return;
        try {
          setJsonText(JSON.stringify(JSON.parse(text), null, 2));
        } catch {
          setJsonText(text);
        }
      })
      .catch((err) => { if (!cancelled) setJsonText(`Unable to load JSON artifact: ${err.message}`); });
    return () => { cancelled = true; };
  }, [artifact, assetPath]);

  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(artifact?.type);

  const title = artifact?.filename?.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') || 'Artifact';

  return (
    <div className="min-h-screen bg-[#F3F1E7] selection:bg-[#D97757] selection:text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-10">
        <Link to="/artifacts" className="text-xs font-bold uppercase tracking-widest text-[#D97757] hover:text-[#191919]">Back to artifacts</Link>

        {status.loading && <p className="mt-10 text-[#191919]/70">Loading artifact...</p>}
        {status.error && <p className="mt-10 text-red-700">{status.error}</p>}
        {!status.loading && !status.error && !artifact && (
          <div className="mt-10 rounded-3xl border border-[#D6D4C8] bg-white/60 p-8">
            <h1 className="text-3xl font-serif text-[#191919]">Artifact not found</h1>
            <p className="mt-3 text-[#191919]/70">This artifact is not listed in the current registry manifest.</p>
          </div>
        )}

        {artifact && (
          <article className="mt-8">
            <div className="mb-6 rounded-3xl border border-[#D6D4C8] bg-white/70 p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[#D97757] text-xs font-bold tracking-widest uppercase">{artifact.client} / {artifact.type}</p>
                  <h1 className="mt-2 text-3xl md:text-5xl font-serif font-medium text-[#191919] capitalize">{title}</h1>
                  <p className="mt-3 text-sm text-[#191919]/60">Artifact ID: {artifact.artifact_id}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a href={assetPath} className="rounded-full bg-[#191919] px-5 py-3 text-xs font-bold uppercase tracking-widest text-[#F3F1E7] hover:bg-[#D97757]">Open raw</a>
                  {artifact.drive?.url && (
                    <a href={artifact.drive.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#D97757] px-5 py-3 text-xs font-bold uppercase tracking-widest text-[#D97757] hover:bg-[#D97757] hover:text-white">Open in Drive</a>
                  )}
                </div>
              </div>
              <p className="mt-4 text-xs uppercase tracking-widest text-[#191919]/45">Website renders the mirrored public copy; Drive is linked as the canonical synced file when available.</p>
              {artifact.drive?.status && (
                <p className="mt-2 text-xs text-[#191919]/55">Drive status: {artifact.drive.status}{artifact.drive.folder_name ? ` in ${artifact.drive.folder_name}` : ''}</p>
              )}
            </div>

            {artifact.type === 'html' && (
              <iframe title={title} src={assetPath} className="h-[78vh] w-full rounded-3xl border border-[#D6D4C8] bg-white shadow-lg" />
            )}

            {artifact.type === 'pdf' && (
              <object data={assetPath} type="application/pdf" className="h-[78vh] w-full rounded-3xl border border-[#D6D4C8] bg-white shadow-lg">
                <div className="p-8 text-[#191919]/70">PDF preview unavailable. <a className="text-[#D97757] underline" href={assetPath}>Open the raw PDF</a>.</div>
              </object>
            )}

            {artifact.type === 'md' && (
              <div className="prose prose-neutral max-w-none rounded-3xl border border-[#D6D4C8] bg-white/80 p-8 text-[#191919] shadow-lg">
                {ReactMarkdown ? <ReactMarkdown>{markdown}</ReactMarkdown> : <pre className="whitespace-pre-wrap">{markdown}</pre>}
              </div>
            )}

            {artifact.type === 'mp4' && (
              <video controls preload="metadata" className="max-h-[78vh] w-full rounded-3xl border border-[#D6D4C8] bg-black shadow-lg">
                <source src={assetPath} type={artifact.mime_type || 'video/mp4'} />
                Your browser cannot play this video. <a className="text-[#D97757] underline" href={assetPath}>Download it instead</a>.
              </video>
            )}

            {isImage && (
              <div className="rounded-3xl border border-[#D6D4C8] bg-white/80 p-4 shadow-lg">
                <img src={assetPath} alt={title} className="mx-auto max-h-[78vh] rounded-2xl object-contain" />
              </div>
            )}

            {artifact.type === 'json' && (
              <pre className="max-h-[78vh] overflow-auto rounded-3xl border border-[#D6D4C8] bg-[#191919] p-6 text-sm text-[#F3F1E7] shadow-lg"><code>{jsonText}</code></pre>
            )}

            {!['html', 'pdf', 'md', 'mp4', 'json'].includes(artifact.type) && !isImage && (
              <div className="rounded-3xl border border-[#D6D4C8] bg-white/80 p-8 text-[#191919]/70 shadow-lg">
                Preview unavailable for this file type. <a className="text-[#D97757] underline" href={assetPath}>Open or download the raw artifact</a>.
              </div>
            )}
          </article>
        )}
      </main>
      <Footer />
    </div>
  );
}
