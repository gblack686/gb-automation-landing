import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";
import "./eagle-onboarding-chat-gbauto.js";

export default {
  name: "HermesKanbanBoardGbauto",
  render() {
    const card = (title, meta, tag) => h("article", { class: "gb-hf-kanban-card" }, [h("strong", title), h("p", meta), h("span", tag)]);
    const col = (name, count, cards) => h("section", { class: "gb-hf-kanban-col" }, [h("header", [h("b", name), h("em", count)]), ...cards]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-hf-frame" }, [
        h("header", { class: "gb-hf-hero" }, [
          h("div", [h("div", { class: "gb-eagle-kicker" }, "Hermes / Kanban bus"), h("h1", "Hermes Kanban board")]),
          h("p", "The website version of the Hermes board: work enters as cards, agents claim bounded tasks, and the operator keeps human gates visible.")
        ]),
        h("div", { class: "gb-hf-metrics" }, [
          h("article", { class: "gb-hf-metric" }, [h("b", "26"), h("span", "ready")]),
          h("article", { class: "gb-hf-metric" }, [h("b", "3"), h("span", "running")]),
          h("article", { class: "gb-hf-metric" }, [h("b", "79"), h("span", "blocked")]),
          h("article", { class: "gb-hf-metric" }, [h("b", "5m"), h("span", "steward loop")])
        ]),
        h("div", { class: "gb-hf-kanban" }, [
          col("Todo", "12", [
            card("Re-auth YouTube OAuth token", "Manual credential gate before nightly intel can run.", "blocked/manual"),
            card("Client profile builder smoke", "Verify profile scaffold and repo boundaries.", "gbauto")
          ]),
          col("Ready", "26", [
            card("Run Gmail poller smoke", "Verify transcript email to Linear issue and Telegram nudge.", "ops"),
            card("Create website Hermes profile", "Provision persistent website visitor context.", "profile")
          ]),
          col("Running", "3", [
            card("Kanban steward routing", "Assign ready work to concrete workers and reclaim stale runs.", "steward"),
            card("Feedback loop triage", "Group site feedback into consulting pipeline candidates.", "pipeline")
          ]),
          col("Human Gate", "4", [
            card("Approve write access model", "Choose read-only second brain or scoped write folders.", "operator"),
            card("Launch live site chat", "L6 approval after auth/session smoke test.", "approval")
          ])
        ])
      ])
    ]);
  }
};
