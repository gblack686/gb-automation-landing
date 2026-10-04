window.FORGE_SOURCE = {
  "expert_id": "gbautomation/youtube-intel",
  "name": "YouTube Intelligence",
  "profile": "expert-gbautomation-youtube-intel",
  "model": "gpt-5.6-sol",
  "provider": "openai-codex",
  "approvals": {
    "mode": "manual",
    "timeout": 600,
    "cron_mode": "deny"
  },
  "max_turns": 90,
  "scan_days": 7,
  "scan_cap": 5,
  "channels": [
    {
      "name": "IndyDevDan",
      "handle": "@IndyDevDan",
      "priority": "high"
    },
    {
      "name": "Cole Medin",
      "handle": "@ColeMedin",
      "priority": "high"
    },
    {
      "name": "Alex Finn",
      "handle": "@AlexFinn",
      "priority": "high"
    },
    {
      "name": "Alex Finn Labs Official",
      "handle": "@alexfinnlabsofficial",
      "priority": "high"
    },
    {
      "name": "Matthew Berman",
      "handle": "@MatthewBerman",
      "priority": "medium"
    },
    {
      "name": "Sean Kochel",
      "handle": "@SeanKochel",
      "priority": "medium"
    },
    {
      "name": "Latent Space",
      "handle": "@LatentSpacePod",
      "priority": "medium"
    },
    {
      "name": "Simon Scrapes",
      "handle": "@SimonScrapes",
      "priority": "medium"
    },
    {
      "name": "GritAI Studio",
      "handle": "@GritAIStudio",
      "priority": "low"
    },
    {
      "name": "Dave Swift",
      "handle": "@DaveSwift",
      "priority": "low"
    },
    {
      "name": "VelvetShark",
      "handle": "@VelvetShark",
      "priority": "low"
    }
  ],
  "recipes": [
    {
      "id": "default",
      "parameters": "",
      "source": "@just --list",
      "recipe": "just default"
    },
    {
      "id": "check",
      "parameters": "",
      "source": "cd \"{{root}}\" && bash scripts/install_experts.sh --check {{expert}}",
      "recipe": "just check"
    },
    {
      "id": "install",
      "parameters": "",
      "source": "cd \"{{root}}\" && bash scripts/install_experts.sh --apply {{expert}}",
      "recipe": "just install"
    },
    {
      "id": "verify",
      "parameters": "",
      "source": "cd \"{{root}}\" && bash scripts/install_experts.sh --check {{expert}}",
      "recipe": "just verify"
    },
    {
      "id": "drift",
      "parameters": "",
      "source": "cd \"{{root}}\" && python scripts/check_expert_source_drift.py --expert {{expert}}",
      "recipe": "just drift"
    },
    {
      "id": "routes",
      "parameters": "",
      "source": "@ls -1 \"{{justfile_directory()}}\"/*.md | xargs -n1 basename | sort",
      "recipe": "just routes"
    },
    {
      "id": "test",
      "parameters": "",
      "source": "@test -d \"{{justfile_directory()}}/tests\" && (cd \"{{root}}\" && python scripts/replay_expert_tests.py --expert {{expert}}) || echo \"no expert-specific tests\"",
      "recipe": "just test"
    },
    {
      "id": "audit",
      "parameters": "",
      "source": "-@just check\n    -@just drift\n    -@just routes\n    -@just test",
      "recipe": "just audit"
    },
    {
      "id": "install-dry",
      "parameters": "",
      "source": "bash scripts/install_experts.sh --check youtube-intel",
      "recipe": "just install-dry"
    },
    {
      "id": "question",
      "parameters": "q",
      "source": "claude \"/experts:{{expert}}:question {{q}}\"",
      "recipe": "just question"
    },
    {
      "id": "plan",
      "parameters": "req",
      "source": "claude \"/experts:{{expert}}:plan {{req}}\"",
      "recipe": "just plan"
    },
    {
      "id": "improve",
      "parameters": "",
      "source": "claude \"/experts:{{expert}}:self-improve\"",
      "recipe": "just improve"
    },
    {
      "id": "graph",
      "parameters": "q=\"--freshness\"",
      "source": "claude \"/experts:{{expert}}:graph {{q}}\"",
      "recipe": "just graph"
    },
    {
      "id": "maintain",
      "parameters": "",
      "source": "claude \"/experts:{{expert}}:maintenance\"",
      "recipe": "just maintain"
    },
    {
      "id": "pbi",
      "parameters": "req",
      "source": "claude \"/experts:{{expert}}:plan_build_improve {{req}}\"",
      "recipe": "just pbi"
    },
    {
      "id": "prime",
      "parameters": "",
      "source": "claude \"/experts:{{expert}}:prime\"",
      "recipe": "just prime"
    },
    {
      "id": "liked-scan",
      "parameters": "",
      "source": "python resources/skills/youtube-intel-app/scripts/liked_intel.py",
      "recipe": "just liked-scan"
    },
    {
      "id": "liked-scan-apply",
      "parameters": "",
      "source": "python resources/skills/youtube-intel-app/scripts/liked_intel.py --write --sync-supabase",
      "recipe": "just liked-scan-apply"
    },
    {
      "id": "liked-test",
      "parameters": "",
      "source": "python -m pytest tests/test_youtube_liked_intel.py -q",
      "recipe": "just liked-test"
    },
    {
      "id": "code-graph-build",
      "parameters": "",
      "source": "just --dry-run code-graph-build-apply",
      "recipe": "just code-graph-build"
    },
    {
      "id": "code-graph-build-apply",
      "parameters": "",
      "source": "graft build scoped to the expert and the dependencies listed in the checked-in Justfile",
      "recipe": "just code-graph-build-apply"
    },
    {
      "id": "code-graph",
      "parameters": "",
      "source": "graft --dir artifacts/vault-exhaust/expert-graft/gbautomation/youtube-intel map . --no-refresh",
      "recipe": "just code-graph"
    },
    {
      "id": "code-graph-check",
      "parameters": "",
      "source": "graft --dir artifacts/vault-exhaust/expert-graft/gbautomation/youtube-intel check .",
      "recipe": "just code-graph-check"
    },
    {
      "id": "code-graph-ask",
      "parameters": "query",
      "source": "graft ask <query> . --source --no-refresh",
      "recipe": "just code-graph-ask"
    },
    {
      "id": "code-graph-grep",
      "parameters": "pattern",
      "source": "graft grep <pattern> . --no-refresh",
      "recipe": "just code-graph-grep"
    },
    {
      "id": "code-graph-callers",
      "parameters": "symbol",
      "source": "graft callers <symbol> . --no-refresh",
      "recipe": "just code-graph-callers"
    },
    {
      "id": "validate-playbook",
      "parameters": "",
      "source": "cd \"{{root}}\" && python resources/skills/setup-prime-self-improve/scripts/discover.py --expert {{expert}} --json",
      "recipe": "just validate-playbook"
    },
    {
      "id": "health",
      "parameters": "",
      "source": "cd \"{{root}}\" && python resources/skills/setup-prime-self-improve/scripts/run_smoke_tests.py --expert {{expert}} --json",
      "recipe": "just health"
    },
    {
      "id": "proposals",
      "parameters": "",
      "source": "cd \"{{root}}\" && python resources/skills/setup-prime-self-improve/scripts/run_proposals.py --expert {{expert}}",
      "recipe": "just proposals"
    },
    {
      "id": "proposals-apply",
      "parameters": "",
      "source": "cd \"{{root}}\" && python resources/skills/setup-prime-self-improve/scripts/run_proposals.py --expert {{expert}} --write",
      "recipe": "just proposals-apply"
    },
    {
      "id": "digest",
      "parameters": "",
      "source": "python resources/skills/gmail-manager/scripts/send_proposals_digest.py --expert youtube-intel --to gblack686@gmail.com --dry-run",
      "recipe": "just digest"
    },
    {
      "id": "deploy",
      "parameters": "",
      "source": "python scripts/deploy_expert.py --expert youtube-intel",
      "recipe": "just deploy"
    },
    {
      "id": "remote-status",
      "parameters": "",
      "source": "mm.sh checks the installed Hermes profile and five latest log names on the Mac Mini",
      "recipe": "just remote-status"
    }
  ],
  "connected_recipes": [
    "health", "check", "verify", "drift", "routes", "test", "audit",
    "install-dry", "validate-playbook", "proposals"
  ],
  "approval_recipes": [
    "install", "liked-scan-apply", "code-graph-build-apply",
    "proposals-apply", "deploy", "pbi"
  ],
  "source_revision": "9e66e1285916e079e61fefb39066054da61fd36b",
  "source_paths": [
    "experts/gbautomation/youtube-intel/justfile",
    "experts/gbautomation/youtube-intel/profile/config.yaml",
    "config/youtube_channels.yaml"
  ]
};
