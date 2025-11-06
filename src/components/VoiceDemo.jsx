import { useState, useEffect, useRef } from 'react';
import { useConversation } from '@elevenlabs/react';

export default function VoiceDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [turnCount, setTurnCount] = useState(0);
  const [userEmail, setUserEmail] = useState('');
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const transcriptRef = useRef(null);

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs agent');
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs agent');
    },
    onMessage: (message) => {
      console.log('Message received:', message);

      // Track messages in transcript
      if (message.type === 'user_transcript' || message.type === 'agent_response') {
        const speaker = message.type === 'user_transcript' ? 'User' : 'Agent';
        const text = message.message || message.text || '';

        setTranscript(prev => [...prev, { speaker, text, timestamp: new Date() }]);

        // Increment turn count when user speaks
        if (message.type === 'user_transcript') {
          setTurnCount(prev => {
            const newCount = prev + 1;
            // Show email prompt after 4th user turn
            if (newCount === 4 && !emailSubmitted) {
              setShowEmailPrompt(true);
            }
            return newCount;
          });
        }
      }
    },
    onError: (error) => {
      console.error('Conversation error:', error);
    },
  });

  const handleStartDemo = async () => {
    setIsOpen(true);
    setTranscript([]);
    setTurnCount(0);
    setShowEmailPrompt(false);
    setEmailSubmitted(false);

    try {
      await conversation.startSession({
        agentId: 'agent_7801k999ndjreah8914cn4pfy1mq',
        connectionType: 'websocket',
        overrides: {
          agent: {
            prompt: {
              prompt: `You are a friendly discovery agent for GB Automation, a vibe coding and agentic systems company.

Your role is to conduct a natural discovery conversation to understand the user's needs. Start with: "Hello, I heard you're interested in a vibe coding session."

Then ask thoughtful discovery questions such as:
- What kind of application or system are they looking to build?
- What are their main business challenges or goals?
- What's their current tech stack or development situation?
- What's their timeline and team structure?

Keep questions natural and conversational. Listen actively and ask follow-up questions based on their responses. After 4 conversational turns, you'll be prompted to collect their email.

Be warm, professional, and genuinely curious about their project.`
            },
            firstMessage: "Hello, I heard you're interested in a vibe coding session.",
            language: 'en',
          },
          tts: {
            voiceId: 'CaJslL1xziwefCeTNzHv',
          },
        },
      });
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  const handleStopDemo = () => {
    conversation.endSession();
    setIsOpen(false);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (userEmail) {
      // Save email and transcript
      const conversationData = {
        email: userEmail,
        transcript: transcript,
        timestamp: new Date().toISOString(),
      };

      console.log('Saving conversation data:', conversationData);

      // TODO: Send to your backend/database
      // For now, we'll just log it and save to localStorage
      const savedConversations = JSON.parse(localStorage.getItem('voiceDemoConversations') || '[]');
      savedConversations.push(conversationData);
      localStorage.setItem('voiceDemoConversations', JSON.stringify(savedConversations));

      setEmailSubmitted(true);
      setShowEmailPrompt(false);

      // You could send a message to the agent to thank them
      alert('Thank you! We\'ll be in touch soon.');
    }
  };

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <>
      {/* Demo Button */}
      {!isOpen && (
        <button
          onClick={handleStartDemo}
          className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-bold text-lg rounded-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center gap-3"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
          Try Voice Demo
          <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded-full font-bold animate-pulse">
            NEW
          </span>
        </button>
      )}

      {/* Voice Demo Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl border-2 border-cyan-400 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg
                  className="w-8 h-8 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                <div>
                  <h3 className="text-2xl font-bold text-black">Voice Discovery Session</h3>
                  <p className="text-black text-sm">Powered by GB Automation AI</p>
                </div>
              </div>
              <button
                onClick={handleStopDemo}
                className="text-black hover:text-gray-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Status Indicator */}
            <div className="bg-gray-800 px-6 py-3 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${conversation.status === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
                <span className="text-white text-sm">
                  {conversation.status === 'connected' ? 'Connected' : 'Connecting...'}
                </span>
              </div>
              {conversation.isSpeaking && (
                <div className="flex items-center gap-2 text-cyan-400">
                  <div className="flex gap-1">
                    <div className="w-1 h-4 bg-cyan-400 rounded animate-pulse" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-4 bg-cyan-400 rounded animate-pulse" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-4 bg-cyan-400 rounded animate-pulse" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="text-sm">Agent speaking...</span>
                </div>
              )}
            </div>

            {/* Transcript */}
            <div
              ref={transcriptRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-950"
            >
              {transcript.length === 0 ? (
                <div className="text-center text-gray-500 py-12">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <p>Start speaking to begin your discovery session...</p>
                  <p className="text-sm mt-2">Make sure your microphone is enabled</p>
                </div>
              ) : (
                transcript.map((entry, idx) => (
                  <div
                    key={idx}
                    className={`flex ${entry.speaker === 'User' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        entry.speaker === 'User'
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-800 text-gray-100 border border-gray-700'
                      }`}
                    >
                      <p className="text-xs font-semibold mb-1 opacity-70">
                        {entry.speaker}
                      </p>
                      <p>{entry.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Email Prompt */}
            {showEmailPrompt && !emailSubmitted && (
              <div className="bg-yellow-400 text-black p-4 border-t-2 border-yellow-500">
                <form onSubmit={handleEmailSubmit} className="flex gap-2 items-center">
                  <label className="font-semibold whitespace-nowrap">Your email:</label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="flex-1 px-3 py-2 rounded border-2 border-black text-black"
                  />
                  <button
                    type="submit"
                    className="bg-black text-yellow-400 px-6 py-2 rounded font-bold hover:bg-gray-800 transition-colors"
                  >
                    Submit
                  </button>
                </form>
              </div>
            )}

            {/* Footer */}
            <div className="bg-gray-800 px-6 py-4 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <p className="text-gray-400 text-sm">
                  Turn {turnCount}/4 {emailSubmitted && '✓ Email collected'}
                </p>
                <button
                  onClick={handleStopDemo}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors text-sm font-semibold"
                >
                  End Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
