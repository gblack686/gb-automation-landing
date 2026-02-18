/**
 * OpenClaw Gateway WebSocket Service
 *
 * Connects to the customer gateway proxy on Lightsail,
 * which forwards to the OpenClaw gateway on localhost:18789.
 *
 * Message types handled:
 * - chat_stream: Streaming text chunks
 * - thinking_block: Agent reasoning (collapsible)
 * - tool_use_block: Tool executions (emoji + name)
 * - agent_log: Event stream entries
 * - orchestrator_updated: Cost/token updates
 * - session_started: Session confirmation
 * - error: Error messages
 */

const DEFAULT_PROXY_URL = 'ws://18.234.126.236:3050';

export function createOpenClawConnection(url, token, callbacks) {
  const wsUrl = url || import.meta.env.VITE_OPENCLAW_WS_URL || DEFAULT_PROXY_URL;
  const fullUrl = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;

  let ws = null;
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY_BASE = 2000;

  function connect() {
    try {
      ws = new WebSocket(fullUrl);
    } catch (err) {
      callbacks.onError?.({ message: 'Failed to create WebSocket connection', error: err });
      return null;
    }

    ws.onopen = () => {
      reconnectAttempts = 0;
      callbacks.onConnected?.();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        routeMessage(msg, callbacks);
      } catch (err) {
        console.error('[OpenClaw] Failed to parse message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('[OpenClaw] WebSocket error:', err);
      callbacks.onError?.({ message: 'WebSocket error', error: err });
    };

    ws.onclose = (event) => {
      callbacks.onDisconnected?.();
      if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttempts);
        reconnectAttempts++;
        console.log(`[OpenClaw] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
        reconnectTimer = setTimeout(connect, delay);
      }
    };

    return ws;
  }

  connect();

  return {
    send(type, payload) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, ...payload }));
      }
    },

    sendMessage(content, sessionId) {
      this.send('user_message', { content, sessionId });
    },

    startSession(options = {}) {
      this.send('start_session', {
        customerId: options.customerId || `web-${Date.now()}`,
        sessionType: options.sessionType || 'planning',
        skill: options.skill || 'customer-planning',
        ...options,
      });
    },

    loadSession(sessionId) {
      this.send('load_session', { sessionId });
    },

    disconnect() {
      clearTimeout(reconnectTimer);
      reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // prevent reconnect
      if (ws?.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Client disconnect');
      }
    },

    get isConnected() {
      return ws?.readyState === WebSocket.OPEN;
    },
  };
}

function routeMessage(msg, callbacks) {
  switch (msg.type) {
    case 'chat_stream':
      callbacks.onChatStream?.(msg.chunk, msg.is_complete);
      break;

    case 'chat_typing':
      callbacks.onTyping?.(msg.isTyping ?? true);
      break;

    case 'thinking_block':
      callbacks.onThinkingBlock?.(msg.data || msg);
      break;

    case 'tool_use_block':
      callbacks.onToolUseBlock?.(msg.data || msg);
      break;

    case 'agent_log':
      callbacks.onAgentLog?.(msg.data || msg);
      break;

    case 'orchestrator_chat':
      callbacks.onOrchestratorChat?.(msg.data || msg);
      break;

    case 'orchestrator_updated':
      callbacks.onOrchestratorUpdated?.(msg.orchestrator || msg);
      break;

    case 'session_started':
      callbacks.onSessionStarted?.(msg);
      break;

    case 'session_list':
      callbacks.onSessionList?.(msg.sessions || []);
      break;

    case 'scope_generated':
      callbacks.onScopeGenerated?.(msg.scope || msg);
      break;

    case 'scope_updated':
      callbacks.onScopeUpdated?.(msg.scope || msg);
      break;

    case 'connection_established':
      console.log('[OpenClaw] Connection established');
      break;

    case 'error':
      callbacks.onError?.(msg);
      break;

    default:
      console.log('[OpenClaw] Unhandled message type:', msg.type, msg);
  }
}

// Generate a unique message ID
export function generateId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Format timestamp for display
export function formatTime(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// Get context window color class based on percentage
export function getContextColor(percentage) {
  if (percentage >= 90) return 'context-critical';
  if (percentage >= 70) return 'context-warning';
  if (percentage >= 50) return 'context-moderate';
  return 'context-normal';
}

// Strip internal prefixes from tool names for display
export function cleanToolName(name) {
  if (!name) return 'unknown';
  return name.replace(/^mcp__\w+__/, '').replace(/_/g, ' ');
}

// Get emoji prefix for event types
export function getEventEmoji(type) {
  const map = {
    tool_use: '\uD83D\uDD27',
    thinking: '\uD83D\uDCAD',
    text: '\uD83D\uDCAC',
    error: '\u274C',
    success: '\u2705',
    info: '\u2139\uFE0F',
    warning: '\u26A0\uFE0F',
    scope: '\uD83D\uDCDD',
  };
  return map[type] || '\u25CF';
}
