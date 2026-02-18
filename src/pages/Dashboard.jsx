import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createOpenClawConnection, generateId } from '../services/openclawService';
import CustomerChat from '../components/dashboard/CustomerChat';
import EventStream from '../components/dashboard/EventStream';
import SessionList from '../components/dashboard/SessionList';
import ScopePreview from '../components/dashboard/ScopePreview';
import '../components/dashboard/Dashboard.css';

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const connectionRef = useRef(null);

  // Session state
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Event stream
  const [events, setEvents] = useState([]);
  const eventCounterRef = useRef(0);

  // Orchestrator metrics
  const [cost, setCost] = useState(0);
  const [contextPercent, setContextPercent] = useState(0);

  // Scope
  const [scope, setScope] = useState(null);
  const [showScope, setShowScope] = useState(false);

  // Panel sizing
  const [chatWidth, setChatWidth] = useState('md'); // sm | md | lg
  const chatWidthMap = { sm: 380, md: 480, lg: 600 };

  // Add an event to the stream
  const addEvent = useCallback((sourceType, data) => {
    eventCounterRef.current += 1;
    setEvents((prev) => [
      ...prev,
      {
        id: generateId(),
        lineNumber: eventCounterRef.current,
        sourceType,
        timestamp: new Date(),
        ...data,
      },
    ]);
  }, []);

  // Connect to OpenClaw gateway
  useEffect(() => {
    const conn = createOpenClawConnection(null, token, {
      onConnected() {
        setIsConnected(true);
        addEvent('agent_log', { content: 'Connected to consultant', level: 'SUCCESS' });
      },

      onDisconnected() {
        setIsConnected(false);
        addEvent('agent_log', { content: 'Disconnected', level: 'WARNING' });
      },

      onSessionStarted(msg) {
        setActiveSessionId(msg.sessionId);
        setSessions((prev) => {
          const exists = prev.find((s) => s.id === msg.sessionId);
          if (exists) return prev;
          return [
            ...prev,
            {
              id: msg.sessionId,
              title: msg.title || 'Planning Session',
              type: msg.sessionType || 'planning',
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];
        });
        addEvent('agent_log', { content: `Session started: ${msg.sessionId}`, level: 'info' });
      },

      onSessionList(list) {
        setSessions(list);
      },

      onChatStream(chunk, isComplete) {
        if (isComplete) {
          // Move streaming text into messages
          setStreamingText((prev) => {
            if (prev) {
              setMessages((msgs) => [
                ...msgs,
                {
                  id: generateId(),
                  sender: 'consultant',
                  type: 'text',
                  content: prev + (chunk || ''),
                  timestamp: new Date(),
                },
              ]);
            }
            return '';
          });
          setIsTyping(false);
        } else {
          setStreamingText((prev) => prev + chunk);
          setIsTyping(true);
        }
      },

      onTyping(typing) {
        setIsTyping(typing);
      },

      onOrchestratorChat(msg) {
        // Full message from backend (replaces streaming)
        if (msg.sender === 'user') return; // already added locally
        setStreamingText('');
        setIsTyping(false);
        setMessages((prev) => {
          // Deduplicate by DB ID if present
          if (msg.id && prev.find((m) => m.id === msg.id)) return prev;
          return [
            ...prev,
            {
              id: msg.id || generateId(),
              sender: msg.sender === 'orchestrator' ? 'consultant' : msg.sender,
              type: msg.type || 'text',
              content: msg.content || '',
              thinking: msg.thinking,
              toolName: msg.toolName,
              toolInput: msg.toolInput,
              timestamp: msg.timestamp || new Date(),
            },
          ];
        });
      },

      onThinkingBlock(data) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.id || generateId(),
            sender: 'consultant',
            type: 'thinking',
            thinking: data.thinking,
            timestamp: data.timestamp || new Date(),
          },
        ]);
        addEvent('thinking_block', { content: (data.thinking || '').slice(0, 120) });
      },

      onToolUseBlock(data) {
        setMessages((prev) => [
          ...prev,
          {
            id: data.id || generateId(),
            sender: 'consultant',
            type: 'tool_use',
            toolName: data.tool_name || data.toolName,
            toolInput: data.tool_input || data.toolInput,
            timestamp: data.timestamp || new Date(),
          },
        ]);
        addEvent('tool_use_block', {
          content: data.tool_name || data.toolName,
          toolName: data.tool_name || data.toolName,
        });
      },

      onAgentLog(data) {
        addEvent('agent_log', {
          content: data.message || data.content || '',
          level: data.level || 'info',
          agentId: data.agent_id,
          agentName: data.agent_name,
        });
      },

      onOrchestratorUpdated(orch) {
        if (orch.total_cost !== undefined) setCost(orch.total_cost);
        if (orch.input_tokens !== undefined && orch.output_tokens !== undefined) {
          const maxContext = 200000; // Claude context window
          const used = orch.input_tokens + orch.output_tokens;
          setContextPercent((used / maxContext) * 100);
        }
      },

      onScopeGenerated(scopeData) {
        setScope(scopeData);
        setShowScope(true);
        addEvent('agent_log', { content: 'Scope of Work generated', level: 'SUCCESS' });

        // Update session status
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId
              ? { ...s, status: 'scope_generated', scopeVersion: scopeData.version || 1 }
              : s
          )
        );
      },

      onScopeUpdated(scopeData) {
        setScope(scopeData);
      },

      onError(err) {
        addEvent('agent_log', {
          content: err.message || 'Connection error',
          level: 'ERROR',
        });
      },
    });

    connectionRef.current = conn;
    return () => conn.disconnect();
  }, [token, addEvent]);

  // Send a chat message
  function handleSendMessage(text) {
    if (!connectionRef.current) return;

    const msg = {
      id: generateId(),
      sender: 'user',
      type: 'text',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);

    if (activeSessionId) {
      connectionRef.current.sendMessage(text, activeSessionId);
    } else {
      // Auto-start a new session with the first message
      connectionRef.current.startSession({ initialMessage: text });
    }
  }

  // Session management
  function handleNewSession() {
    setMessages([]);
    setStreamingText('');
    setEvents([]);
    eventCounterRef.current = 0;
    setScope(null);
    setShowScope(false);
    setActiveSessionId(null);
    connectionRef.current?.startSession();
  }

  function handleSelectSession(sessionId) {
    if (sessionId === activeSessionId) return;
    setMessages([]);
    setStreamingText('');
    setEvents([]);
    eventCounterRef.current = 0;
    setScope(null);
    setShowScope(false);
    setActiveSessionId(sessionId);
    connectionRef.current?.loadSession(sessionId);
  }

  // Scope actions
  function handleApproveScope() {
    connectionRef.current?.send('scope_action', {
      sessionId: activeSessionId,
      action: 'approve',
      scopeId: scope?.id,
    });
    setScope((prev) => (prev ? { ...prev, status: 'approved' } : prev));
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId ? { ...s, status: 'approved' } : s
      )
    );
  }

  function handleReviseScope(note) {
    connectionRef.current?.send('scope_action', {
      sessionId: activeSessionId,
      action: 'revise',
      scopeId: scope?.id,
      revisionNote: note,
    });
    addEvent('agent_log', { content: `Revision requested: ${note}`, level: 'info' });
  }

  function handleRejectScope() {
    connectionRef.current?.send('scope_action', {
      sessionId: activeSessionId,
      action: 'reject',
      scopeId: scope?.id,
    });
    setScope((prev) => (prev ? { ...prev, status: 'rejected' } : prev));
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId ? { ...s, status: 'rejected' } : s
      )
    );
  }

  return (
    <div className="dashboard-container">
      {/* Top bar */}
      <header className="dashboard-header">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-[#8C8A84] hover:text-[#191919] transition-colors"
            title="Back to home"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
          <span className="text-sm font-semibold text-[#191919]">GB Automation</span>
          <span className="text-[#8C8A84] text-sm">{'\u00B7'}</span>
          <span className="text-sm text-[#5C5C5C]">Customer Portal</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Chat width toggle */}
          <div className="flex items-center gap-1 bg-[#D6D4C8]/40 rounded-lg p-0.5">
            {['sm', 'md', 'lg'].map((size) => (
              <button
                key={size}
                onClick={() => setChatWidth(size)}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                  chatWidth === size
                    ? 'bg-white text-[#191919] shadow-sm'
                    : 'text-[#8C8A84] hover:text-[#5C5C5C]'
                }`}
              >
                {size.toUpperCase()}
              </button>
            ))}
          </div>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
      </header>

      {/* Main 3-panel layout */}
      <main
        className="dashboard-panels"
        style={{
          gridTemplateColumns: `220px 1fr ${chatWidthMap[chatWidth]}px`,
        }}
      >
        {/* Left: Sessions */}
        <div className="panel panel-sessions">
          <SessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
          />
        </div>

        {/* Center: Event Stream */}
        <div className="panel panel-events">
          <EventStream events={events} />
        </div>

        {/* Right: Chat */}
        <div className="panel panel-chat relative">
          <CustomerChat
            messages={messages}
            streamingText={streamingText}
            isTyping={isTyping}
            isConnected={isConnected}
            onSendMessage={handleSendMessage}
            cost={cost}
            contextPercent={contextPercent}
          />
        </div>
      </main>

      {/* Bottom: Scope Preview (when visible) */}
      {showScope && scope && (
        <ScopePreview
          scope={scope}
          onApprove={handleApproveScope}
          onRevise={handleReviseScope}
          onReject={handleRejectScope}
          onClose={() => setShowScope(false)}
        />
      )}
    </div>
  );
}
