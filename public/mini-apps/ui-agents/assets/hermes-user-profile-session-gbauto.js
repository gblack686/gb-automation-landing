import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";
import "./eagle-onboarding-chat-gbauto.js";

export default {
  name: "HermesUserProfileSessionGbauto",
  render() {
    const setting = (name, value) => h("div", { class: "gb-hf-profile-row" }, [h("span", name), h("b", value)]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-hf-frame" }, [
        h("header", { class: "gb-hf-hero" }, [
          h("div", [h("div", { class: "gb-eagle-kicker" }, "Hermes / website profile"), h("h1", "Visitor profile and session")]),
          h("p", "A dedicated website profile gives Hermes memory, repo permissions, feedback routing, and page-aware continuity without treating every visit as anonymous.")
        ]),
        h("div", { class: "gb-hf-review-grid" }, [
          h("section", { class: "gb-hf-panel" }, [
            h("div", { class: "gb-hf-section-label" }, "Profile"),
            h("h2", "gbauto-site-user"),
            setting("Session", "site-20260608-a17c"),
            setting("Context", "website + selected repo map"),
            setting("Access", "read-only, write requests gated"),
            setting("Pipeline", "consulting intake enabled"),
            setting("Feedback", "attached to current page")
          ]),
          h("aside", { class: "gb-hf-panel" }, [
            h("div", { class: "gb-hf-section-label" }, "Running thread"),
            h("p", "Hermes remembers the visitor's page path, questions, selected project, and pending actions. Ctrl-O opens this session card from anywhere."),
            h("div", { class: "gb-hf-progress" }, h("span", { style: { width: "64%" } })),
            h("small", "64% profile confidence from current session")
          ])
        ])
      ])
    ]);
  }
};
