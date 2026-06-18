import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  BriefcaseBusiness,
  Command,
  Files,
  FolderSearch,
  Library,
  MessageSquareText,
  GitBranch,
  LayoutDashboard,
  Send,
  Sparkles,
  UserRound,
  Workflow,
  X,
} from 'lucide-react';
import { fetchPublicOpsFeed, insertWebsiteFeedback } from '../lib/supabaseOps';

const shortcuts = [
  {
    id: 'chat',
    keys: ['Ctrl', 'K'],
    label: 'Chat with Hermes',
    description: 'Open the always-on website session and ask for help.',
    icon: MessageSquareText,
  },
  {
    id: 'smoke-chat',
    keys: ['Ctrl', 'H'],
    label: 'Chat with Hermes',
    description: 'Open the smoke-client tenant chat session.',
    icon: MessageSquareText,
    href: '/clients/smoke-client/chat',
  },
  {
    id: 'session',
    keys: ['Ctrl', 'O'],
    label: 'Open Session',
    description: 'Review the visitor profile, active context, and current workspace.',
    icon: UserRound,
  },
  {
    id: 'feedback',
    keys: ['Ctrl', 'J'],
    label: 'Submit Feedback',
    description: 'Send product or consulting feedback into the GB Automation pipeline.',
    icon: BriefcaseBusiness,
  },
  {
    id: 'brain',
    keys: ['Ctrl', 'B'],
    label: 'Second Brain',
    description: 'Browse repository and second-brain context for this site.',
    icon: FolderSearch,
  },
  {
    id: 'board',
    keys: ['Ctrl', 'M'],
    label: 'Hermes Board',
    description: 'Open the mission board for active work packages and decisions.',
    icon: Files,
  },
  {
    id: 'library',
    keys: ['Ctrl', ';'],
    label: 'AI Library',
    description: 'Find skills, AGENTS.md files, prompts, profiles, and templates.',
    icon: Library,
  },
  {
    id: 'overview',
    keys: ['Ctrl', ','],
    label: 'Overview',
    description: 'Operations landing — commits, PRDs, DAGs, and recent activity.',
    icon: LayoutDashboard,
    href: '/overview',
  },
  {
    id: 'repos',
    keys: ['Ctrl', "'"],
    label: 'Repos & Commits',
    description: 'Repo activity and the cross-repo commit feed.',
    icon: GitBranch,
    href: '/repos',
  },
  {
    id: 'observability',
    keys: ['Ctrl', '.'],
    label: 'Observability',
    description: 'Agent DAGs and Langfuse traces from the build pipeline.',
    icon: Workflow,
    href: '/observability',
  },
  {
    id: 'shortcuts',
    keys: ['Ctrl', '/'],
    label: 'Shortcuts',
    description: 'Show the website keyboard command reference.',
    icon: Command,
  },
];

const panels = {
  chat: {
    eyebrow: 'Hermes chat',
    title: 'Always-on website session',
    body: 'Ask about services, pricing, current artifacts, onboarding, or what GB Automation can build for your team.',
    prompt: 'Ask Hermes about GB Automation...',
  },
  session: {
    eyebrow: 'Visitor profile',
    title: 'Session context',
    body: 'This is the shell for user-specific website memory, repository context, and signed-in workspace state.',
    prompt: 'Add a note to this session...',
  },
  feedback: {
    eyebrow: 'Consulting pipeline',
    title: 'Feedback submission',
    body: 'Capture product feedback, website issues, consulting leads, and follow-up requests.',
    prompt: 'Describe the feedback or opportunity...',
  },
  brain: {
    eyebrow: 'Second brain',
    title: 'Repository directory',
    body: 'A read-first directory for plans, PRDs, client notes, skills, and implementation references.',
    prompt: 'Search repository or second-brain context...',
  },
  board: {
    eyebrow: 'Hermes board',
    title: 'Mission control',
    body: 'A GB Automation-styled Kanban surface for active deliverables, blockers, review, and shipped work.',
    prompt: 'Create or inspect a work package...',
  },
  library: {
    eyebrow: 'AI library',
    title: 'Skills and agent files',
    body: 'Browse reusable Codex skills, AGENTS.md instructions, prompts, profiles, templates, and operators.',
    prompt: 'Search skills, agents, prompts, or templates...',
  },
  shortcuts: {
    eyebrow: 'Keyboard',
    title: 'Shortcut reference',
    body: 'Fast access to the command surfaces that should be available from anywhere on the website.',
    prompt: 'Type a command name...',
  },
};

function KeyCap({ children }) {
  return (
    <kbd className="rounded-md border border-[#D6D4C8] bg-white/70 px-2 py-1 text-[11px] font-semibold leading-none text-[#191919] shadow-sm">
      {children}
    </kbd>
  );
}

function getQueryValue(searchParams, names) {
  for (const name of names) {
    const value = searchParams.get(name);
    if (value) return value;
  }
  return null;
}

function buildFeedbackPayload(message, activePanel) {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  return {
    page_url: url.href,
    route: `${url.pathname}${url.search}`,
    client_slug: params.get('client') || 'gbautomation',
    repo_slug: params.get('repo') || 'gbautomation',
    board_slug: params.get('board') || 'gbautomation',
    profile: params.get('profile') || 'website',
    skill_name: params.get('skill') || null,
    obs_session_id: getQueryValue(params, ['obs_session_id', 'session_id']),
    task_id: getQueryValue(params, ['task_id', 'task']),
    run_id: getQueryValue(params, ['run_id', 'agent_run_id', 'run']),
    langfuse_trace_id: getQueryValue(params, ['langfuse_trace_id', 'trace_id']),
    feedback_type: activePanel === 'feedback' ? 'website_feedback' : `website_${activePanel}`,
    message,
    user_agent: navigator.userAgent,
    metadata: {
      source: 'hermes_command_layer',
      shortcut_panel: activePanel,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    },
  };
}

function formatFeedTime(value) {
  if (!value) return 'recent';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function HermesCommandLayer() {
  const [open, setOpen] = useState(false);
  const [activePanel, setActivePanel] = useState('chat');
  const [query, setQuery] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState('idle');
  const [opsFeed, setOpsFeed] = useState([]);
  const [opsFeedStatus, setOpsFeedStatus] = useState('idle');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Panel shortcuts open an in-modal view; href shortcuts navigate to a route.
  function activateShortcut(shortcut) {
    if (shortcut.href) {
      setOpen(false);
      navigate(shortcut.href);
      return;
    }
    setActivePanel(shortcut.id);
    setQuery('');
  }

  const active = panels[activePanel] ?? panels.chat;
  const filteredShortcuts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return shortcuts;
    return shortcuts.filter((shortcut) =>
      `${shortcut.label} ${shortcut.description} ${shortcut.keys.join(' ')}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  useEffect(() => {
    function handleKeyDown(event) {
      const isCtrl = event.ctrlKey || event.metaKey;
      if (!isCtrl) {
        if (event.key === 'Escape') setOpen(false);
        return;
      }

      const key = event.key.toLowerCase();
      const shortcutMap = {
        k: 'chat',
        h: 'smoke-chat',
        o: 'session',
        j: 'feedback',
        b: 'brain',
        m: 'board',
        ';': 'library',
        ',': 'overview',
        "'": 'repos',
        '.': 'observability',
        '/': 'shortcuts',
      };

      const nextPanel = shortcutMap[key];
      if (nextPanel) {
        event.preventDefault();
        const shortcut = shortcuts.find((s) => s.id === nextPanel);
        if (shortcut?.href) {
          setOpen(false);
          navigate(shortcut.href);
          return;
        }
        setActivePanel(nextPanel);
        setOpen(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 40);
    } else {
      setQuery('');
    }
  }, [open, activePanel]);

  useEffect(() => {
    if (!open || !['session', 'board'].includes(activePanel) || opsFeed.length > 0 || opsFeedStatus === 'loading') {
      return;
    }

    setOpsFeedStatus('loading');
    fetchPublicOpsFeed({ limit: 5 })
      .then((rows) => {
        setOpsFeed(Array.isArray(rows) ? rows : []);
        setOpsFeedStatus('ready');
      })
      .catch((error) => {
        console.error('Ops feed load failed:', error);
        setOpsFeedStatus('error');
      });
  }, [activePanel, open, opsFeed.length, opsFeedStatus]);

  async function handleSubmitCommand() {
    const message = query.trim();
    if (!message) return;

    if (activePanel !== 'feedback') {
      setQuery('');
      return;
    }

    try {
      setFeedbackStatus('submitting');
      await insertWebsiteFeedback(buildFeedbackPayload(message, activePanel));
      setFeedbackStatus('success');
      setQuery('');
    } catch (error) {
      console.error('Feedback submission failed:', error);
      setFeedbackStatus('error');
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setActivePanel('chat');
          setOpen(true);
        }}
        className="fixed bottom-5 right-5 z-50 flex min-h-11 items-center gap-2 rounded-lg border border-[#D6D4C8] bg-[#191919] px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_-28px_rgba(25,25,25,0.8)] transition hover:-translate-y-0.5 hover:bg-[#D97757]"
        aria-label="Open Hermes command layer"
      >
        <MessageSquareText size={17} />
        <span>Hermes</span>
        <span className="hidden text-xs opacity-75 sm:inline">Ctrl K</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#191919]/20 px-4 py-6 backdrop-blur-sm sm:py-10" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close Hermes command layer"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={() => setOpen(false)}
      />
      <section className="relative mx-auto grid max-h-[calc(100dvh-48px)] max-w-5xl overflow-hidden rounded-lg border border-[#D6D4C8] bg-[#F3F1E7]/95 shadow-[0_28px_90px_-48px_rgba(25,25,25,0.7)] sm:max-h-[calc(100dvh-80px)] lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-[#D6D4C8] bg-[#E6E4D9]/60 p-4 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D97757]">GB Automation</p>
              <h2 className="font-serif-display text-2xl leading-none text-[#191919]">Command layer</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid min-h-11 w-11 place-items-center rounded-lg border border-[#D6D4C8] bg-white/60 text-[#191919] transition hover:border-[#D97757]"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="grid gap-2">
            {shortcuts.map((shortcut) => {
              const Icon = shortcut.icon;
              const isActive = activePanel === shortcut.id;
              return (
                <button
                  key={shortcut.id}
                  type="button"
                  onClick={() => activateShortcut(shortcut)}
                  className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                    isActive
                      ? 'border-[#D97757] bg-white/70 text-[#191919]'
                      : 'border-transparent text-[#5C5C5C] hover:border-[#D6D4C8] hover:bg-white/50 hover:text-[#191919]'
                  }`}
                >
                  <Icon size={17} className={isActive ? 'text-[#D97757]' : 'text-[#8C8A84]'} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{shortcut.label}</span>
                    <span className="mt-1 flex gap-1">
                      {shortcut.keys.map((key) => (
                        <KeyCap key={key}>{key}</KeyCap>
                      ))}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-h-0 overflow-y-auto p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-[#D6D4C8] pb-5">
            <div className="max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#D97757]">{active.eyebrow}</p>
              <h1 className="mt-2 font-serif-display text-4xl leading-none text-[#191919] sm:text-5xl">{active.title}</h1>
              <p className="mt-3 text-sm leading-6 text-[#5C5C5C] sm:text-base">{active.body}</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#5C5C5C]">
              <Sparkles size={16} className="text-[#D97757]" />
              <span>Hermes online</span>
            </div>
          </div>

          {activePanel === 'shortcuts' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {shortcuts.map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                  <article key={shortcut.id} className="rounded-lg border border-[#D6D4C8] bg-white/55 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <Icon size={18} className="text-[#D97757]" />
                      <div className="flex gap-1">
                        {shortcut.keys.map((key) => (
                          <KeyCap key={key}>{key}</KeyCap>
                        ))}
                      </div>
                    </div>
                    <h3 className="font-serif-display text-2xl leading-none text-[#191919]">{shortcut.label}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#5C5C5C]">{shortcut.description}</p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="rounded-lg border border-[#D6D4C8] bg-white/55">
                <div className="border-b border-[#D6D4C8] p-4">
                  <div className="rounded-lg border border-[#D6D4C8] bg-[#F3F1E7]/70 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D97757]">Hermes</p>
                    <p className="mt-2 text-sm leading-6 text-[#5C5C5C]">
                      I can keep this website session running, collect feedback, and route useful context into the GB Automation workspace.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 p-4">
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleSubmitCommand();
                      }
                    }}
                    placeholder={active.prompt}
                    className="input-field min-h-12 min-w-0 flex-1 rounded-lg px-4 py-3 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleSubmitCommand}
                    disabled={feedbackStatus === 'submitting'}
                    className="grid min-h-12 w-12 place-items-center rounded-lg border border-[#191919] bg-[#191919] text-white transition hover:border-[#D97757] hover:bg-[#D97757]"
                    aria-label="Send to Hermes"
                  >
                    <Send size={17} />
                  </button>
                </div>
                {activePanel === 'feedback' && feedbackStatus !== 'idle' && (
                  <p className="px-4 pb-4 text-sm font-semibold text-[#5C5C5C]">
                    {feedbackStatus === 'submitting' && 'Sending feedback...'}
                    {feedbackStatus === 'success' && 'Feedback routed into the consulting pipeline.'}
                    {feedbackStatus === 'error' && 'Feedback did not send. Try again in a moment.'}
                  </p>
                )}
              </div>

              <aside className="rounded-lg border border-[#D6D4C8] bg-[#E6E4D9]/55 p-4">
                {['session', 'board'].includes(activePanel) ? (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D97757]">Live ops feed</p>
                    <div className="mt-3 grid gap-2">
                      {opsFeedStatus === 'loading' && <p className="text-sm text-[#5C5C5C]">Loading recent sessions...</p>}
                      {opsFeedStatus === 'error' && <p className="text-sm text-[#5C5C5C]">Ops feed unavailable.</p>}
                      {opsFeed.map((item) => (
                        <article key={item.session_id} className="rounded-lg border border-[#D6D4C8] bg-white/50 p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-xs font-bold uppercase text-[#D97757]">{item.health}</span>
                            <span className="text-[11px] text-[#8C8A84]">{formatFeedTime(item.last_ts)}</span>
                          </div>
                          <p className="truncate text-sm font-semibold text-[#191919]">{item.agent_name}</p>
                          <p className="mt-1 text-xs text-[#5C5C5C]">
                            {item.event_count} events · {item.total_tokens || 0} tk · {item.has_trace ? 'trace linked' : 'no trace'}
                          </p>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D97757]">Matching commands</p>
                    <div className="mt-3 grid gap-2">
                      {filteredShortcuts.map((shortcut) => {
                        const Icon = shortcut.icon;
                        return (
                          <button
                            key={shortcut.id}
                            type="button"
                            onClick={() => activateShortcut(shortcut)}
                            className="flex min-h-12 items-center gap-3 rounded-lg border border-[#D6D4C8] bg-white/50 px-3 py-2 text-left transition hover:border-[#D97757]"
                          >
                            <Icon size={16} className="text-[#D97757]" />
                            <span>
                              <span className="block text-sm font-semibold text-[#191919]">{shortcut.label}</span>
                              <span className="text-xs text-[#5C5C5C]">{shortcut.keys.join(' ')}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-4 rounded-lg border border-[#D6D4C8] bg-white/45 p-3 text-sm leading-6 text-[#5C5C5C]">
                      <BookOpen size={16} className="mb-2 text-[#D97757]" />
                      Ctrl-J feedback now writes to Supabase and can join against Hermes runs, task IDs, and Langfuse traces when the page URL carries those IDs.
                    </div>
                  </>
                )}
              </aside>
            </div>
          )}
        </main>
      </section>
    </div>
  );
}

export default HermesCommandLayer;
