import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";
import "./eagle-onboarding-chat-gbauto.js";

export default {
  name: "HermesShortcutsReferenceGbauto",
  render() {
    const row = (keys, title, text) => h("article", { class: "gb-hf-shortcut-row" }, [
      h("div", { class: "gb-hf-shortcut-keys" }, keys.map((key) => h("kbd", key))),
      h("div", [h("strong", title), h("p", text)])
    ]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-hf-frame" }, [
        h("header", { class: "gb-hf-hero" }, [
          h("div", [h("div", { class: "gb-eagle-kicker" }, "Hermes / shortcut system"), h("h1", "Keyboard shortcuts")]),
          h("p", "A compact reference for the website-wide Hermes hotkeys. Ctrl-/ opens this layer from anywhere.")
        ]),
        h("section", { class: "gb-hf-shortcuts" }, [
          row(["Ctrl", "K"], "Open Hermes chat", "Start or continue the running website conversation."),
          row(["Ctrl", "O"], "Open user session", "Inspect profile, permissions, active repo scope, and recent context."),
          row(["Ctrl", "J"], "Submit feedback", "Attach page, profile, session transcript, and pain point to the consulting pipeline."),
          row(["Ctrl", "B"], "Browse second brain", "Search the read-only directory and repository context index."),
          row(["Ctrl", "M"], "Open mission board", "Open Hermes Kanban, ready queue, running work, and human gates."),
          row(["Ctrl", ";"], "Open AI library", "Browse skills, agent.md files, prompts, and reusable operating patterns."),
          row(["Ctrl", "/"], "Show shortcuts", "Display this reference overlay."),
          row(["Ctrl", "I"], "Start consulting intake", "Launch a guided intake using current page and chat context."),
          row(["Ctrl", "L"], "Copy context link", "Copy a shareable page/session context link."),
          row(["Ctrl", "U"], "Upload source material", "Attach docs, screenshots, transcripts, or repository files."),
          row(["Ctrl", "Enter"], "Send focused message", "Submit the active chat message or focused form.")
        ])
      ])
    ]);
  }
};
