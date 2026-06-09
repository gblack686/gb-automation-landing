import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";
import "./eagle-onboarding-chat-gbauto.js";

export default {
  name: "HermesSecondBrainDirectoryGbauto",
  render() {
    const file = (name, access, text) => h("article", { class: "gb-hf-file-row" }, [h("strong", name), h("span", access), h("p", text)]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-hf-frame" }, [
        h("header", { class: "gb-hf-hero" }, [
          h("div", [h("div", { class: "gb-eagle-kicker" }, "Hermes / context directory"), h("h1", "Second-brain directory")]),
          h("p", "A website-safe view over user repository context: read-only by default, with explicit scoped write zones when a client profile allows it.")
        ]),
        h("div", { class: "gb-hf-doc-layout" }, [
          h("aside", { class: "gb-hf-panel" }, [
            h("div", { class: "gb-hf-section-label" }, "Scopes"),
            ["repo map", "second-brain", "client profile", "tasks inbox", "write requests"].map((label, i) => h("div", { class: ["gb-hf-checkline", i < 3 ? "done" : ""] }, [h("span"), h("b", label)]))
          ]),
          h("section", { class: "gb-hf-doc-list" }, [
            file("second-brain/systems/hermes-stack-wiring.md", "read", "Topology, ports, board bus, web UI, and shared Hermes state."),
            file("second-brain/systems/hermes-profiles/gbauto/profiles/gbauto.yaml", "read", "Deployment expert profile, gates, tools, and operating rules."),
            file("second-brain/tasks/feedback-loops/", "read", "Pipeline ideas and loop backlog for consulting operations."),
            file("second-brain/inbox/", "write request", "A proposed scoped write target for approvals, answers, and visitor handoff files.")
          ])
        ])
      ])
    ]);
  }
};
