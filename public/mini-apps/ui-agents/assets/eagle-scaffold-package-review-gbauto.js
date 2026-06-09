import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";
import "./eagle-onboarding-chat-gbauto.js";

export default {
  name: "EagleScaffoldPackageReviewGbauto",
  render() {
    const row = (name, status, value, date) => h("button", { class: "gb-hf-package-row" }, [h("strong", name), h("span", status), h("span", value), h("em", date)]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-hf-frame" }, [
        h("header", { class: "gb-hf-hero" }, [
          h("div", [h("div", { class: "gb-eagle-kicker" }, "Eagle scaffold / packages page"), h("h1", "Package review board")]),
          h("p", "The scaffold's workflow/package index reworked for client onboarding portfolios, with status tabs, search, and a review detail panel.")
        ]),
        h("div", { class: "gb-hf-chip-row" }, ["All 18", "In Progress 7", "Pending Review 4", "Approved 5", "Completed 2"].map((label, i) => h("button", { class: ["gb-hf-chip", i === 0 ? "active" : ""] }, label))),
        h("div", { class: "gb-hf-review-grid" }, [
          h("section", { class: "gb-hf-table" }, [
            row("Fish Group reporting agent", "in progress", "$36K", "Jun 12"),
            row("Eagle acquisitions workspace", "pending review", "$52K", "Jun 14"),
            row("Adjust AI trace intelligence", "approved", "$28K", "Jun 20"),
            row("Mall scanner crawler", "completed", "$18K", "May 31")
          ]),
          h("aside", { class: "gb-hf-panel" }, [
            h("div", { class: "gb-hf-section-label" }, "Selected package"),
            h("h2", "Eagle acquisitions workspace"),
            h("p", "Enterprise chat onboarding, package checklist, document browser, and trace console are ready for stakeholder review."),
            h("div", { class: "gb-hf-progress" }, h("span", { style: { width: "84%" } })),
            h("small", "11 of 13 review items complete")
          ])
        ])
      ])
    ]);
  }
};
