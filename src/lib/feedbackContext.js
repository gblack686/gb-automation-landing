const MAX_SELECTED_TEXT = 1200;
const MAX_CONTEXT_TEXT = 180;

function safeString(value, max = 500) {
  if (value == null) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function hashText(text) {
  if (!text) return null;
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function elementLabel(node) {
  if (!node) return null;
  const element = node.nodeType === 1 ? node : node.parentElement;
  if (!element) return null;
  const id = element.id ? `#${element.id}` : '';
  const classes = typeof element.className === 'string'
    ? element.className
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3)
      .map((name) => `.${name}`)
      .join('')
    : '';
  return `${element.tagName?.toLowerCase() || 'node'}${id}${classes}`;
}

function getSelectionContext(selection) {
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const sourceText = safeString(container?.textContent, MAX_CONTEXT_TEXT);
  return {
    anchor: elementLabel(selection.anchorNode),
    focus: elementLabel(selection.focusNode),
    common: elementLabel(container),
    text_context: sourceText,
  };
}

export function captureTextSelection(win = window) {
  const selection = win.getSelection?.();
  const selectedText = safeString(selection?.toString(), MAX_SELECTED_TEXT);
  if (!selectedText) return null;

  return {
    selected_text: selectedText,
    selected_text_hash: hashText(selectedText),
    selection_context: getSelectionContext(selection),
  };
}

export function getWebsiteSessionId(win = window) {
  const key = 'gbautomation.website_session_id';
  try {
    const existing = win.localStorage?.getItem(key);
    if (existing) return existing;
    const generated = win.crypto?.randomUUID?.() || `website-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    win.localStorage?.setItem(key, generated);
    return generated;
  } catch {
    return null;
  }
}

function getQueryValue(searchParams, names) {
  for (const name of names) {
    const value = searchParams.get(name);
    if (value) return value;
  }
  return null;
}

export function capturePageContext(win = window, activePanel = 'feedback') {
  const url = new URL(win.location.href);
  const params = url.searchParams;

  return {
    page_url: url.href,
    route: `${url.pathname}${url.search}`,
    page_title: safeString(win.document?.title, 240),
    referrer: safeString(win.document?.referrer, 500),
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
    user_agent: win.navigator?.userAgent || null,
    session_id: getWebsiteSessionId(win),
    viewport: {
      width: win.innerWidth || null,
      height: win.innerHeight || null,
    },
  };
}

export function captureFeedbackContext(win = window, activePanel = 'feedback') {
  const page = capturePageContext(win, activePanel);
  const selection = captureTextSelection(win);

  return {
    ...page,
    selected_text: selection?.selected_text || null,
    selected_text_hash: selection?.selected_text_hash || null,
    selection_context: selection?.selection_context || null,
    element_context: null,
    agent_mode: 'triage_only',
    triage_status: 'new',
  };
}

export function buildWebsiteFeedbackPayload(message, activePanel = 'feedback', context = captureFeedbackContext(window, activePanel)) {
  const metadata = {
    source: 'hermes_command_layer',
    shortcut_panel: activePanel,
    page_title: context.page_title,
    referrer: context.referrer,
    session_id: context.session_id,
    viewport: context.viewport,
    selected_text: context.selected_text,
    selected_text_hash: context.selected_text_hash,
    selection_context: context.selection_context,
    element_context: context.element_context,
    agent_mode: context.agent_mode,
    triage_status: context.triage_status,
  };

  return {
    page_url: context.page_url,
    route: context.route,
    client_slug: context.client_slug,
    repo_slug: context.repo_slug,
    board_slug: context.board_slug,
    profile: context.profile,
    skill_name: context.skill_name,
    obs_session_id: context.obs_session_id,
    task_id: context.task_id,
    run_id: context.run_id,
    langfuse_trace_id: context.langfuse_trace_id,
    feedback_type: context.feedback_type,
    message,
    user_agent: context.user_agent,
    metadata,
  };
}

export const __feedbackContextTest = {
  hashText,
  safeString,
};
