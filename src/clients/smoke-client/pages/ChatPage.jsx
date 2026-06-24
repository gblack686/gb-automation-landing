import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send, ShieldCheck, TerminalSquare } from 'lucide-react';
import OpsPageShell from '../../../ops/components/OpsPageShell';
import CollapsibleSection from '../../../ops/components/CollapsibleSection';
import { sendSmokeChat } from '../lib/smokeChatClient';

const STORAGE_KEY = 'gbauto.smoke-client.chat';

function nowMessage(role, text, extras = {}) {
  return {
    id: extras.id || `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
    ts: extras.ts || new Date().toISOString(),
    status: extras.status,
  };
}

function loadHistory() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(saved)) return saved.slice(-80);
  } catch {
    // Ignore corrupt local history.
  }
  return [
    nowMessage(
      'system',
      'Smoke-client chat is connected through the authenticated GB Auto backend.',
    ),
  ];
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function roleLabel(role) {
  if (role === 'assistant') return 'Hermes';
  if (role === 'system') return 'System';
  return 'You';
}

function roleClass(role) {
  if (role === 'user') return 'justify-end';
  if (role === 'system') return 'justify-center';
  return 'justify-start';
}

function bubbleClass(role) {
  if (role === 'user') {
    return 'border-[#D97757]/35 bg-[#D97757]/10 text-[#191919]';
  }
  if (role === 'system') {
    return 'max-w-3xl border-[#D6D4C8] bg-[#E6E4D9]/70 text-center text-[#191919]/70';
  }
  return 'border-[#D6D4C8] bg-white/65 text-[#191919]';
}

export default function ChatPage() {
  const [messages, setMessages] = useState(loadHistory);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [transport, setTransport] = useState('amplify-smoke-client');
  const [status, setStatus] = useState('Ready');
  const scrollRef = useRef(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-80)));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const connected = useMemo(() => !error && status !== 'Unavailable', [error, status]);

  async function onSubmit(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setMessages((items) => [...items, nowMessage('user', text, { status: 'sent' })]);
    setDraft('');
    setSending(true);
    setError('');

    try {
      const response = await sendSmokeChat(text);
      setTransport(response.transport || 'amplify-smoke-client');
      setStatus(response.status || 'Delivered');
      const replyText = response.reply?.text || response.message?.text || response.output_text;
      if (replyText) {
        setMessages((items) => [
          ...items,
          nowMessage('assistant', replyText, {
            id: response.reply?.id,
            ts: response.reply?.ts,
            status: response.mode || response.status,
          }),
        ]);
      }
    } catch (err) {
      const detail = err.message || 'Unable to send message';
      setError(detail);
      setMessages((items) => [...items, nowMessage('system', detail, { status: 'error' })]);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <OpsPageShell
      eyebrow="Smoke Client"
      title="Chat"
      meta={
        <span className={`gb-chip ${connected ? 'gb-chip-green' : 'gb-chip-red'}`}>
          <ShieldCheck className="h-3.5 w-3.5" />
          {connected ? 'Connected' : 'Unavailable'}
        </span>
      }
    >
      <div className="space-y-3">
        <CollapsibleSection
          eyebrow="01"
          title={
            <span className="inline-flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#D97757]" />
              Hermes Thread
            </span>
          }
          meta={<span className="gb-pill">{transport}</span>}
          defaultOpen
        >
          <div className="rounded-md border border-[#D6D4C8] bg-[#191919] p-4 text-[#F3F1E7]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 text-sm">
                <span
                  className={`h-2 w-2 rounded-full ${connected ? 'bg-[#4F9D69]' : 'bg-[#B94A48]'}`}
                  aria-hidden="true"
                />
                <span>{status}</span>
              </div>
              <span className="gb-pill border-[#F3F1E7]/15 bg-[#F3F1E7]/10 text-[#F3F1E7]/75">
                tenant:smoke-client
              </span>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-[#D6D4C8] bg-[#F3F1E7]">
            <div
              ref={scrollRef}
              className="flex h-[min(58vh,560px)] min-h-[360px] flex-col gap-3 overflow-y-auto p-4"
            >
              {messages.map((message) => (
                <div key={message.id} className={`flex ${roleClass(message.role)}`}>
                  <div className={`max-w-[82%] rounded-md border px-4 py-3 ${bubbleClass(message.role)}`}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="gb-eyebrow text-[#191919]/45">{roleLabel(message.role)}</span>
                      <span className="text-[11px] text-[#191919]/40">{formatTime(message.ts)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{message.text}</p>
                    {message.status && (
                      <span className="mt-2 inline-flex rounded border border-[#D6D4C8] px-2 py-0.5 font-mono text-[10px] uppercase text-[#191919]/45">
                        {message.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={onSubmit} className="flex gap-3 border-t border-[#D6D4C8] bg-[#E6E4D9]/80 p-3">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                disabled={sending}
                placeholder="Message smoke-client, or type /dispatch build a smoke check..."
                className="min-h-11 max-h-40 flex-1 resize-y rounded-md border border-[#D6D4C8] bg-white/80 px-3 py-2 text-sm leading-6 text-[#191919] outline-none transition-colors placeholder:text-[#191919]/35 focus:border-[#D97757] disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="inline-flex h-11 min-w-11 items-center justify-center rounded-md bg-[#191919] px-4 text-sm font-semibold text-[#F3F1E7] transition-colors hover:bg-[#D97757] disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Send message"
                title="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

          {error && (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          eyebrow="02"
          title={
            <span className="inline-flex items-center gap-2">
              <TerminalSquare className="h-4 w-4 text-[#D97757]" />
              Dispatch Gate
            </span>
          }
          meta={<span className="gb-chip gb-chip-amber">Dry-run</span>}
        >
          <div className="glass-panel rounded-md border border-[#D6D4C8] bg-white/45 p-5 text-sm leading-7 text-[#191919]/65">
            <span className="font-mono text-[#191919]">/dispatch &lt;request&gt;</span> returns a
            smoke-client TAC plan from the Amplify backend. Live worker-card writes stay gated until
            the Mac Mini poller exposes a dedicated smoke-client dispatch action.
          </div>
        </CollapsibleSection>
      </div>
    </OpsPageShell>
  );
}
