import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function ScopePreview({
  scope,
  onApprove,
  onRevise,
  onReject,
  onClose,
}) {
  const [revisionNote, setRevisionNote] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);

  if (!scope) return null;

  function handleRevise() {
    if (!showRevisionInput) {
      setShowRevisionInput(true);
      return;
    }
    if (revisionNote.trim()) {
      onRevise(revisionNote.trim());
      setRevisionNote('');
      setShowRevisionInput(false);
    }
  }

  function handleExport() {
    const blob = new Blob([scope.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scope-of-work-v${scope.version || 1}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="scope-preview border-t border-[#D6D4C8] bg-[#E6E4D9]/90">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#D6D4C8]/60">
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-[#D97757]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
          <span className="text-sm font-medium text-[#191919]">
            Scope of Work {scope.version ? `v${scope.version}` : ''}
          </span>
          {scope.status && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              scope.status === 'approved' ? 'bg-green-500/10 text-green-600' :
              scope.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
              'bg-yellow-500/10 text-yellow-600'
            }`}>
              {scope.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-2.5 py-1 text-xs rounded-lg text-[#5C5C5C] hover:bg-[#D6D4C8]/60 transition-colors"
            title="Download as Markdown"
          >
            Export
          </button>
          <button
            onClick={onClose}
            className="px-2 py-1 text-xs rounded-lg text-[#8C8A84] hover:bg-[#D6D4C8]/60 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Scope content */}
      <div className="scope-content overflow-y-auto px-6 py-4 max-h-64">
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{scope.content}</ReactMarkdown>
        </div>
      </div>

      {/* Revision input */}
      {showRevisionInput && (
        <div className="px-4 py-2 border-t border-[#D6D4C8]/40">
          <textarea
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.target.value)}
            placeholder="Describe what changes you'd like..."
            rows={2}
            className="w-full resize-none rounded-xl px-3 py-2 text-sm bg-white/60 border border-[#D6D4C8] text-[#191919] placeholder-[#8C8A84] focus:outline-none focus:border-[#D97757] transition-all"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-[#D6D4C8]/40">
        <button
          onClick={onReject}
          className="px-4 py-1.5 text-sm rounded-xl border border-red-300 text-red-500 hover:bg-red-50 transition-colors"
        >
          Reject
        </button>
        <button
          onClick={handleRevise}
          className="px-4 py-1.5 text-sm rounded-xl border border-[#D6D4C8] text-[#5C5C5C] hover:bg-[#D6D4C8]/40 transition-colors"
        >
          {showRevisionInput ? 'Submit Revision' : 'Request Revision'}
        </button>
        <button
          onClick={onApprove}
          className="px-4 py-1.5 text-sm rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
        >
          Approve
        </button>
      </div>
    </div>
  );
}
