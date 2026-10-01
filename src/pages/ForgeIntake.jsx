import { useEffect, useRef } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

export default function ForgeIntake() {
  const frame = useRef(null);
  const draft = new URLSearchParams(window.location.search).get('draft');
  const source = draft && /^[0-9a-f-]{36}$/i.test(draft)
    ? `/forge/?draft=${encodeURIComponent(draft)}`
    : '/forge/';

  useEffect(() => {
    let active = true;
    async function answer(event) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow ||
          event.data?.kind !== 'forge-auth-request' || typeof event.data.id !== 'string') return;
      let token = null;
      try {
        const session = await fetchAuthSession();
        token = session.tokens?.idToken?.toString() || null;
      } catch {
        if (active) window.location.assign('/login?next=' + encodeURIComponent(window.location.pathname + window.location.search));
      }
      if (active) frame.current?.contentWindow?.postMessage({ kind: 'forge-auth-result', id: event.data.id, token }, window.location.origin);
    }
    window.addEventListener('message', answer);
    return () => { active = false; window.removeEventListener('message', answer); };
  }, []);

  return <iframe ref={frame} title="Agent Forge intake" src={source}
    style={{ display: 'block', width: '100%', height: '100vh', border: 0 }} />;
}
