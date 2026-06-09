import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";
import "./eagle-onboarding-chat-gbauto.js";

export default {
  name: "EagleWorkPackageBoardGbauto",
  render() {
    const card = (title, status, meta, docs) => h("article", { class: "gb-eagle-package" }, [
      h("div", { class: "gb-eagle-package-head" }, [h("h3", title), h("span", status)]),
      h("p", meta),
      h("div", { class: "gb-eagle-package-docs" }, docs.map((d) => h("span", d)))
    ]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-eagle-board" }, [
        h("header", { class: "gb-eagle-board-head" }, [
          h("div", [h("div", { class: "gb-eagle-kicker" }, "Eagle pattern adapted for GB Automation"), h("h1", "Client work packages")]),
          h("button", "New package")
        ]),
        h("div", { class: "gb-eagle-board-tabs" }, ["All", "Intake", "Build", "Review", "Live"].map((t, i) => h("span", { class: i === 0 ? "active" : "" }, t))),
        h("div", { class: "gb-eagle-board-grid" }, [
          card("Fish Group monthly reporting agent", "Build", "Session notes, Drive folders, Stripe context, and QuickBooks workflow mapped.", ["Profile", "Plan", "Vault", "PRD"]),
          card("Eagle acquisitions onboarding", "Intake", "Enterprise chat shell, package checklist, and stakeholder discovery queued.", ["Transcript", "Risks", "Access"]),
          card("Adjust AI trace intelligence sprint", "Review", "Observability pipeline and Langfuse trace dashboard are ready for validation.", ["PRD", "Traces", "Demo"]),
          card("The Mall scanner crawler", "Live", "Instagram and commerce discovery loop deployed with artifact-backed reports.", ["Crawler", "Queue", "Report"])
        ])
      ])
    ]);
  }
};
