import { useState, useEffect, useRef } from 'react';
import { formatTime, getEventEmoji, cleanToolName } from '../../services/openclawService';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'tools', label: 'Tools' },
  { key: 'thinking', label: 'Thinking' },
  { key: 'errors', label: 'Errors' },
];

export default function EventStream({ events }) {
  const [filter, setFilter] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef(null);
  const endRef = useRef(null);

  const filtered = events.filter((e) => {
    if (filter === 'all') return true;
    if (filter === 'tools') return e.sourceType === 'tool_use_block';
    if (filter === 'thinking') return e.sourceType === 'thinking_block';
    if (filter === 'errors') return e.level === 'ERROR' || e.level === 'error';
    return true;
  });

  useEffect(() => {
    if (autoScroll) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filtered.length, autoScroll]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    setAutoScroll(atBottom);
  }

  return (
    <div className="event-stream flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#D6D4C8] bg-[#E6E4D9]/80">
        <span className="text-sm font-medium text-[#191919]">Activity Stream</span>
        <div className="flex items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                filter === f.key
                  ? 'bg-[#D97757] text-white'
                  : 'text-[#5C5C5C] hover:bg-[#D6D4C8]/60'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Event list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1 font-mono text-xs"
      >
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-full text-[#8C8A84] text-sm">
            {events.length === 0
              ? 'Events will appear as the consultant works...'
              : 'No events match this filter.'}
          </div>
        )}

        {filtered.map((event, idx) => (
          <EventRow key={event.id || idx} event={event} lineNumber={idx + 1} />
        ))}

        <div ref={endRef} />
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="mx-3 mb-2 px-3 py-1 text-xs rounded-lg bg-[#D97757]/10 text-[#D97757] hover:bg-[#D97757]/20 transition-colors text-center"
        >
          New activity below - click to scroll
        </button>
      )}
    </div>
  );
}

function EventRow({ event, lineNumber }) {
  const emoji = getEventEmoji(event.sourceType?.replace('_block', '') || event.level);
  const time = formatTime(event.timestamp);

  let content = '';
  let colorClass = 'text-[#5C5C5C]';

  switch (event.sourceType) {
    case 'tool_use_block':
      content = cleanToolName(event.toolName || event.content);
      colorClass = 'text-yellow-600';
      break;
    case 'thinking_block':
      content = (event.content || '').slice(0, 120);
      if ((event.content || '').length > 120) content += '...';
      colorClass = 'text-purple-500';
      break;
    case 'agent_log':
      content = event.content || '';
      colorClass = event.level === 'ERROR' || event.level === 'error'
        ? 'text-red-500'
        : event.level === 'SUCCESS' || event.level === 'success'
          ? 'text-green-600'
          : 'text-[#5C5C5C]';
      break;
    default:
      content = event.content || event.message || JSON.stringify(event).slice(0, 100);
  }

  return (
    <div className="event-row flex items-start gap-2 py-1 px-2 rounded hover:bg-[#D6D4C8]/30 transition-colors">
      <span className="text-[#8C8A84] w-6 text-right flex-shrink-0 select-none">{lineNumber}</span>
      <span className="flex-shrink-0">{emoji}</span>
      <span className="text-[#8C8A84] flex-shrink-0 w-16">{time}</span>
      <span className={`${colorClass} break-words min-w-0`}>{content}</span>
    </div>
  );
}
