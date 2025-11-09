import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './PRDGenerator.css';

const PRDGenerator = () => {
  const [ws, setWs] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [prdDocument, setPrdDocument] = useState({
    sections: [],
    completedSections: [],
    progress: 0
  });
  const [activeSection, setActiveSection] = useState(null);
  const messagesEndRef = useRef(null);

  // PRD Template Sections - AWS FOCUSED
  const PRD_SECTIONS = [
    { id: 'overview', title: 'Product Overview', icon: '📋' },
    { id: 'personas', title: 'User Personas', icon: '👥' },
    { id: 'features', title: 'Core Features', icon: '⚡' },
    { id: 'datamodel', title: 'AWS Data Model', icon: '🗄️', aws: true },
    { id: 'architecture', title: 'AWS Architecture', icon: '☁️', aws: true },
    { id: 'api', title: 'API Design (Gateway/AppSync)', icon: '🔌', aws: true },
    { id: 'ux', title: 'UX Flows', icon: '🎨' },
    { id: 'techstack', title: 'AWS Tech Stack', icon: '🛠️', aws: true },
    { id: 'metrics', title: 'Success Metrics', icon: '📊' },
    { id: 'costs', title: 'AWS Cost Estimate', icon: '💰', aws: true },
    { id: 'timeline', title: 'Timeline', icon: '📅' }
  ];

  // Specialized prompt for PRD generation - AWS FOCUSED
  const PRD_SYSTEM_PROMPT = `You are an AWS-focused product requirement document (PRD) generation specialist.
Your goal is to help the customer create a comprehensive, detailed PRD for applications built EXCLUSIVELY on AWS services.

CRITICAL CONSTRAINT:
**ONLY recommend AWS services and AWS-native solutions. DO NOT suggest non-AWS alternatives.**

AWS SERVICE CATEGORIES TO USE:
- Compute: Lambda, ECS/Fargate, EC2, App Runner, Amplify
- Storage: S3, DynamoDB, RDS (Aurora), DocumentDB, ElastiCache
- API: API Gateway, AppSync (GraphQL)
- Auth: Cognito, IAM
- AI/ML: Bedrock, SageMaker, Rekognition, Comprehend, Textract, Transcribe
- Analytics: Athena, QuickSight, Kinesis, OpenSearch
- Integration: EventBridge, SNS, SQS, Step Functions
- Frontend: Amplify Hosting, CloudFront
- Monitoring: CloudWatch, X-Ray
- Security: WAF, Shield, KMS, Secrets Manager
- CI/CD: CodePipeline, CodeBuild, CodeDeploy

PROCESS:
1. Start by understanding their product vision
2. Systematically work through each section with focus on AWS services
3. After each user response, output the updated section in markdown format
4. Use clear headings, bullet points, and tables
5. Be specific with AWS service names and features
6. Always explain WHY you chose each AWS service
7. Suggest AWS best practices (Well-Architected Framework)

TECH STACK RULES:
- Database: ONLY DynamoDB, Aurora, RDS, or DocumentDB
- Backend: ONLY Lambda, ECS/Fargate, or App Runner
- Frontend: ONLY Amplify, S3+CloudFront
- Auth: ONLY Cognito
- AI: ONLY AWS AI/ML services (Bedrock, SageMaker, etc.)
- APIs: ONLY API Gateway or AppSync

STYLE:
- Friendly but professional
- AWS-focused and cloud-native
- Proactive (suggest what's missing)
- Detail-oriented with AWS specifics
- Ask ONE focused question at a time
- Celebrate progress ("Great! Section complete ✓")
- Always mention AWS service names explicitly

OUTPUT FORMAT:
Use markdown with clear section headers:
## 1. Product Overview
## 2. User Personas
## 3. Core Features
## 4. AWS Data Model
## 5. AWS Architecture
## 6. API Design
## 7. UX Flows
## 8. AWS Tech Stack
## 9. Success Metrics
## 10. AWS Cost Estimate
## 11. Timeline Estimate`;

  useEffect(() => {
    // Determine WebSocket protocol based on page protocol
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = import.meta.env.VITE_WS_URL || `${wsProtocol}//44.208.161.19:3000`;

    console.log(`Connecting to WebSocket at ${wsUrl}`);

    let websocket;
    try {
      websocket = new WebSocket(wsUrl);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setMessages([{
        role: 'assistant',
        content: `⚠️ **Connection Error**\n\nUnable to connect to the PRD Generator service.\n\n**Issue**: The service requires a secure WebSocket connection (wss://) but is currently configured for http only.\n\n**To fix this**, the Lightsail orchestrator needs SSL/TLS configured:\n1. Set up nginx with Let's Encrypt SSL\n2. Configure wss:// endpoint\n3. Update the WebSocket URL\n\nFor now, please contact support for assistance.`,
        timestamp: new Date()
      }]);
      return;
    }

    websocket.onopen = () => {
      console.log('Connected to PRD Generator');

      // Start session with AWS-focused prompt
      websocket.send(JSON.stringify({
        type: 'start_session',
        customerId: 'web-user-' + Date.now(),
        model: 'sonnet',
        permissionMode: 'plan',
        initialPrompt: `${PRD_SYSTEM_PROMPT}\n\nHello! I'm ready to help you create a comprehensive PRD for your application using AWS services. What would you like to build?`
      }));
    };

    websocket.onmessage = (event) => {
      handleWebSocketMessage(event.data);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ **Connection Error**\n\nThe PRD Generator service is currently unavailable.\n\n**Technical Details**: ${error.message || 'WebSocket connection failed'}\n\nPlease try again later or contact support.`,
        timestamp: new Date()
      }]);
    };

    websocket.onclose = (event) => {
      console.log('WebSocket connection closed', event.code, event.reason);
      if (event.code !== 1000 && event.code !== 1001) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `⚠️ **Connection Lost**\n\nThe connection to the PRD Generator was closed unexpectedly.\n\n**Code**: ${event.code}\n**Reason**: ${event.reason || 'Unknown'}\n\nPlease refresh the page to reconnect.`,
          timestamp: new Date()
        }]);
      }
    };

    setWs(websocket);

    return () => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse]);

  const handleWebSocketMessage = (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'session_started':
          setSessionId(message.sessionId);
          console.log('Session started:', message.sessionId);
          break;

        case 'claude_event':
          handleClaudeEvent(message.event);
          break;

        case 'claude_error':
          console.error('Claude error:', message.error);
          break;

        case 'error':
          console.error('Error:', message.error);
          break;
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  };

  const handleClaudeEvent = (event) => {
    switch (event.type) {
      case 'system':
        if (event.subtype === 'init') {
          console.log('Claude initialized:', event.model);
        }
        break;

      case 'stream_event':
        if (event.event?.type === 'message_start') {
          setIsTyping(true);
        } else if (event.event?.type === 'content_block_delta') {
          const text = event.event.delta?.text || '';
          setCurrentResponse(prev => prev + text);
          updatePRDDocument(currentResponse + text);
        } else if (event.event?.type === 'message_stop') {
          setIsTyping(false);
        }
        break;

      case 'assistant':
        const content = event.message?.content?.[0]?.text || event.content?.[0]?.text || '';
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: content,
          timestamp: new Date()
        }]);
        setCurrentResponse('');
        setIsTyping(false);
        break;

      case 'user':
        // User message echoed back
        break;

      case 'result':
        console.log('Session result:', event);
        break;
    }
  };

  const updatePRDDocument = (text) => {
    // Parse markdown sections from Claude's response
    const sections = [];
    const regex = /^##\s+(\d+)\.\s+(.+)$/gm;
    let match;
    const matches = [];

    while ((match = regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        number: parseInt(match[1]),
        title: match[2],
        fullMatch: match[0]
      });
    }

    matches.forEach((match, idx) => {
      const startPos = match.index + match.fullMatch.length;
      const endPos = idx < matches.length - 1 ? matches[idx + 1].index : text.length;
      const content = text.substring(startPos, endPos).trim();

      sections.push({
        number: match.number,
        title: match.title,
        content,
        completed: content.length > 50
      });
    });

    setPrdDocument({
      sections,
      completedSections: sections.filter(s => s.completed),
      progress: sections.length > 0 ? (sections.filter(s => s.completed).length / PRD_SECTIONS.length) * 100 : 0
    });
  };

  const sendMessage = () => {
    if (!inputValue.trim() || !ws || !sessionId) return;

    ws.send(JSON.stringify({
      type: 'user_message',
      sessionId,
      content: inputValue
    }));

    setMessages(prev => [...prev, {
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    }]);

    setInputValue('');
    setIsTyping(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const jumpToSection = (sectionId) => {
    const section = PRD_SECTIONS.find(s => s.id === sectionId);
    if (section && sessionId && ws) {
      const message = `Let's work on the ${section.title} section now.`;
      ws.send(JSON.stringify({
        type: 'user_message',
        sessionId,
        content: message
      }));
      setMessages(prev => [...prev, {
        role: 'user',
        content: message,
        timestamp: new Date()
      }]);
      setIsTyping(true);
    }
  };

  const exportPRD = (format) => {
    const fullPRD = prdDocument.sections.map(s =>
      `## ${s.number}. ${s.title}\n\n${s.content}`
    ).join('\n\n');

    if (format === 'markdown') {
      const blob = new Blob([fullPRD], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product-requirements.md';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="prd-generator">
      {/* Header */}
      <div className="prd-header">
        <h1>📋 AWS-Focused PRD Generator</h1>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${prdDocument.progress}%` }}
          />
          <span className="progress-text">
            {Math.round(prdDocument.progress)}% Complete
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="prd-content">
        {/* Left: Chat Interface */}
        <div className="chat-panel">
          <div className="chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message message-${msg.role}`}>
                <div className="message-header">
                  <span className="message-role">
                    {msg.role === 'user' ? '👤 You' : '🤖 Claude'}
                  </span>
                  <span className="message-time">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="message-content">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}

            {isTyping && currentResponse && (
              <div className="message message-assistant streaming">
                <div className="message-header">
                  <span className="message-role">🤖 Claude</span>
                  <span className="typing-indicator">
                    <span></span><span></span><span></span>
                  </span>
                </div>
                <div className="message-content">
                  <ReactMarkdown>{currentResponse}</ReactMarkdown>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe your requirements..."
              disabled={!sessionId || isTyping}
            />
            <button onClick={sendMessage} disabled={!sessionId || isTyping}>
              Send
            </button>
          </div>
        </div>

        {/* Right: PRD Preview & Navigation */}
        <div className="prd-panel">
          {/* Section Navigator */}
          <div className="section-navigator">
            <h3>Table of Contents</h3>
            {PRD_SECTIONS.map((section, idx) => {
              const isCompleted = prdDocument.completedSections.some(
                s => s.title.toLowerCase().includes(section.title.toLowerCase())
              );
              const isCurrent = activeSection === section.id;

              return (
                <div
                  key={section.id}
                  className={`section-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
                  onClick={() => jumpToSection(section.id)}
                >
                  <span className="section-icon">
                    {isCompleted ? '✓' : section.icon}
                  </span>
                  <span className="section-title">
                    {idx + 1}. {section.title}
                  </span>
                  <button className="section-action">
                    {isCompleted ? 'Review' : 'Start'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Live PRD Preview */}
          <div className="prd-preview">
            <div className="preview-header">
              <h3>📄 Live Preview</h3>
              <div className="export-buttons">
                <button onClick={() => exportPRD('markdown')}>
                  📥 Download MD
                </button>
              </div>
            </div>

            <div className="preview-content">
              {prdDocument.sections.map((section, idx) => (
                <div key={idx} className="prd-section">
                  <h2>
                    {section.number}. {section.title}
                    {section.completed && <span className="section-badge">✓</span>}
                  </h2>
                  <ReactMarkdown>{section.content}</ReactMarkdown>
                </div>
              ))}

              {prdDocument.sections.length === 0 && (
                <div className="preview-empty">
                  <p>Your PRD will appear here as Claude builds it...</p>
                  <p>Start by answering Claude's questions!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PRDGenerator;
