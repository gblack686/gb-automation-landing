import { ExternalLink, FileQuestion } from 'lucide-react';

/**
 * Auto-render an artifact by its declared type.
 * Sandbox HTML artifacts so they can't reach the parent DOM.
 */
export default function ArtifactPlayer({ artifact, className = '' }) {
  if (!artifact) return null;
  const { type, url, poster, title } = artifact;
  const baseClass = `w-full h-full object-cover ${className}`;

  if (!url || type === 'placeholder') {
    return (
      <div className={`flex flex-col items-center justify-center bg-[#E6E4D9] text-[#191919]/60 p-6 ${className}`}>
        <FileQuestion className="w-8 h-8 mb-2" />
        <p className="text-xs uppercase tracking-widest">Awaiting publish</p>
      </div>
    );
  }

  switch (type) {
    case 'video':
      return (
        <video
          controls
          preload="metadata"
          poster={poster || undefined}
          className={baseClass}
        >
          <source src={url} type="video/mp4" />
          Your browser does not support video playback.
        </video>
      );

    case 'gif':
    case 'image':
      return (
        <img
          src={url}
          alt={title || 'artifact'}
          loading="lazy"
          className={baseClass}
        />
      );

    case 'html':
      return (
        <iframe
          src={url}
          title={title || 'html artifact'}
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          className={`w-full h-full border-0 bg-white ${className}`}
        />
      );

    case 'json':
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 bg-[#E6E4D9] text-[#191919] p-6 hover:bg-[#D6D4C8] transition-colors ${className}`}
        >
          <ExternalLink className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest">Open JSON</span>
        </a>
      );

    default:
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 bg-[#E6E4D9] text-[#191919] p-6 hover:bg-[#D6D4C8] transition-colors ${className}`}
        >
          <ExternalLink className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest">Open {type}</span>
        </a>
      );
  }
}
