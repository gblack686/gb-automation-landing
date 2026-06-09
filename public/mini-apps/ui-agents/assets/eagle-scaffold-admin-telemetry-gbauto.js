import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";
import "./eagle-onboarding-chat-gbauto.js";

export default {
  name: "EagleScaffoldAdminTelemetryGbauto",
  render() {
    const metric = (value, label) => h("article", { class: "gb-hf-metric" }, [h("b", value), h("span", label)]);
    const log = (agent, text, cost) => h("div", { class: "gb-hf-log" }, [h("strong", agent), h("p", text), h("em", cost)]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-hf-frame" }, [
        h("header", { class: "gb-hf-hero" }, [
          h("div", [h("div", { class: "gb-eagle-kicker" }, "Eagle scaffold / admin traces"), h("h1", "Operator telemetry")]),
          h("p", "The admin trace, cost, and agent-log screens condensed into an executive operations frame for GB Automation delivery oversight.")
        ]),
        h("div", { class: "gb-hf-metrics" }, [
          metric("1,482", "tool calls"),
          metric("98.4%", "completion rate"),
          metric("$42.18", "weekly model cost"),
          metric("7", "active agents")
        ]),
        h("div", { class: "gb-hf-split" }, [
          h("section", { class: "gb-hf-panel" }, [
            h("div", { class: "gb-hf-section-label" }, "Agent logs"),
            log("supervisor", "Selected document generation and knowledge search tools for onboarding request.", "$0.018"),
            log("research", "Fetched related source documents and SOP context with 93% confidence.", "$0.006"),
            log("builder", "Drafted launch checklist and review notes for package handoff.", "$0.021")
          ]),
          h("section", { class: "gb-hf-panel" }, [
            h("div", { class: "gb-hf-section-label" }, "Health signals"),
            h("div", { class: "gb-hf-signal good" }, [h("b", "Streaming"), h("span", "SSE recovery healthy")]),
            h("div", { class: "gb-hf-signal good" }, [h("b", "Knowledge base"), h("span", "42 documents indexed")]),
            h("div", { class: "gb-hf-signal warn" }, [h("b", "Review queue"), h("span", "4 client packages need approval")])
          ])
        ])
      ])
    ]);
  }
};
