import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";
import "./eagle-onboarding-chat-gbauto.js";

export default {
  name: "EagleScaffoldDocumentFactoryGbauto",
  render() {
    const doc = (name, status, detail) => h("article", { class: "gb-hf-doc" }, [h("div", [h("strong", name), h("p", detail)]), h("span", status)]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-hf-frame" }, [
        h("header", { class: "gb-hf-hero" }, [
          h("div", [h("div", { class: "gb-eagle-kicker" }, "Eagle scaffold / checklist and documents"), h("h1", "Document factory")]),
          h("p", "A client-facing version of the scaffold's package checklist: generated artifacts, source coverage, download readiness, and review status.")
        ]),
        h("div", { class: "gb-hf-doc-layout" }, [
          h("aside", { class: "gb-hf-panel" }, [
            h("div", { class: "gb-hf-section-label" }, "Checklist"),
            ["Client profile", "Source inventory", "Access request", "Implementation PRD", "Launch checklist"].map((item, i) => h("div", { class: ["gb-hf-checkline", i < 3 ? "done" : ""] }, [h("span"), h("b", item)])),
            h("button", { class: "gb-hf-dark-button" }, "Export package")
          ]),
          h("section", { class: "gb-hf-doc-list" }, [
            doc("Onboarding brief", "approved", "Client goals, success criteria, stakeholders, and initial operating constraints."),
            doc("Access checklist", "review", "Vault requests, data scopes, owner approvals, and security notes."),
            doc("90-day build plan", "drafting", "Foundation, agent buildout, operating handoff, and weekly proof cadence."),
            doc("Knowledge map", "queued", "Documents, transcripts, links, and source-system relationships.")
          ])
        ])
      ])
    ]);
  }
};
