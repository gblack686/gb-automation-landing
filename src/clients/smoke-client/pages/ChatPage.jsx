import { useState } from 'react';
import { MessageSquareText, ShieldCheck, Sparkles, Loader2, PlugZap } from 'lucide-react';
import OpsPageShell from '../../../ops/components/OpsPageShell';
import CollapsibleSection from '../../../ops/components/CollapsibleSection';

/**
 * ChatPage — /clients/smoke-client/chat
 *
 * Embeds the always-on Hermes website session for the smoke-client tenant.
 *
 * Auth: inherited from the tenant gate at the App-level splat route
 * (`/clients/smoke-client/*` is wrapped in RequireAuth allowedGroups
 * ['tenant-smoke-client']). No per-page auth wrapper is needed.
 *
 * The iframe never holds a Hermes token. It points at a PUBLIC proxy URL
 * (VITE_SMOKE_CHAT_URL, inlined at build time). The proxy validates the
 * Cognito JWT + group and injects the server-held Hermes token server-side
 * (see services/hermes-chat-gateway/). When the env var is unset/empty we
 * render a themed "Chat connecting…" empty state — never a broken iframe.
 */

// Build-time, PUBLIC proxy URL only — NEVER a token. Falls back to '' so the
// component degrades gracefully to the empty state when unset.
const CHAT_EMBED_URL = import.meta.env.VITE_SMOKE_CHAT_URL || '';

function ShineHeader() {
  return (
    <div className="relative overflow-hidden rounded-md border border-[#D6D4C8] bg-[#191919] p-6 sm:p-8">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <span className="hover-shiny flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-[#D6D4C8]/40 bg-[#E6E4D9] p-3">
            <img
              src="/gb-signature.png"
              alt="GB Automation"
              className="h-full w-full object-contain"
              loading="eager"
            />
          </span>
          <div>
            <p className="gb-eyebrow text-[#D97757]">Hermes · Live session</p>
            <h2 className="mt-1 font-serif text-3xl leading-none text-[#F3F1E7] sm:text-4xl">
              Chat with Hermes
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#F3F1E7]/70">
              An always-on, tenant-scoped session. Authentication is handled for you — the
              connection is brokered by a server-side gateway, so no credentials ever live in
              this page.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border border-[#F3F1E7]/20 bg-white/5 px-3 py-2 text-xs font-semibold text-[#F3F1E7]/80">
          <ShieldCheck className="h-3.5 w-3.5 text-[#D97757]" />
          tenant-smoke-client
        </span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-panel reveal flex min-h-[420px] flex-col items-center justify-center rounded-md border border-[#D6D4C8] bg-white/45 p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[#D6D4C8] bg-[#E6E4D9]">
        <PlugZap className="h-6 w-6 text-[#D97757]" />
      </span>
      <h3 className="mt-5 font-serif text-2xl text-[#191919]">Chat connecting…</h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-[#191919]/65">
        The live Hermes session is being wired up for this tenant. Once the secure gateway is
        online, your conversation surface will appear right here — no further action needed.
      </p>
      <span className="mt-6 inline-flex items-center gap-2 rounded-md border border-[#D6D4C8] bg-[#F3F1E7] px-3 py-2 text-xs font-semibold text-[#191919]/60">
        <Sparkles className="h-3.5 w-3.5 text-[#D97757]" />
        Awaiting gateway endpoint
      </span>
    </div>
  );
}

function ChatFrame({ url }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-md border border-[#D6D4C8] bg-white/45">
      {!loaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#F3F1E7]/80 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-[#D97757]" />
          <p className="text-sm font-semibold text-[#191919]/60">Opening secure session…</p>
        </div>
      )}
      <iframe
        title="Hermes chat session"
        src={url}
        onLoad={() => setLoaded(true)}
        className="h-[640px] w-full bg-[#F3F1E7]"
        // Locked-down sandbox: allow scripting + same-origin (for the session
        // cookie set by the gateway) + form/popups for auth handoff, nothing else.
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        allow="clipboard-write; microphone"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export default function ChatPage() {
  const hasEmbed = Boolean(CHAT_EMBED_URL);

  return (
    <OpsPageShell
      eyebrow="Smoke Client"
      title={
        <span className="inline-flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-[#D97757]" />
          Chat
        </span>
      }
      meta={
        <span className={`gb-chip ${hasEmbed ? 'gb-chip-green' : 'gb-chip-amber'}`}>
          {hasEmbed ? 'Live' : 'Connecting'}
        </span>
      }
    >
      <ShineHeader />

      <CollapsibleSection
        eyebrow="01"
        title="Hermes session"
        meta={<span className="gb-pill">smoke-client</span>}
        defaultOpen
      >
        {hasEmbed ? <ChatFrame url={CHAT_EMBED_URL} /> : <EmptyState />}
      </CollapsibleSection>

      <CollapsibleSection
        eyebrow="02"
        title="How this is secured"
        meta={<span className="gb-pill">read me</span>}
      >
        <div className="rounded-md border border-[#D6D4C8] bg-[#191919] p-5 text-[#F3F1E7]">
          <p className="gb-eyebrow text-[#F3F1E7]/50">Zero-token client</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#F3F1E7]/75">
            This page embeds a <span className="font-mono">PUBLIC</span> gateway URL only. The
            gateway validates your Cognito session (group{' '}
            <span className="font-mono">tenant-smoke-client</span>) and injects the Hermes
            credential server-side. The browser never receives or stores the upstream token.
          </p>
        </div>
      </CollapsibleSection>
    </OpsPageShell>
  );
}
