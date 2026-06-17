import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const outputPath = process.env.HERMES_KANBAN_OUTPUT
  || join(repoRoot, 'public', 'ops', 'hermes-kanban.json');

const hermesRoot = process.env.HERMES_AGENT_ROOT
  || join(homedir(), '.openclaw', 'workspace', 'hermes-agent');

const remoteHermesRoot = process.env.HERMES_REMOTE_AGENT_ROOT
  || '~/.openclaw/workspace/hermes-agent';

const remoteTarget = process.env.HERMES_KANBAN_SSH_TARGET
  || 'greg@Gregs-Mac-mini.local';

const remotePython = String.raw`
from __future__ import annotations

import json
import re
import socket
from dataclasses import asdict
from datetime import datetime, timezone

from hermes_cli import kanban_db as kb

COLUMN_LABELS = {
    "triage": "Triage",
    "todo": "Todo",
    "ready": "Ready",
    "running": "In Progress",
    "blocked": "Blocked",
    "done": "Done",
    "archived": "Archived",
}
COLUMN_ORDER = ["triage", "todo", "ready", "running", "blocked", "done"]
SECRET_WORDS = re.compile(r"(?i)(token|secret|password|passwd|private[_-]?key|authorization|bearer|oauth|cookie)")
ENV_WORDS = re.compile(r"\b[A-Z][A-Z0-9_]{2,}\b")
ABS_PATH = re.compile(r"(?:/Users/[A-Za-z0-9._-]+|/var/folders|/tmp|/private/tmp|/opt/homebrew|/usr/local|/home/[A-Za-z0-9._-]+)(?:/[^\s'\"),;]+)*")
HOME_PATH = re.compile(r"~/(?:\.hermes|\.openclaw|repos|Library)(?:/[^\s'\"),;]+)*")
LOG_HINTS = re.compile(r"(?i)(traceback|stack trace|raw log|stderr|stdout|prompt|payload)")


def iso(ts):
    if not ts:
        return None
    return datetime.fromtimestamp(int(ts), tz=timezone.utc).isoformat()


def sanitize_text(value, limit=220):
    if value is None:
        return None
    text = re.sub(r"\\s+", " ", str(value)).strip()
    text = ABS_PATH.sub("[redacted-path]", text)
    text = HOME_PATH.sub("[redacted-path]", text)
    text = SECRET_WORDS.sub("[redacted-secret-word]", text)
    text = ENV_WORDS.sub(lambda m: "[redacted-env]" if "_" in m.group(0) else m.group(0), text)
    text = LOG_HINTS.sub("[redacted-operational-detail]", text)
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "..."


def sanitize_id(value):
    return sanitize_text(value, 96) or "unknown"


def safe_task(task, latest_summary, counts):
    data = asdict(task)
    return {
        "id": sanitize_id(data["id"]),
        "title": sanitize_text(data["title"], 140) or "Untitled task",
        "status": sanitize_id(data["status"]),
        "assignee": sanitize_id(data.get("assignee") or "unassigned"),
        "tenant": sanitize_id(data.get("tenant") or "gbautomation"),
        "priority": data.get("priority") or 0,
        "createdBy": sanitize_id(data.get("created_by") or "hermes"),
        "createdAt": iso(data.get("created_at")),
        "startedAt": iso(data.get("started_at")),
        "completedAt": iso(data.get("completed_at")),
        "claimExpiresAt": iso(data.get("claim_expires")),
        "lastHeartbeatAt": iso(data.get("last_heartbeat_at")),
        "currentRunId": data.get("current_run_id"),
        "currentStepKey": sanitize_text(data.get("current_step_key"), 80),
        "workflowTemplateId": sanitize_text(data.get("workflow_template_id"), 80),
        "workspaceKind": sanitize_text(data.get("workspace_kind"), 40),
        "hasWorkspace": bool(data.get("workspace_path")),
        "maxRuntimeSeconds": data.get("max_runtime_seconds"),
        "consecutiveFailures": data.get("consecutive_failures") or 0,
        "lastFailurePreview": sanitize_text(data.get("last_failure_error"), 180),
        "skills": [sanitize_id(skill) for skill in (data.get("skills") or [])[:8]],
        "bodyPreview": sanitize_text(data.get("body")),
        "resultPreview": sanitize_text(data.get("result")),
        "latestSummary": sanitize_text(latest_summary),
        "commentCount": counts.get("comments", 0),
        "eventCount": counts.get("events", 0),
        "runCount": counts.get("runs", 0),
        "childrenCount": counts.get("children", 0),
        "parentsCount": counts.get("parents", 0),
    }


def counts_for(conn):
    counts = {}
    for name, sql in {
        "comments": "SELECT task_id, COUNT(*) AS n FROM task_comments GROUP BY task_id",
        "events": "SELECT task_id, COUNT(*) AS n FROM task_events GROUP BY task_id",
        "runs": "SELECT task_id, COUNT(*) AS n FROM task_runs GROUP BY task_id",
        "children": "SELECT parent_id AS task_id, COUNT(*) AS n FROM task_links GROUP BY parent_id",
        "parents": "SELECT child_id AS task_id, COUNT(*) AS n FROM task_links GROUP BY child_id",
    }.items():
        for row in conn.execute(sql).fetchall():
            counts.setdefault(row["task_id"], {})[name] = int(row["n"])
    return counts


def board_payload(meta, active_board):
    slug = meta["slug"]
    kb.init_db(board=slug)
    conn = kb.connect(board=slug)
    try:
        tasks = kb.list_tasks(conn, include_archived=False)
        summaries = kb.latest_summaries(conn, [task.id for task in tasks]) if tasks else {}
        counts = counts_for(conn)
        columns = {status: [] for status in COLUMN_ORDER}
        for task in tasks:
            status = task.status if task.status in columns else "todo"
            columns[status].append(safe_task(task, summaries.get(task.id), counts.get(task.id, {})))
        latest_event_id = conn.execute("SELECT COALESCE(MAX(id), 0) AS n FROM task_events").fetchone()["n"]
        latest_run_id = conn.execute("SELECT COALESCE(MAX(id), 0) AS n FROM task_runs").fetchone()["n"]
    finally:
        conn.close()

    return {
        "slug": sanitize_id(slug),
        "name": sanitize_text(meta.get("name") or slug, 80),
        "description": sanitize_text(meta.get("description") or "", 160),
        "active": slug == active_board,
        "latestEventId": int(latest_event_id),
        "latestRunId": int(latest_run_id),
        "columns": [
            {
                "name": status,
                "label": COLUMN_LABELS[status],
                "tasks": columns[status],
            }
            for status in COLUMN_ORDER
        ],
    }


def main():
    kb.init_db()
    active_board = kb.get_current_board()
    boards = [
        board_payload(meta, active_board)
        for meta in kb.list_boards(include_archived=False)
    ]
    totals = {
        "boards": len(boards),
        "tasks": sum(len(column["tasks"]) for board in boards for column in board["columns"]),
        "running": sum(len(column["tasks"]) for board in boards for column in board["columns"] if column["name"] == "running"),
        "blocked": sum(len(column["tasks"]) for board in boards for column in board["columns"] if column["name"] == "blocked"),
        "done": sum(len(column["tasks"]) for board in boards for column in board["columns"] if column["name"] == "done"),
    }
    print(json.dumps({
        "schemaVersion": 2,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "maxAgeMinutes": 90,
        "source": {
            "host": sanitize_text(socket.gethostname(), 80),
            "app": "hermes-agent",
            "mode": "sanitized-read-only",
            "contract": "bounded-kanban-mirror-v2",
        },
        "redaction": {
            "absolutePathsIncluded": False,
            "envNamesIncluded": False,
            "logTextIncluded": False,
            "payloadBodiesIncluded": False,
        },
        "activeBoard": sanitize_id(active_board),
        "totals": totals,
        "boards": boards,
    }, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
`;

function runLocal() {
  const python = existsSync(join(hermesRoot, 'venv', 'bin', 'python'))
    ? join(hermesRoot, 'venv', 'bin', 'python')
    : 'python3';
  return spawnSync(python, ['-'], {
    cwd: hermesRoot,
    input: remotePython,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 12,
  });
}

function runRemote() {
  const command = `cd ${remoteHermesRoot} && base64 -d | ./venv/bin/python -`;
  const scriptB64 = Buffer.from(remotePython, 'utf8').toString('base64');
  return spawnSync('ssh', [remoteTarget, command], {
    input: scriptB64,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 12,
  });
}

const result = existsSync(hermesRoot) ? runLocal() : runRemote();

if (result.status !== 0) {
  process.stderr.write(result.stderr || '');
  process.stderr.write(result.stdout || '');
  process.exit(result.status || 1);
}

const payload = JSON.parse(result.stdout);
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

console.log(`Wrote ${outputPath}`);
console.log(`Mirrored ${payload.totals.tasks} tasks across ${payload.totals.boards} board(s).`);
