import { y as h } from "./_plugin-vue_export-helper-BjJfLIF2.js";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Newsreader:opsz,wght@6..72,500;6..72,600&display=swap');
.gb-eagle-page{--ink:#191919;--muted:#5c5c5c;--light:#8c8a84;--line:#d6d4c8;--paper:#fff;--panel:#e6e4d9;--cream:#f3f1e7;--accent:#d97757;--glass:rgba(230,228,217,.6);--white-glass:rgba(255,255,255,.55);min-height:100vh;background:var(--cream);color:var(--ink);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:48px 28px 72px}
.gb-eagle-page *{box-sizing:border-box}
.gb-eagle-page h1,.gb-eagle-page h2,.gb-eagle-page h3{font-family:Newsreader,Georgia,serif;font-weight:500;letter-spacing:0}
.gb-eagle-shell{max-width:1280px;margin:0 auto;border:1px solid rgba(214,212,200,.6);background:var(--white-glass);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-radius:8px;overflow:hidden;display:grid;grid-template-columns:260px 1fr 320px;min-height:820px;box-shadow:0 24px 80px -52px rgba(25,25,25,.55)}
.gb-eagle-side{border-right:1px solid var(--line);padding:20px;background:var(--glass)}
.gb-eagle-brand{font-weight:700;letter-spacing:.18em;font-size:12px;color:var(--accent);text-transform:uppercase;margin-bottom:18px}
.gb-eagle-new{width:100%;border:1px solid var(--ink);border-radius:8px;background:var(--ink);color:white;padding:11px 14px;font-weight:700;margin-bottom:18px;transition:transform .2s ease,background .2s ease,border-color .2s ease}.gb-eagle-new:hover{transform:translateY(-2px);background:var(--accent);border-color:var(--accent)}
.gb-eagle-thread{padding:10px;border:1px solid transparent;border-radius:8px;margin-bottom:8px;font-size:12px;color:rgba(25,25,25,.64)}
.gb-eagle-thread.active{background:rgba(255,255,255,.52);border-color:var(--line);color:var(--ink)}
.gb-eagle-main{display:flex;flex-direction:column;min-width:0;background:rgba(255,255,255,.36)}
.gb-eagle-top{height:58px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 22px}
.gb-eagle-title{font-weight:700;color:var(--ink)}.gb-eagle-status{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-weight:700}
.gb-eagle-chat{flex:1;padding:40px 42px;overflow:hidden}
.gb-eagle-welcome{max-width:760px;margin:0 auto 30px;text-align:center}
.gb-eagle-kicker{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:700}
.gb-eagle-welcome h1{font-size:54px;line-height:1;margin:14px 0 12px;color:var(--ink)}
.gb-eagle-welcome p{color:rgba(25,25,25,.64);font-size:16px;line-height:1.6;margin:0}
.gb-eagle-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:28px auto;max-width:900px}
.gb-eagle-action{background:var(--white-glass);border:1px solid var(--line);border-radius:8px;padding:16px;text-align:left;color:var(--ink);transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}.gb-eagle-action:hover{transform:translateY(-2px);border-color:var(--accent);box-shadow:0 12px 40px -24px rgba(217,119,87,.35)}
.gb-eagle-action strong{display:block;font-family:Newsreader,Georgia,serif;font-weight:500;color:var(--ink);font-size:22px;line-height:1.05}.gb-eagle-action span{display:block;margin-top:8px;font-size:13px;line-height:1.5;color:rgba(25,25,25,.58)}
.gb-eagle-msgs{max-width:820px;margin:30px auto 0;display:grid;gap:18px}
.gb-eagle-user{text-align:right;color:rgba(25,25,25,.64)}.gb-eagle-assistant{border-left:3px solid var(--accent);padding-left:18px;color:rgba(25,25,25,.76)}
.gb-eagle-label{font-size:10px;text-transform:uppercase;letter-spacing:.16em;font-weight:700;color:var(--accent);margin-bottom:6px}
.gb-eagle-input{border-top:1px solid var(--line);padding:18px 24px;background:rgba(230,228,217,.42);display:flex;gap:10px}
.gb-eagle-input div{flex:1;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.56);padding:13px;color:rgba(25,25,25,.58);transition:border-color .2s ease,background .2s ease,box-shadow .2s ease}.gb-eagle-input div:focus-within{border-color:var(--accent);background:white;box-shadow:0 0 0 1px var(--accent)}.gb-eagle-input button{border:1px solid var(--ink);border-radius:8px;background:var(--ink);color:white;padding:0 18px;font-weight:700;transition:background .2s ease,border-color .2s ease}.gb-eagle-input button:hover{background:var(--accent);border-color:var(--accent)}
.gb-eagle-panel{border-left:1px solid var(--line);background:rgba(230,228,217,.42);padding:18px}
.gb-eagle-panel h3{margin:0 0 12px;color:var(--ink);font-size:24px}.gb-eagle-progress{height:8px;background:rgba(25,25,25,.08);border-radius:999px;margin:10px 0 18px;overflow:hidden}.gb-eagle-progress span{display:block;width:58%;height:100%;background:var(--accent)}
.gb-eagle-check{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid rgba(25,25,25,.08);font-size:12px;color:rgba(25,25,25,.68)}.gb-eagle-box{width:14px;height:14px;border:1px solid var(--accent);border-radius:3px;background:rgba(255,255,255,.55);margin-top:1px}.gb-eagle-check.done .gb-eagle-box{background:var(--accent);border-color:var(--accent)}
@media(max-width:1000px){.gb-eagle-page{padding:28px 16px 48px}.gb-eagle-shell{grid-template-columns:1fr}.gb-eagle-side,.gb-eagle-panel{display:none}.gb-eagle-actions{grid-template-columns:1fr 1fr}.gb-eagle-chat{padding:28px 20px}.gb-eagle-welcome h1{font-size:40px}}
`;

function inject() {
  if (typeof document === "undefined" || document.getElementById("gb-eagle-style")) return;
  const style = document.createElement("style");
  style.id = "gb-eagle-style";
  style.textContent = css;
  document.head.appendChild(style);
}

inject();

export default {
  name: "EagleOnboardingChatGbauto",
  setup() {
    inject();
  },
  render() {
    const action = (title, text) => h("button", { class: "gb-eagle-action" }, [h("strong", title), h("span", text)]);
    const check = (label, done) => h("div", { class: ["gb-eagle-check", done ? "done" : ""] }, [h("span", { class: "gb-eagle-box" }), h("span", label)]);
    return h("main", { class: "gb-eagle-page" }, [
      h("section", { class: "gb-eagle-shell" }, [
        h("aside", { class: "gb-eagle-side" }, [
          h("div", { class: "gb-eagle-brand" }, "GB Automation"),
          h("button", { class: "gb-eagle-new" }, "New onboarding chat"),
          h("div", { class: "gb-eagle-thread active" }, "Fish Group - workflow intake"),
          h("div", { class: "gb-eagle-thread" }, "Eagle Acquisitions - data room"),
          h("div", { class: "gb-eagle-thread" }, "Adjust AI - observability sprint")
        ]),
        h("div", { class: "gb-eagle-main" }, [
          h("header", { class: "gb-eagle-top" }, [h("span", { class: "gb-eagle-title" }, "Client Onboarding Copilot"), h("span", { class: "gb-eagle-status" }, "Hermes online")]),
          h("div", { class: "gb-eagle-chat" }, [
            h("div", { class: "gb-eagle-welcome" }, [
              h("div", { class: "gb-eagle-kicker" }, "Enterprise onboarding interface"),
              h("h1", "Turn a discovery call into a build-ready client workspace."),
              h("p", "A GB Automation take on the Eagle chat shell: guided intake, live artifacts, client context, and checklist state in one focused operator surface.")
            ]),
            h("div", { class: "gb-eagle-actions" }, [
              action("Start intake", "Capture goals, systems, access, and stakeholders."),
              action("Map agents", "Choose Hermes profiles and specialist lanes."),
              action("Collect assets", "Upload transcripts, docs, and screenshots."),
              action("Create plan", "Generate the 90-day build checklist.")
            ]),
            h("div", { class: "gb-eagle-msgs" }, [
              h("div", { class: "gb-eagle-user" }, [h("div", { class: "gb-eagle-label" }, "Client"), h("p", "We need a private AI teammate that can read our SOPs and draft weekly updates.")]),
              h("div", { class: "gb-eagle-assistant" }, [h("div", { class: "gb-eagle-label" }, "Hermes"), h("p", "I created the onboarding package, identified three source systems, and queued the access checklist for approval.")])
            ])
          ]),
          h("footer", { class: "gb-eagle-input" }, [h("div", "Ask about onboarding, type / for commands..."), h("button", "Send")])
        ]),
        h("aside", { class: "gb-eagle-panel" }, [
          h("h3", "Onboarding package"),
          h("div", "58% complete"),
          h("div", { class: "gb-eagle-progress" }, h("span")),
          check("Client profile created", true),
          check("Drive folder and vault linked", true),
          check("Hermes profile selected", true),
          check("Credentials requested", false),
          check("First build plan drafted", false)
        ])
      ])
    ]);
  }
};
