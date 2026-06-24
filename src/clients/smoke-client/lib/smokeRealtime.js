import { createClient } from '@supabase/supabase-js';

// Same url + anon key resolution as src/lib/supabaseOps.js (project aejkzyjrlsfryfidwedm).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://aejkzyjrlsfryfidwedm.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlamt6eWpybHNmcnlmaWR3ZWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Mzc5MTUsImV4cCI6MjA5NDExMzkxNX0.UFowowM9b9fkIhrUdQ4B8uGJwbEqGPBr-bPSQe8CKA0';

// Singleton anon Supabase client (Realtime tuned to a gentle event rate).
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 5 } },
});

/**
 * Subscribe to assistant replies for tenant=smoke-client over Supabase Realtime.
 * Calls `onAssistant(row)` for each newly-inserted assistant chat_messages row.
 * Returns an unsubscribe function.
 */
export function subscribeAssistant(onAssistant) {
  const channel = supabase
    .channel('chat:smoke-client')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: 'tenant=eq.smoke-client',
      },
      (payload) => {
        if (payload.new?.role === 'assistant') {
          onAssistant(payload.new);
        }
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Load recent chat history for tenant=smoke-client (oldest first).
 */
export async function loadHistory(limit = 50) {
  const { data } = await supabase
    .from('chat_messages')
    .select('id,role,content,created_at')
    .eq('tenant', 'smoke-client')
    .order('created_at', { ascending: true })
    .limit(limit);

  return data || [];
}
