import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";
import "./eagle-onboarding-chat-gbauto.js";

export default {
  name: "EagleClientKnowledgeBaseGbauto",
  render() {
    const doc = (title, type, desc, score) => h("button", { class: "gb-eagle-kb-doc" }, [
      h("div", [h("strong", title), h("p", desc)]),
      h("span", type),
      h("em", score)
    ]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-eagle-kb" }, [
        h("header", { class: "gb-eagle-board-head" }, [
          h("div", [h("div", { class: "gb-eagle-kicker" }, "Client brain browser"), h("h1", "Knowledge base for delivery context")]),
          h("div", { class: "gb-eagle-search" }, "Search transcripts, PRDs, decisions, and client files...")
        ]),
        h("div", { class: "gb-eagle-kb-layout" }, [
          h("aside", { class: "gb-eagle-kb-folders" }, [
            h("h3", "Topics"),
            ...["Discovery calls", "Build plans", "Access notes", "Agent profiles", "Delivered artifacts"].map((x, i) => h("div", { class: i === 1 ? "active" : "" }, [h("span", x), h("b", String([8, 12, 5, 7, 21][i]))]))
          ]),
          h("div", { class: "gb-eagle-kb-list" }, [
            doc("90-day agentic systems plan", "Plan", "Phased operating model for intake, buildout, deployment, and handoff.", "96%"),
            doc("Hermes client profile brief", "Profile", "Voice, boundaries, routing rules, and memory policy for a client-specific agent.", "91%"),
            doc("Discovery transcript summary", "Transcript", "Pain points, current systems, stakeholders, and immediate automation candidates.", "88%"),
            doc("Credential readiness checklist", "Checklist", "Required OAuth, workspace, repo, and cloud access items before build start.", "84%")
          ])
        ])
      ])
    ]);
  }
};
