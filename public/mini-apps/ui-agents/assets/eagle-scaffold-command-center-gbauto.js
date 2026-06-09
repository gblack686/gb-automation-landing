import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";
import "./eagle-onboarding-chat-gbauto.js";

export default {
  name: "EagleScaffoldCommandCenterGbauto",
  render() {
    const chip = (label) => h("button", { class: "gb-hf-chip" }, label);
    const note = (title, text) => h("article", { class: "gb-hf-note" }, [h("strong", title), h("p", text)]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-hf-frame gb-hf-command" }, [
        h("header", { class: "gb-hf-hero" }, [
          h("div", [h("div", { class: "gb-eagle-kicker" }, "Eagle scaffold / simple chat"), h("h1", "Enterprise command center")]),
          h("p", "A Hyperframe-styled version of the Eagle chat shell with quick commands, persistent workspace context, and an operator activity rail.")
        ]),
        h("div", { class: "gb-hf-command-grid" }, [
          h("aside", { class: "gb-hf-sidebar" }, [
            h("div", { class: "gb-hf-section-label" }, "Sessions"),
            ["New client intake", "SOW draft review", "FAR research", "Cost estimate"].map((item, index) => h("button", { class: ["gb-hf-nav-item", index === 0 ? "active" : ""] }, item))
          ]),
          h("section", { class: "gb-hf-chat" }, [
            h("div", { class: "gb-hf-chip-row" }, ["New Intake", "Generate SOW", "Search FAR", "Cost Estimate", "Small Business"].map(chip)),
            h("article", { class: "gb-hf-message user" }, [h("span", "Client"), h("p", "Start a private onboarding workspace for a multi-location operations team. We need intake, files, and weekly build visibility.")]),
            h("article", { class: "gb-hf-message assistant" }, [
              h("span", "Hermes"),
              h("p", "I created the client package, mapped source systems, queued the document checklist, and opened the first build lane for approval."),
              h("div", { class: "gb-hf-tool-card" }, [h("b", "Package Update"), h("em", "drafting"), h("small", "4 required artifacts identified")])
            ]),
            h("footer", { class: "gb-hf-composer" }, [h("span", "Ask Hermes or type / for commands..."), h("button", "Send")])
          ]),
          h("aside", { class: "gb-hf-activity" }, [
            h("div", { class: "gb-hf-section-label" }, "Activity"),
            note("Package", "Client profile, vault, and checklist state are active."),
            note("Documents", "SOW, intake brief, and access request queued."),
            note("Logs", "3 tools completed. 1 approval pending.")
          ])
        ])
      ])
    ]);
  }
};
