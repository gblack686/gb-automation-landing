import { formatTime } from '../../services/openclawService';

const STATUS_STYLES = {
  active: { dot: 'bg-green-500 animate-pulse', label: 'Active', bg: 'bg-green-500/10' },
  planning: { dot: 'bg-blue-500 animate-pulse', label: 'Planning', bg: 'bg-blue-500/10' },
  scope_generated: { dot: 'bg-yellow-500', label: 'Scope Ready', bg: 'bg-yellow-500/10' },
  pending_approval: { dot: 'bg-orange-500', label: 'Pending Approval', bg: 'bg-orange-500/10' },
  approved: { dot: 'bg-green-600', label: 'Approved', bg: 'bg-green-600/10' },
  completed: { dot: 'bg-[#8C8A84]', label: 'Completed', bg: 'bg-[#8C8A84]/10' },
  rejected: { dot: 'bg-red-500', label: 'Rejected', bg: 'bg-red-500/10' },
};

export default function SessionList({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
}) {
  const activeSessions = sessions.filter(
    (s) => s.status === 'active' || s.status === 'planning'
  );
  const completedSessions = sessions.filter(
    (s) => s.status !== 'active' && s.status !== 'planning'
  );

  return (
    <div className="session-list flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#D6D4C8] bg-[#E6E4D9]/80">
        <span className="text-sm font-medium text-[#191919]">Sessions</span>
        <button
          onClick={onNewSession}
          className="px-2.5 py-1 text-xs rounded-lg bg-[#D97757] text-white hover:bg-[#c4694c] transition-colors"
        >
          + New
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-sm text-[#5C5C5C] mb-3">No sessions yet</p>
            <button
              onClick={onNewSession}
              className="px-4 py-2 text-sm rounded-xl bg-[#D97757] text-white hover:bg-[#c4694c] transition-colors"
            >
              Start Planning Session
            </button>
          </div>
        )}

        {activeSessions.length > 0 && (
          <div className="mb-2">
            <span className="text-[10px] uppercase tracking-wider text-[#8C8A84] px-2">Active</span>
            {activeSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onClick={() => onSelectSession(session.id)}
              />
            ))}
          </div>
        )}

        {completedSessions.length > 0 && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#8C8A84] px-2">History</span>
            {completedSessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onClick={() => onSelectSession(session.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionItem({ session, isActive, onClick }) {
  const status = STATUS_STYLES[session.status] || STATUS_STYLES.active;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
        isActive
          ? 'bg-[#D97757]/10 border border-[#D97757]/30'
          : 'hover:bg-[#D6D4C8]/40 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2 h-2 rounded-full ${status.dot}`} />
        <span className="text-sm font-medium text-[#191919] truncate flex-1">
          {session.title || session.type || 'Planning Session'}
        </span>
      </div>
      <div className="flex items-center justify-between pl-4">
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${status.bg} text-[#5C5C5C]`}>
          {status.label}
        </span>
        <span className="text-[10px] text-[#8C8A84]">
          {session.updatedAt ? formatTime(session.updatedAt) : ''}
        </span>
      </div>
      {session.scopeVersion && (
        <div className="flex items-center gap-1 mt-1 pl-4">
          <svg className="w-3 h-3 text-[#8C8A84]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
          <span className="text-[10px] text-[#8C8A84]">SOW v{session.scopeVersion}</span>
        </div>
      )}
    </button>
  );
}
