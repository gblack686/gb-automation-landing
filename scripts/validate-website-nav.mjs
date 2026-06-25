import assert from 'node:assert/strict';
import { buildWebsiteNavContext } from '../src/lib/websiteNavContext.js';

function mockWindow() {
  const storage = new Map();
  return {
    location: {
      href: 'https://gbautomation.xyz/chat?client=smoke-client',
    },
    document: {
      title: 'Chat - GB Automation',
      referrer: 'https://gbautomation.xyz/',
    },
    navigator: {
      userAgent: 'node-test',
    },
    innerWidth: 1280,
    innerHeight: 720,
    crypto: {
      randomUUID: () => 'website-nav-session',
    },
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    },
    getSelection: () => ({
      rangeCount: 0,
      toString: () => '',
    }),
  };
}

const context = buildWebsiteNavContext(mockWindow(), {
  client_slug: 'smoke-client',
  profile: 'smoke-client',
});

assert.equal(context.agent_mode, 'triage_only');
assert.equal(context.response_policy, 'database_receipt_first');
assert.equal(context.website_nav.skill, 'website-nav');
assert.equal(context.website_nav.version, 1);
assert.equal(context.website_nav.route, '/chat?client=smoke-client');
assert.equal(context.website_nav.page_url, 'https://gbautomation.xyz/chat?client=smoke-client');
assert.equal(context.website_nav.page_title, 'Chat - GB Automation');
assert.equal(context.website_nav.client_slug, 'smoke-client');
assert.equal(context.website_nav.profile, 'smoke-client');
assert.equal(context.website_nav.session_id, 'website-nav-session');
assert.deepEqual(context.website_nav.viewport, { width: 1280, height: 720 });

console.log('website-nav context contract passed');
