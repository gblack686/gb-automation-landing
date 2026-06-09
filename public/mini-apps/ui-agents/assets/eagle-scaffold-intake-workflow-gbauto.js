import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";
import "./eagle-onboarding-chat-gbauto.js";

export default {
  name: "EagleScaffoldIntakeWorkflowGbauto",
  render() {
    const stage = (label, text, state) => h("article", { class: ["gb-hf-stage", state] }, [h("span", label), h("strong", text)]);
    const event = (title, text) => h("div", { class: "gb-hf-event" }, [h("b", title), h("p", text)]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-hf-frame" }, [
        h("header", { class: "gb-hf-hero" }, [
          h("div", [h("div", { class: "gb-eagle-kicker" }, "Eagle scaffold / intake workflow panel"), h("h1", "Intake workflow")]),
          h("p", "The scaffold's acquisition intake stages translated into a GB Automation onboarding flow for requirements, compliance, artifacts, and review.")
        ]),
        h("div", { class: "gb-hf-stage-row" }, [
          stage("01", "Requirements", "done"),
          stage("02", "Compliance", "done"),
          stage("03", "Documents", "current"),
          stage("04", "Review", "")
        ]),
        h("div", { class: "gb-hf-split" }, [
          h("section", { class: "gb-hf-panel" }, [
            h("div", { class: "gb-hf-section-label" }, "Package update"),
            h("h2", "Operations AI teammate rollout"),
            h("p", "Requirement type: internal automation. Estimated value: $48K. Acquisition method adapted to client approval workflow."),
            h("div", { class: "gb-hf-progress" }, h("span", { style: { width: "72%" } })),
            h("small", "72% ready for client review")
          ]),
          h("section", { class: "gb-hf-panel" }, [
            h("div", { class: "gb-hf-section-label" }, "State changes"),
            event("Source systems mapped", "Drive, Slack exports, CRM reports, and operating SOPs linked to the client brain."),
            event("Compliance lane adapted", "Risk checks reframed as data access, retention, and human approval gates."),
            event("Document generation started", "Onboarding brief, access checklist, and 90-day implementation plan in draft.")
          ])
        ])
      ])
    ]);
  }
};
