// Script to create an ElevenLabs Conversational AI agent
const ELEVENLABS_API_KEY = 'sk_71569b7ede2c668daea8d2a1fbe40b60825563f073629e32';
const VOICE_ID = 'CaJslL1xziwefCeTNzHv';

async function createAgent() {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_config: {
          agent: {
            prompt: {
              prompt: `You are a friendly discovery agent for GB Automation, a vibe coding and agentic systems company.

Your role is to conduct a natural discovery conversation to understand the user's needs. Start with: "Hello, I heard you're interested in a vibe coding session."

Then ask thoughtful discovery questions such as:
- What kind of application or system are they looking to build?
- What are their main business challenges or goals?
- What's their current tech stack or development situation?
- What's their timeline and team structure?

Keep questions natural and conversational. Listen actively and ask follow-up questions based on their responses. Be warm, professional, and genuinely curious about their project. Guide the conversation naturally through about 4-5 exchanges to understand their needs.`
            },
            first_message: "Hello, I heard you're interested in a vibe coding session. What kind of project are you looking to build?",
            language: 'en',
          },
          tts: {
            voice_id: VOICE_ID,
          },
        },
        platform_settings: {
          overrides: {
            agent: {
              prompt: {
                llm: 'gpt-4',
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create agent: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Agent created successfully!');
    console.log('Agent ID:', data.agent_id);
    console.log('\nFull response:', JSON.stringify(data, null, 2));

    return data.agent_id;
  } catch (error) {
    console.error('Error creating agent:', error);
    throw error;
  }
}

createAgent();
