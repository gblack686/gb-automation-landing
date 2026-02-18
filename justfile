# GB Automation Landing + Customer Portal — Smoke Tests & Dev Recipes
# Uses the bowser browser automation framework for UI validation

app_url := "http://localhost:5173"
stories_dir := "ai_review/user_stories"

# List available commands
default:
    @just --list

# ─── Dev Server ─────────────────────────────────────────────────

# Start the Vite dev server
dev:
    cd gb-automation-landing && npm run dev

# Build for production
build:
    cd gb-automation-landing && npx vite build

# ─── Layer 1: Quick Smoke Tests (Skill — direct) ───────────────

# Quick smoke test — dashboard loads (headless Playwright)
smoke-dashboard headed="true":
    claude --dangerously-skip-permissions --model opus "/playwright-bowser (headed: {{headed}}) Navigate to {{app_url}}/dashboard. Verify the 3-panel layout loads with Sessions sidebar, Activity Stream center panel, and Chat panel on the right. Verify the header shows 'GB Automation' and 'Customer Portal'. Verify the chat input is present."

# Quick smoke test — landing page loads
smoke-landing headed="true":
    claude --dangerously-skip-permissions --model opus "/playwright-bowser (headed: {{headed}}) Navigate to {{app_url}}/. Verify the homepage loads with a hero section, features section, portfolio section, and pricing section. Verify the page scrolls smoothly."

# Quick smoke test — PRD generator loads
smoke-prd headed="true":
    claude --dangerously-skip-permissions --model opus "/playwright-bowser (headed: {{headed}}) Navigate to {{app_url}}/plan. Verify the PRD Generator page loads with a chat panel on the left and a Table of Contents on the right. Verify at least 5 sections are listed."

# Quick smoke test — dashboard responsive (mobile)
smoke-mobile headed="true":
    claude --dangerously-skip-permissions --model opus "/playwright-bowser (headed: {{headed}}) Navigate to {{app_url}}/dashboard. Resize viewport to 375x812. Verify the layout collapses to single-column with the chat panel visible. Verify the sessions sidebar is hidden. Verify the chat input is usable."

# ─── Layer 2: QA Agent Tests (Subagent — structured) ───────────

# QA test — dashboard full validation
qa-dashboard headed="true":
    claude --dangerously-skip-permissions --model opus "Use a @bowser-qa-agent: (headed: {{headed}}) Navigate to {{app_url}}/dashboard. Verify the 3-panel layout renders: Sessions sidebar on the left, Activity Stream in the center, Chat on the right. Verify the header has 'GB Automation' and 'Customer Portal' text. Verify width toggle buttons SM/MD/LG are present. Verify the Sessions panel has a '+ New' button. Verify the Activity Stream has filter buttons: All, Tools, Thinking, Errors. Verify the Chat panel has a text input and send button. Click the 'LG' width toggle. Verify the chat panel width changes. Click the back arrow. Verify navigation to the homepage."

# QA test — landing page full validation
qa-landing headed="true":
    claude --dangerously-skip-permissions --model opus "Use a @bowser-qa-agent: (headed: {{headed}}) Navigate to {{app_url}}/. Verify the homepage loads with a hero section including a headline and CTA button. Scroll down and verify a features section is visible. Scroll down and verify a portfolio section shows project cards. Scroll down and verify a pricing section with at least 2 tiers. Scroll to the bottom and verify a contact form with name, email, and description fields. Verify a submit button is present."

# QA test — PRD generator validation
qa-prd headed="true":
    claude --dangerously-skip-permissions --model opus "Use a @bowser-qa-agent: (headed: {{headed}}) Navigate to {{app_url}}/plan. Verify the PRD Generator page loads with a header showing 'PRD Generator'. Verify a progress bar is visible. Verify a chat panel is on the left with a text input. Verify a Table of Contents is on the right with at least 5 numbered sections. Verify each section has a Start button. Verify a Live Preview section exists."

# QA test — cross-page navigation
qa-navigation headed="true":
    claude --dangerously-skip-permissions --model opus "Use a @bowser-qa-agent: (headed: {{headed}}) Navigate to {{app_url}}/. Verify the homepage loads. Find and click a link to the PRD Generator or /plan page. Verify the PRD Generator loads. Navigate to {{app_url}}/dashboard. Verify the dashboard 3-panel layout loads. Click the back arrow button in the header. Verify navigation returns to the homepage."

# ─── Layer 3: UI Review (Command — parallel orchestration) ─────

# Run ALL user stories in parallel (full UI review)
ui-review headed="headed" filter="" *flags="":
    claude --dangerously-skip-permissions --model opus "/ui-review {{headed}} {{filter}} {{flags}}"

# Run only dashboard stories
ui-review-dashboard headed="headed":
    claude --dangerously-skip-permissions --model opus "/ui-review {{headed}} dashboard"

# Run only landing page stories
ui-review-landing headed="headed":
    claude --dangerously-skip-permissions --model opus "/ui-review {{headed}} landing"

# Run only responsive stories
ui-review-responsive headed="headed":
    claude --dangerously-skip-permissions --model opus "/ui-review {{headed}} responsive"

# ─── Layer 4: Compound Recipes ──────────────────────────────────

# Run all quick smoke tests sequentially
smoke-all headed="true":
    just smoke-landing {{headed}}
    just smoke-dashboard {{headed}}
    just smoke-prd {{headed}}
    just smoke-mobile {{headed}}

# Run all QA tests sequentially
qa-all headed="true":
    just qa-landing {{headed}}
    just qa-dashboard {{headed}}
    just qa-prd {{headed}}
    just qa-navigation {{headed}}

# Full validation — build + all smoke tests
validate headed="true":
    just build
    just smoke-all {{headed}}

# ─── Gateway Proxy ──────────────────────────────────────────────

# Start the customer gateway proxy locally (for testing)
proxy-start:
    cd customer-gateway-proxy && npm install && node server.js

# Generate a customer token via the proxy admin API
proxy-token customer_id="test-customer" proxy_url="http://localhost:3050":
    curl -s -X POST {{proxy_url}}/admin/tokens -H "Content-Type: application/json" -d '{"customerId": "{{customer_id}}"}' | python -m json.tool

# Health check the proxy
proxy-health proxy_url="http://localhost:3050":
    curl -s {{proxy_url}}/health | python -m json.tool
