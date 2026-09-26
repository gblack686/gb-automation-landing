#!/usr/bin/env python
"""Stage 12: trial lifecycle state machine -> trial-state.json.

States and allowed transitions follow the PRD section 16:

  draft -> preview_approved -> activation_approved -> active
  active -> day_7_review -> active            (checkpoint returns to active)
  active|day_7_review -> day_14_closeout -> expired | converted | shut_down
  any non-terminal state -> shut_down

Each transition records who approved it. Terminal states are frozen.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from _common import dump_json, load_structured, workdir_arg

TRANSITIONS = {
    "draft": ["preview_approved", "shut_down"],
    "preview_approved": ["activation_approved", "shut_down"],
    "activation_approved": ["active", "shut_down"],
    "active": ["day_7_review", "day_14_closeout", "shut_down"],
    "day_7_review": ["active", "day_14_closeout", "shut_down"],
    "day_14_closeout": ["expired", "converted", "shut_down"],
}
TERMINAL = {"expired", "converted", "shut_down"}
SHUTDOWN_STEPS = [
    "disable scheduled jobs and channels created for the trial",
    "preserve sanitized receipts, reports, and public research artifacts",
    "delete or rotate temporary credentials per credential hygiene policy",
    "remove prospect data from any default/shared memory scope",
]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    workdir_arg(parser)
    parser.add_argument("--to", required=True, help="Target state")
    parser.add_argument("--approved-by", required=True,
                        help="Human approver for this transition (e.g. 'greg')")
    parser.add_argument("--when", required=True, help="ISO timestamp of the approval")
    args = parser.parse_args()

    workdir = Path(args.workdir)
    state_path = workdir / "trial-state.json"
    if state_path.exists():
        state = load_structured(state_path)
    else:
        state = {"schema_version": "leadmagnet-trial-state.v1", "status": "draft", "history": []}

    current = state["status"]
    if current in TERMINAL:
        print(f"BLOCKED: trial is terminal ({current}) — no further transitions.")
        return 2
    allowed = TRANSITIONS.get(current, [])
    if args.to not in allowed:
        print(f"BLOCKED: {current} -> {args.to} is not a legal transition. Allowed: {allowed}")
        return 2

    state["status"] = args.to
    state["history"].append({"from": current, "to": args.to,
                             "approved_by": args.approved_by, "at": args.when})
    if args.to in TERMINAL:
        state["shutdown_checklist"] = [{"step": s, "done": False} for s in SHUTDOWN_STEPS]

    dump_json(state_path, state)
    print(f"OK trial {current} -> {args.to} (approved by {args.approved_by}) -> trial-state.json")
    if args.to in TERMINAL:
        print("Terminal state reached — complete the shutdown checklist in trial-state.json.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
