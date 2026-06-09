import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";
import "./eagle-onboarding-chat-gbauto.js";

export default {
  name: "HermesFeedbackPipelineGbauto",
  render() {
    const step = (name, text) => h("article", { class: "gb-hf-stage current" }, [h("span", name), h("strong", text)]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-hf-frame" }, [
        h("header", { class: "gb-hf-hero" }, [
          h("div", [h("div", { class: "gb-eagle-kicker" }, "Hermes / feedback loop"), h("h1", "Feedback to consulting pipeline")]),
          h("p", "Ctrl-J or the website feedback button becomes structured intake: page, user profile, session transcript, pain point, and next-step recommendation.")
        ]),
        h("div", { class: "gb-hf-stage-row" }, [
          step("01", "Capture"),
          step("02", "Classify"),
          step("03", "Route"),
          step("04", "Propose")
        ]),
        h("div", { class: "gb-hf-split" }, [
          h("section", { class: "gb-hf-panel" }, [
            h("div", { class: "gb-hf-section-label" }, "Feedback card"),
            h("h2", "Visitor wants a repo-aware AI teammate"),
            h("p", "Captured from Hermes chat on the Kanban page. Tagged as consulting-intake, profile-build, second-brain-access, and website-chat."),
            h("button", { class: "gb-hf-dark-button" }, "Create pipeline event")
          ]),
          h("section", { class: "gb-hf-panel" }, [
            h("div", { class: "gb-hf-section-label" }, "Consulting handoff"),
            h("div", { class: "gb-hf-event" }, [h("b", "Suggested offer"), h("p", "90-minute Hermes profile and repository context design session.")]),
            h("div", { class: "gb-hf-event" }, [h("b", "Evidence"), h("p", "Page path, session transcript, selected repo scope, and command history.")]),
            h("div", { class: "gb-hf-event" }, [h("b", "Next action"), h("p", "Send tailored follow-up and create a Kanban proposal card.")])
          ])
        ])
      ])
    ]);
  }
};
