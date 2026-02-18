import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { formatTime } from '../../services/openclawService';

export default function CustomerChat({
  messages,
  streamingText,
  isTyping,
  isConnected,
  onSendMessage,
  cost,
  contextPercent,
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [userScrolled, setUserScrolled] = useState(false);

  // Auto-scroll when new messages arrive (unless user scrolled up)
  useEffect(() => {
    if (!userScrolled) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingText, isTyping, userScrolled]);

  function handleScroll() {
    const el = chatContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setUserScrolled(!atBottom);
  }

  function handleSend() {
    const text = input.trim();
    if (!text || !isConnected) return;
    onSendMessage(text);
    setInput('');
    setUserScrolled(false);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const contextColorClass = contextPercent >= 90
    ? 'text-red-500 animate-pulse'
    : contextPercent >= 70
      ? 'text-yellow-500'
      : contextPercent >= 50
        ? 'text-orange-400'
        : 'text-cyan-500';

  return (
    <div className="dashboard-chat flex flex-col h-full">
      {/* Header */}
      <div className="chat-header flex items-center justify-between px-4 py-2 border-b border-[#D6D4C8] bg-[#E6E4D9]/80">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium text-[#191919]">Consultant</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          {cost !== undefined && (
            <span className="text-[#5C5C5C]">${cost.toFixed(2)}</span>
          )}
          {contextPercent !== undefined && (
            <span className={contextColorClass}>{Math.round(contextPercent)}% ctx</span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="chat-messages flex-1 overflow-y-auto px-4 py-3 space-y-3"
      >
        {messages.length === 0 && !streamingText && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
            <p className="text-lg text-[#5C5C5C] mb-2">Start a conversation</p>
            <p className="text-sm text-[#8C8A84]">Describe what you want to build and we'll guide you through the planning process.</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Streaming response */}
        {streamingText && (
          <div className="message-bubble consultant">
            <div className="msg-header">
              <span className="msg-sender text-[#D97757]">CONSULTANT</span>
              <span className="msg-time text-[#8C8A84]">{formatTime(new Date())}</span>
            </div>
            <div className="msg-body prose prose-sm max-w-none">
              <ReactMarkdown>{streamingText}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && !streamingText && (
          <div className="flex items-center gap-1.5 px-3 py-2">
            <span className="typing-dot" />
            <span className="typing-dot" style={{ animationDelay: '0.15s' }} />
            <span className="typing-dot" style={{ animationDelay: '0.3s' }} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Scroll-to-bottom button */}
      {userScrolled && (
        <button
          onClick={() => {
            setUserScrolled(false);
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="absolute bottom-20 right-6 w-8 h-8 rounded-full bg-[#D97757] text-white flex items-center justify-center shadow-lg hover:bg-[#c4694c] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </button>
      )}

      {/* Input */}
      <div className="chat-input-area flex items-end gap-2 px-4 py-3 border-t border-[#D6D4C8] bg-[#E6E4D9]/60">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isConnected ? 'Describe your project...' : 'Connecting...'}
          disabled={!isConnected}
          rows={1}
          className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm bg-white/60 border border-[#D6D4C8] text-[#191919] placeholder-[#8C8A84] focus:outline-none focus:border-[#D97757] focus:bg-white transition-all"
          style={{ minHeight: '42px', maxHeight: '120px' }}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || !isConnected}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#D97757] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#c4694c] transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const { type, sender } = message;

  if (type === 'thinking') return <ThinkingBlock message={message} />;
  if (type === 'tool_use') return <ToolUseBlock message={message} />;
  return <TextMessage message={message} />;
}

function TextMessage({ message }) {
  const isUser = message.sender === 'user';
  return (
    <div className={`message-bubble ${isUser ? 'user' : 'consultant'}`}>
      <div className="msg-header">
        <span className={`msg-sender ${isUser ? 'text-[#2563eb]' : 'text-[#D97757]'}`}>
          {isUser ? 'YOU' : 'CONSULTANT'}
        </span>
        <span className="msg-time text-[#8C8A84]">{formatTime(message.timestamp)}</span>
      </div>
      <div className="msg-body prose prose-sm max-w-none">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  );
}

function ThinkingBlock({ message }) {
  const [expanded, setExpanded] = useState(false);
  const text = message.thinking || '';
  const isLong = text.length > 300;

  return (
    <div className="thinking-bubble">
      <div className="msg-header">
        <span className="msg-sender text-purple-500">
          <span className="mr-1">{'\uD83E\uDD14'}</span> THINKING
        </span>
        <span className="msg-time text-[#8C8A84]">{formatTime(message.timestamp)}</span>
      </div>
      <div className="msg-body text-sm italic text-purple-400/80 font-mono">
        {expanded || !isLong ? text : text.slice(0, 300) + '...'}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-purple-400 hover:text-purple-300 mt-1"
        >
          {expanded ? '\u25B2 Show Less' : '\u25BC Show More'}
        </button>
      )}
    </div>
  );
}

function ToolUseBlock({ message }) {
  const [expanded, setExpanded] = useState(false);
  const toolName = (message.toolName || 'unknown').replace(/^mcp__\w+__/, '');
  const inputStr = message.toolInput ? JSON.stringify(message.toolInput, null, 2) : null;
  const isLong = inputStr && inputStr.length > 200;

  return (
    <div className="tool-use-bubble">
      <div className="msg-header">
        <span className="msg-sender text-yellow-500">
          <span className="mr-1">{'\uD83D\uDD27'}</span> TOOL
        </span>
        <span className="msg-time text-[#8C8A84]">{formatTime(message.timestamp)}</span>
      </div>
      <div className="text-sm">
        <code className="text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded">{toolName}</code>
      </div>
      {inputStr && (
        <pre className="mt-1 text-xs text-[#8C8A84] bg-[#191919]/5 rounded p-2 overflow-x-auto">
          {expanded || !isLong ? inputStr : inputStr.slice(0, 200) + '\n...'}
        </pre>
      )}
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-yellow-500 hover:text-yellow-400 mt-1"
        >
          {expanded ? '\u25B2 Show Less' : '\u25BC Show More'}
        </button>
      )}
    </div>
  );
}
