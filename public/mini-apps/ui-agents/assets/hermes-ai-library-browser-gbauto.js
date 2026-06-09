import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";
import "./eagle-onboarding-chat-gbauto.js";

export default {
  name: "HermesAiLibraryBrowserGbauto",
  render() {
    const item = (name, kind, text) => h("article", { class: "gb-hf-file-row" }, [h("strong", name), h("span", kind), h("p", text)]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-hf-frame" }, [
        h("header", { class: "gb-hf-hero" }, [
          h("div", [h("div", { class: "gb-eagle-kicker" }, "Hermes / AI library"), h("h1", "AI library browser")]),
          h("p", "Ctrl-; opens the reusable operating layer: skills, agent.md files, prompts, and profile patterns that Hermes can explain or apply.")
        ]),
        h("div", { class: "gb-hf-doc-layout" }, [
          h("aside", { class: "gb-hf-panel" }, [
            h("div", { class: "gb-hf-section-label" }, "Library filters"),
            ["skills", "agent.md files", "prompts", "profiles", "templates", "runbooks"].map((label, i) => h("div", { class: ["gb-hf-checkline", i < 2 ? "done" : ""] }, [h("span"), h("b", label)]))
          ]),
          h("section", { class: "gb-hf-doc-list" }, [
            item("ai-library/SKILL.md", "skill", "Library meta-skill for discovering and installing reusable capabilities."),
            item("second-brain/capabilities/skills-index.md", "index", "Generated skill index with source pointers and capability descriptions."),
            item("second-brain/systems/agents/gbauto-agent-team.yaml", "agents", "GB Automation agent team definitions and ownership map."),
            item("resources/skills/client-hermes-config-walkthrough-deck/SKILL.md", "skill", "Client-facing Hermes configuration walkthrough and branded deck workflow."),
            item("second-brain/systems/hermes-profiles/gbauto/profiles/gbauto.yaml", "profile", "GBAuto Hermes deployment expert profile, hard gates, and operating rules."),
            item("*/AGENTS.md and */agent.md", "agent files", "Repo-local operator instructions and agent personas exposed through scoped directory search.")
          ])
        ])
      ])
    ]);
  }
};
