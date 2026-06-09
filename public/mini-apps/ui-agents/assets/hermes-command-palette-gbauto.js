import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";
import "./eagle-onboarding-chat-gbauto.js";

export default {
  name: "HermesCommandPaletteGbauto",
  render() {
    const item = (title, text, key) => h("button", { class: "gb-hf-command-item" }, [h("div", [h("strong", title), h("p", text)]), h("kbd", key)]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-hf-frame" }, [
        h("header", { class: "gb-hf-hero" }, [
          h("div", [h("div", { class: "gb-eagle-kicker" }, "Hermes / keyboard surface"), h("h1", "Command palette")]),
          h("p", "The website gets a durable operator shortcut layer: chat, profile, feedback, second-brain context, Kanban, intake, sharing, uploads, and send actions are always one chord away.")
        ]),
        h("div", { class: "gb-hf-palette" }, [
          h("div", { class: "gb-hf-palette-search" }, [h("span", "Search commands, pages, sessions, or repository context..."), h("kbd", "Ctrl K")]),
          item("Open Hermes chat", "Continue the running website conversation.", "Ctrl K"),
          item("Open user session", "Inspect profile, permissions, and recent context.", "Ctrl O"),
          item("Submit feedback", "Create a structured consulting pipeline event from the current page and session.", "Ctrl J"),
          item("Browse second brain", "Search the read-only directory and repository context index.", "Ctrl B"),
          item("Show Kanban board", "Open the Hermes work bus, ready queue, and human gates.", "Ctrl M"),
          item("Open AI library", "Browse skills, agent.md files, prompts, and reusable operating patterns.", "Ctrl ;"),
          item("Show keyboard shortcuts", "Display every global website and Hermes shortcut.", "Ctrl /"),
          item("Start consulting intake", "Open the guided intake flow with current page context attached.", "Ctrl I"),
          item("Copy page context link", "Copy a shareable link with route, selection, and session context.", "Ctrl L"),
          item("Upload source material", "Attach docs, screenshots, transcripts, or repository files.", "Ctrl U"),
          item("Send focused message", "Submit the active chat message or focused form.", "Ctrl Enter")
        ])
      ])
    ]);
  }
};
