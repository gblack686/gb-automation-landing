import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, RefreshCw, Send, ShieldCheck, UserRound } from 'lucide-react';
import OpsPageShell from '../../../ops/components/OpsPageShell';
import {
  getGbautomationChatSessionId,
  loadGbautomationMessages,
  sendGbautomationMessage,
} from '../lib/chatClient';

function formatTime(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  const Icon = isUser ? UserRound : Bot;
  return (
    <article className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <span
        className={`mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-md border ${
          isUser
            ? 'border-[#191919] bg-[#191919] text-[#F3F1E7]'
            : 'border-[#D6D4C8] bg-[#E6E4D9] text-[#D97757]'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className={`min-w-0 max-w-[82%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`rounded-md border px-4 py-3 ${
            isUser
              ? 'border-[#191919] bg-[#191919] text-[#F3F1E7]'
              : 'border-[#D6D4C8] bg-white/60 text-[#191919]'
          }`}
        >
          <p className={`whitespace-pre-wrap text-sm leading-6 ${isUser ? 'text-[#F3F1E7]' : 'text-[#191919]/78'}`}>
            {message.content}
          </p>
        </div>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-[#191919]/35">
          {message.role} {formatTime(message.created_at)}
        </p>
      </div>
    </article>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const sessionId = useMemo(() => getGbautomationChatSessionId(), []);
  const hasAssistantReply = messages.some((message) => message.role === 'assistant');

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setStatus('loading');
    try {
      const payload = await loadGbautomationMessages({ sessionId, limit: 160 });
      setMessages(Array.isArray(payload.messages) ? payload.messages : []);
      setError('');
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load chat');
      setStatus('error');
    }
  }, [sessionId]);

  useEffect(() => {
    refresh();
    const id = window.setInterval(() => refresh({ quiet: true }), 4000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  async function submit() {
    const content = draft.trim();
    if (!content || sending) return;

    try {
      setSending(true);
      await sendGbautomationMessage({ sessionId, content });
      setDraft('');
      await refresh({ quiet: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message');
      setStatus('error');
    } finally {
      setSending(false);
    }
  }

  return (
    <OpsPageShell
      eyebrow="Hermes Chat"
      title="GBautomation Chat"
      meta={
        <span className={`gb-chip ${hasAssistantReply ? 'gb-chip-green' : 'gb-chip-amber'}`}>
          <ShieldCheck className="h-3.5 w-3.5" />
          {hasAssistantReply ? 'Bridge Active' : 'Awaiting Bridge'}
        </span>
      }
    >
      <div className="grid min-h-[calc(100vh-250px)] gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="glass-panel flex min-h-[560px] flex-col overflow-hidden rounded-md border border-[#D6D4C8] bg-white/45">
          <div className="flex items-center justify-between gap-3 border-b border-[#D6D4C8] bg-[#E6E4D9]/65 px-4 py-3">
            <div>
              <p className="gb-eyebrow text-[#D97757]">Session</p>
              <p className="max-w-[50vw] truncate font-mono text-xs text-[#191919]/55">{sessionId}</p>
            </div>
            <button
              type="button"
              onClick={() => refresh()}
              className="hover-mini inline-flex min-h-0 items-center gap-2 rounded-md border border-[#D6D4C8] bg-white/55 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[#191919]/60 transition hover:border-[#D97757] hover:text-[#D97757]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
            {status === 'loading' && (
              <p className="text-sm text-[#191919]/50">Loading chat...</p>
            )}
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}
            {!messages.length && status !== 'loading' && (
              <div className="rounded-md border border-[#D6D4C8] bg-[#F3F1E7]/80 p-5">
                <p className="gb-eyebrow text-[#D97757]">No messages yet</p>
                <p className="mt-2 text-sm leading-6 text-[#191919]/65">
                  Start the GBautomation website session from this page.
                </p>
              </div>
            )}
            {messages.map((message) => (
              <ChatBubble key={message.id || `${message.role}-${message.created_at}`} message={message} />
            ))}
            <div ref={endRef} />
          </div>

          <div className="border-t border-[#D6D4C8] bg-[#E6E4D9]/55 p-4">
            <div className="flex gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                    event.preventDefault();
                    submit();
                  }
                }}
                rows={3}
                placeholder="Message Hermes..."
                className="input-field min-h-[88px] min-w-0 flex-1 resize-none rounded-md px-4 py-3 text-sm"
              />
              <button
                type="button"
                onClick={submit}
                disabled={sending || !draft.trim()}
                className="grid min-h-[88px] w-14 place-items-center rounded-md border border-[#191919] bg-[#191919] text-[#F3F1E7] transition hover:border-[#D97757] hover:bg-[#D97757] disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-3">
          <div className="glass-panel rounded-md border border-[#D6D4C8] bg-[#E6E4D9]/65 p-5">
            <p className="gb-eyebrow text-[#D97757]">Broker</p>
            <h3 className="mt-2 font-serif text-2xl text-[#191919]">Supabase Relay</h3>
            <p className="mt-3 text-sm leading-6 text-[#191919]/65">
              {messages.length} messages captured for this website session.
            </p>
          </div>
          <div className="glass-panel rounded-md border border-[#D6D4C8] bg-white/45 p-5">
            <p className="gb-eyebrow text-[#D97757]">Status</p>
            <div className="mt-3 space-y-2 text-sm text-[#191919]/65">
              <p>Read path: {status === 'error' ? 'needs attention' : 'online'}</p>
              <p>Send path: {sending ? 'sending' : 'ready'}</p>
              <p>Assistant rows: {hasAssistantReply ? 'present' : 'pending'}</p>
            </div>
          </div>
        </aside>
      </div>
    </OpsPageShell>
  );
}
