import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";
import "./eagle-onboarding-chat-gbauto.js";

export default {
  name: "EagleTraceConsoleGbauto",
  render() {
    const row = (name, env, ms, cost, active) => h("div", { class: ["gb-eagle-trace-row", active ? "active" : ""] }, [
      h("strong", name),
      h("span", env),
      h("span", ms),
      h("span", cost)
    ]);
    const obs = (name, type, text) => h("div", { class: "gb-eagle-observation" }, [h("div", [h("strong", name), h("span", type)]), h("p", text)]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-eagle-traces" }, [
        h("header", { class: "gb-eagle-board-head" }, [
          h("div", [h("div", { class: "gb-eagle-kicker" }, "Ops observability pattern"), h("h1", "Agent trace console")]),
          h("button", "Refresh")
        ]),
        h("div", { class: "gb-eagle-metrics" }, [
          h("div", [h("b", "143"), h("span", "Traces")]),
          h("div", [h("b", "2.8s"), h("span", "Avg latency")]),
          h("div", [h("b", "$1.42"), h("span", "Daily cost")]),
          h("div", [h("b", "1.6%"), h("span", "Error rate")])
        ]),
        h("div", { class: "gb-eagle-trace-grid" }, [
          h("div", { class: "gb-eagle-trace-list" }, [
            row("client-onboarding-chat", "live", "2.1s", "$0.014", true),
            row("prd-render-pipeline", "live", "4.8s", "$0.041", false),
            row("hermes-kanban-sync", "dev", "912ms", "$0.003", false),
            row("artifact-index-refresh", "local", "1.4s", "$0.006", false)
          ]),
          h("div", { class: "gb-eagle-trace-detail" }, [
            h("h3", "client-onboarding-chat"),
            obs("Hermes supervisor", "GENERATION", "Interpreted intake request, selected profile creation and vault setup tools."),
            obs("create_client_package", "TOOL", "Created package with profile, access checklist, and discovery summary."),
            obs("knowledge_search", "TOOL", "Found related transcript and previous delivery plan with 94% confidence.")
          ])
        ])
      ])
    ]);
  }
};
