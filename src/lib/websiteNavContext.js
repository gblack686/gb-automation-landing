import { captureFeedbackContext } from './feedbackContext.js';

export function buildWebsiteNavContext(win = window, overrides = {}) {
  const base = captureFeedbackContext(win, 'chat');
  const websiteNav = {
    skill: 'website-nav',
    version: 1,
    route: base.route,
    page_url: base.page_url,
    page_title: base.page_title,
    referrer: base.referrer,
    client_slug: overrides.client_slug || base.client_slug || 'gbautomation',
    profile: overrides.profile || base.profile || 'website',
    session_id: base.session_id,
    selected_text: base.selected_text,
    selected_text_hash: base.selected_text_hash,
    viewport: base.viewport,
    source: 'gbautomation-landing',
  };

  return {
    website_nav: websiteNav,
    agent_mode: 'triage_only',
    response_policy: 'database_receipt_first',
    ...overrides,
  };
}
