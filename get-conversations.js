// Retrieve all conversations for the agent
const ELEVENLABS_API_KEY = 'sk_71569b7ede2c668daea8d2a1fbe40b60825563f073629e32';
const AGENT_ID = 'agent_7801k999ndjreah8914cn4pfy1mq';

async function getAllConversations() {
  try {
    // Get all conversations for this agent
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${AGENT_ID}&page_size=100`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get conversations: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`Found ${data.conversations?.length || 0} conversations\n`);

    if (data.conversations && data.conversations.length > 0) {
      for (const conv of data.conversations) {
        console.log('─'.repeat(80));
        console.log(`Conversation ID: ${conv.conversation_id}`);
        console.log(`Started: ${new Date(conv.created_at_unix_secs * 1000).toLocaleString()}`);
        console.log(`Status: ${conv.status}`);
        console.log(`Duration: ${conv.metadata?.duration_secs || 'N/A'}s`);

        // Get detailed conversation with transcript
        await getConversationDetails(conv.conversation_id);
      }
    } else {
      console.log('No conversations found yet.');
    }

    return data;
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
}

async function getConversationDetails(conversationId) {
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.log(`  Could not fetch details for ${conversationId}`);
      return;
    }

    const data = await response.json();

    // Display collected data
    if (data.analysis?.extracted_data) {
      console.log('\nCollected Data:');
      for (const [key, value] of Object.entries(data.analysis.extracted_data)) {
        if (value) {
          console.log(`  ${key}: ${value}`);
        }
      }
    }

    // Display transcript
    if (data.transcript) {
      console.log('\nTranscript:');
      for (const turn of data.transcript) {
        const speaker = turn.role === 'agent' ? 'Agent' : 'User';
        console.log(`  ${speaker}: ${turn.message}`);
      }
    }

  } catch (error) {
    console.log(`  Error getting details: ${error.message}`);
  }
}

getAllConversations();
