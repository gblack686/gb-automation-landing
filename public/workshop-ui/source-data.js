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
    }
  ],
  "source_revision": "bf72dc539d1a54d53c555edeff1dd55a268ae72d",
  "source_paths": [
    "experts/gbautomation/youtube-intel/justfile",
    "experts/gbautomation/youtube-intel/profile/config.yaml",
    "config/youtube_channels.yaml"
  ]
};
