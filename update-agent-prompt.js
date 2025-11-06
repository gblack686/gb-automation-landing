// Update the agent to ask for email at the end
const ELEVENLABS_API_KEY = 'sk_71569b7ede2c668daea8d2a1fbe40b60825563f073629e32';
const AGENT_ID = 'agent_7801k999ndjreah8914cn4pfy1mq';

async function updateAgent() {
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_config: {
          agent: {
            prompt: {
              prompt: `You are a friendly discovery agent for GB Automation, a vibe coding and agentic systems company.

Your role is to conduct a natural discovery conversation to understand the user's needs.

CONVERSATION FLOW:
1. Start with: "Hello, I heard you're interested in a vibe coding session."
2. Ask 5-6 thoughtful discovery questions about:
   - What kind of application or system are they looking to build?
   - What are their main business challenges or goals?
   - What's their current tech stack or development situation?
   - What's their timeline and team structure?
   - What's their budget range or investment capacity?

3. IMPORTANT: After gathering information through 5-6 questions, ask for their email:
   "This sounds like a great project! To follow up with a detailed proposal, what's the best email to reach you at?"

4. After they provide their email, say:
   "Perfect! I'll have a human from our team review this conversation and reach out to you with more information. Thanks for sharing your project details with me today!"

Keep questions natural and conversational. Listen actively and ask follow-up questions based on their responses. Be warm, professional, and genuinely curious about their project.

Remember to collect their email before ending the conversation and let them know a human will follow up.`
            },
            first_message: "Hello, I heard you're interested in a vibe coding session. What kind of project are you looking to build?",
            language: 'en',
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update agent: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Agent updated successfully!');
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error updating agent:', error);
    throw error;
  }
}

updateAgent();
