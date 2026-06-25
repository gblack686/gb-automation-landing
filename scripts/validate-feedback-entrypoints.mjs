import assert from 'node:assert/strict';
import {
  buildWebsiteFeedbackPayload,
  captureFeedbackContext,
  __feedbackContextTest,
} from '../src/lib/feedbackContext.js';
import { buildSkillCreatorDraft } from '../src/ops/lib/agenticEntrypoints.js';

function mockWindow() {
  const storage = new Map();
  const selected = 'highlighted copy from the current page';
  const commonNode = {
    nodeType: 1,
    tagName: 'P',
    id: 'hero-copy',
    className: 'lede text',
    textContent: `Before ${selected} after`,
  };

  return {
    location: {
      href: 'https://gbautomation.xyz/ops/capabilities/skills?client=smoke-client&task=TAC-1&trace_id=trace-123',
    },
    document: {
      title: 'Skills - GB Automation',
      referrer: 'https://gbautomation.xyz/ops',
    },
    navigator: {
      userAgent: 'node-test',
    },
    innerWidth: 1440,
    innerHeight: 900,
    crypto: {
      randomUUID: () => 'session-test-uuid',
    },
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    },
    getSelection: () => ({
      rangeCount: 1,
      toString: () => selected,
      anchorNode: commonNode,
      focusNode: commonNode,
      getRangeAt: () => ({ commonAncestorContainer: commonNode }),
    }),
  };
}

const win = mockWindow();
const context = captureFeedbackContext(win, 'feedback');
assert.equal(context.page_url, win.location.href);
assert.equal(context.route, '/ops/capabilities/skills?client=smoke-client&task=TAC-1&trace_id=trace-123');
assert.equal(context.page_title, 'Skills - GB Automation');
assert.equal(context.client_slug, 'smoke-client');
assert.equal(context.task_id, 'TAC-1');
assert.equal(context.langfuse_trace_id, 'trace-123');
assert.equal(context.selected_text, 'highlighted copy from the current page');
assert.equal(context.agent_mode, 'triage_only');
assert.equal(context.triage_status, 'new');
assert.match(context.selected_text_hash, /^fnv1a32:[0-9a-f]{8}$/);
assert.equal(context.session_id, 'session-test-uuid');

const payload = buildWebsiteFeedbackPayload('Please improve this.', 'feedback', context);
assert.equal(payload.feedback_type, 'website_feedback');
assert.equal(payload.message, 'Please improve this.');
assert.equal(payload.metadata.source, 'hermes_command_layer');
assert.equal(payload.metadata.selected_text, context.selected_text);
assert.equal(payload.metadata.selected_text_hash, context.selected_text_hash);
assert.equal(payload.metadata.agent_mode, 'triage_only');

const topLevelKeys = Object.keys(payload).sort();
assert.deepEqual(topLevelKeys, [
  'board_slug',
  'client_slug',
  'feedback_type',
  'langfuse_trace_id',
  'message',
  'metadata',
  'obs_session_id',
  'page_url',
  'profile',
  'repo_slug',
  'route',
  'run_id',
  'skill_name',
  'task_id',
  'user_agent',
].sort());

assert.equal(
  __feedbackContextTest.safeString('  a   b  '),
  'a b',
);

const draft = buildSkillCreatorDraft({ route: '/ops/capabilities/skills' });
assert.equal(draft.entrypoint.agent_mode, 'triage_only');
assert.equal(draft.entrypoint.feedback_type, 'skill_create');
assert.equal(draft.entrypoint.preset, 'guided_skill_creator');
assert.match(draft.body, /## Purpose/);
assert.match(draft.summary, /agent_mode=triage_only/);

console.log('feedback entrypoint contracts passed');
