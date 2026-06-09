import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";
import "./eagle-onboarding-chat-gbauto.js";

export default {
  name: "HermesSiteChatHotkeysGbauto",
  render() {
    const bubble = (role, text) => h("article", { class: ["gb-hf-site-bubble", role] }, [h("span", role), h("p", text)]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-hf-frame gb-hf-site-shell" }, [
        h("header", { class: "gb-hf-site-top" }, [
          h("div", [h("div", { class: "gb-eagle-kicker" }, "Always-on Hermes"), h("h1", "Website chat layer")]),
          h("div", { class: "gb-hf-hotkeys" }, [
            h("kbd", "Ctrl"), h("kbd", "K"), h("span", "chat"),
            h("kbd", "Ctrl"), h("kbd", "O"), h("span", "session"),
            h("kbd", "Ctrl"), h("kbd", "J"), h("span", "feedback"),
            h("kbd", "Ctrl"), h("kbd", ";"), h("span", "AI library"),
            h("kbd", "Ctrl"), h("kbd", "/"), h("span", "shortcuts")
          ])
        ]),
        h("div", { class: "gb-hf-site-grid" }, [
          h("section", { class: "gb-hf-site-copy" }, [
            h("h2", "Every page can talk back."),
            h("p", "Hermes follows the visitor through the website with one persistent thread, page-aware context, and a clear path from curiosity to consulting intake."),
            h("div", { class: "gb-hf-chip-row" }, ["Ctrl-B context", "Ctrl-M board", "Ctrl-; skills", "Ctrl-I intake", "Ctrl-L share", "Ctrl-U upload", "Ctrl-Enter send"].map((label) => h("button", { class: "gb-hf-chip" }, label)))
          ]),
          h("aside", { class: "gb-hf-chat-widget" }, [
            h("header", [h("b", "Hermes"), h("span", "running website session")]),
            bubble("visitor", "Can you explain how the Kanban steward would work for my repo?"),
            bubble("hermes", "Yes. I can read the public page, your selected profile, and the scoped directory index. I can also turn this into a consulting intake if you want a build plan."),
            h("footer", [h("span", "Ask from anywhere..."), h("button", "Send")])
          ])
        ])
      ])
    ]);
  }
};
