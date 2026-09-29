#!/usr/bin/env python3
"""Render, publish, notify, and inspect pre-signed human approval gates.

The raw capability exists only in process memory and in the delivered email
link fragment. It is never written to the report directory or publish receipt.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import importlib.util
import json
import os
import re
import subprocess
import sys
import tempfile
import time
import types
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from resources.lib.gbauto_doc_template import REQUIRED_TRACE_FIELDS, render_document  # noqa: E402


PROJECT_REF = "aejkzyjrlsfryfidwedm"
EDGE_URL = f"https://{PROJECT_REF}.supabase.co/functions/v1/human-approval-action"
NETLIFY_SITE_ID = "d0f641dd-0228-4dff-b0bb-d5f7f47382cc"
SUPABASE_SECRET_ID = "gbautomation/infrastructure/supabase/gbauto"
OPERATOR_SECRET_ID = "gbautomation/infrastructure/human-approval-operator-secret"
NETLIFY_SECRET_ID = "gbautomation/netlify/auth-token"
ALLOWED_ACTIONS = ("approve", "request_changes", "snooze", "reject")


def canonical_json(value: Any) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode("utf-8")


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def secret_json(secret_id: str) -> dict[str, Any]:
    try:
        import boto3  # type: ignore
    except ImportError as exc:
        raise SystemExit("boto3 is required for secret hydration") from exc
    raw = boto3.client("secretsmanager", region_name="us-east-1").get_secret_value(SecretId=secret_id)["SecretString"]
    try:
        value = json.loads(raw)
    except json.JSONDecodeError:
        value = {"value": raw.strip()}
    if not isinstance(value, dict):
        raise SystemExit(f"{secret_id} did not contain an object")
    return value


def secret_value(data: dict[str, Any], *names: str) -> str:
    for name in names:
        value = str(data.get(name) or "").strip()
        if value:
            return value
    return ""


def normalize_packet(packet: dict[str, Any]) -> dict[str, Any]:
    """Return the exact canonical packet used for hashing and publication."""
    normalized = dict(packet)
    normalized.setdefault("schema_version", "human-approval-gate.v1")
    normalized.setdefault("allowed_actions", list(ALLOWED_ACTIONS))
    return normalized


def validate_packet(packet: dict[str, Any]) -> None:
    required = (
        "gate_id",
        "run_id",
        "parent_task_id",
        "approval_recipient",
        "decision_version",
        "source_commit",
        "allowed_resume_targets",
        "title",
        "recommendation",
        "sections",
    )
    missing = [key for key in required if packet.get(key) in (None, "", [])]
    if missing:
        raise ValueError(f"approval packet missing: {', '.join(missing)}")
    if not re.fullmatch(r"[A-Za-z0-9._:-]{1,180}", str(packet["gate_id"])):
        raise ValueError("invalid gate_id")
    if int(packet["decision_version"]) < 1:
        raise ValueError("decision_version must be positive")
    actions = packet.get("allowed_actions") or list(ALLOWED_ACTIONS)
    if not actions or any(action not in ALLOWED_ACTIONS for action in actions):
        raise ValueError("invalid allowed_actions")
    if not isinstance(packet["sections"], list):
        raise ValueError("sections must be a list")
    targets = packet["allowed_resume_targets"]
    if (
        not isinstance(targets, list)
        or any(
            not isinstance(target, str)
            or not re.fullmatch(r"[A-Za-z0-9._:-]{1,180}", target)
            for target in targets
        )
        or len(set(targets)) != len(targets)
    ):
        raise ValueError("allowed_resume_targets must be unique task identifiers")


APPROVAL_CSS = r"""
.gate-state{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:10px 0 16px}
.gate-metric{border:1px solid var(--stone);border-radius:8px;background:rgba(255,255,255,.55);padding:13px}
.gate-metric strong{display:block;color:var(--ink);font-family:var(--font-serif);font-size:26px;font-weight:500;line-height:1.1}
.gate-metric span{display:block;margin-top:7px;color:var(--text-mute);font-size:11px;font-weight:700}
.approval-panel{border:1px solid var(--stone);border-top:3px solid var(--terracotta);border-radius:8px;background:rgba(255,255,255,.55);padding:20px}
.approval-panel h2{margin:0 0 8px;font-family:var(--font-serif);font-size:26px;font-weight:500;color:var(--ink)}
.approval-context-help{margin:0;color:var(--text-muted-2);font-size:12px}
.approval-panel label{display:block;margin:12px 0 5px;color:var(--ink);font-size:12px;font-weight:700}
.approval-panel textarea,.approval-panel input{width:100%;box-sizing:border-box;border:1px solid var(--stone);border-radius:6px;background:#fff;padding:10px;font:inherit;color:var(--ink)}
.approval-panel textarea{min-height:110px;resize:vertical}
.decision-buttons{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:14px}
.decision-buttons button{min-height:42px;border:1px solid var(--stone);border-radius:6px;background:#fff;color:var(--ink);font:inherit;font-size:12px;font-weight:700;cursor:pointer}
.decision-buttons button[data-decision="approve"]{background:var(--status-green);border-color:var(--status-green);color:#fff}
.decision-buttons button[data-decision="reject"]{border-color:var(--status-red);color:var(--status-red)}
.decision-buttons button:disabled{opacity:.55;cursor:default}
.approval-status{min-height:22px;margin-top:12px;color:var(--text-muted-2);font-size:12px;font-weight:600}
.approval-status.error{color:var(--status-red)}
.approval-status.ok{color:var(--status-green)}
.decision-effect{margin:8px 0;padding:10px 12px;border-left:3px solid var(--stone);background:rgba(230,228,217,.48)}
@media(max-width:760px){.gate-state,.decision-buttons{grid-template-columns:1fr}.gate-metric strong{font-size:22px}}
@media print{.document-review{display:none!important}}
"""


def approval_controls(packet: dict[str, Any], anon_key: str) -> str:
    effects = packet.get("decision_effects") or {}
    effects_html = "".join(
        '<div class="decision-effect"><strong>%s:</strong> %s</div>'
        % (html.escape(action.replace("_", " ").title()), html.escape(str(effects.get(action) or "No effect declared.")))
        for action in (packet.get("allowed_actions") or ALLOWED_ACTIONS)
    )
    actions_json = json.dumps(packet.get("allowed_actions") or list(ALLOWED_ACTIONS)).replace("</", "<\\/")
    expected = {key: packet[key] for key in (
        "gate_id", "run_id", "parent_task_id", "decision_version",
        "artifact_sha256", "context_packet_sha256", "source_commit",
    )}
    expected["decision_version"] = int(expected["decision_version"])
    expected_json = json.dumps(expected).replace("</", "<\\/")
    return f"""
<section class="approval-panel" id="approvalPanel" aria-labelledby="approvalTitle">
  <h2 id="approvalTitle">Review this plan</h2>
  <p>Choose a response below. Your private review link determines which actions are available for this version.</p>
  {effects_html}
  <label for="approvalNote">Additional context</label>
  <p class="approval-context-help" id="approvalContextHelp">Optional. Included with whichever response you choose.</p>
  <textarea id="approvalNote" maxlength="8000" aria-describedby="approvalContextHelp" placeholder="Add requirements, requested changes, or anything the agent should know..."></textarea>
  <label for="snoozeUntil">Snooze until</label>
  <input id="snoozeUntil" type="datetime-local" />
  <div class="decision-buttons" id="decisionButtons">
    <button type="button" data-decision="approve" disabled>Approve</button>
    <button type="button" data-decision="request_changes" disabled>Request changes</button>
    <button type="button" data-decision="snooze" disabled>Snooze</button>
    <button type="button" data-decision="reject" disabled>Reject</button>
  </div>
  <p class="approval-status" id="approvalStatus" role="status">Reading signed capability...</p>
</section>
<script>
(() => {{
  const endpoint = {json.dumps(EDGE_URL)};
  const anonKey = {json.dumps(anon_key)};
  const allowed = new Set({actions_json});
  const expected = {expected_json};
  let verified = false;
  let busy = false;
  const status = document.getElementById('approvalStatus');
  const buttons = [...document.querySelectorAll('#decisionButtons button')];
  const params = new URLSearchParams(location.hash.slice(1));
  const capability = params.get('approval') || '';
  const setState = (message, kind='') => {{ status.textContent = message; status.className = 'approval-status ' + kind; }};
  const disable = (value) => buttons.forEach(button => button.disabled = value || !allowed.has(button.dataset.decision));
  const call = async (payload) => {{
    const response = await fetch(endpoint, {{
      method: 'POST',
      headers: {{'content-type':'application/json','apikey':anonKey,'authorization':'Bearer ' + anonKey}},
      body: JSON.stringify(payload),
      cache: 'no-store'
    }});
    const data = await response.json().catch(() => ({{ok:false,error:'invalid_response'}}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'request_failed');
    return data;
  }};
  const refresh = async () => {{
    if (!capability || !anonKey) {{ disable(true); setState(capability ? 'Public endpoint key is unavailable.' : 'This link has no signed capability.', 'error'); return; }}
    try {{
      const data = await call({{mode:'status', capability}});
      if (!data.capability || !Object.entries(expected).every(([key, value]) => data.capability[key] === value)) {{
        throw new Error('This review link belongs to a different plan or version.');
      }}
      for (const action of allowed) {{
        if (!(data.capability.allowed_actions || []).includes(action)) allowed.delete(action);
      }}
      if (data.event) {{ disable(true); setState('Decision recorded: ' + data.event.decision + ' (' + data.event.event_id + ')', 'ok'); }}
      else {{ verified = true; disable(false); setState('Ready for your response.', 'ok'); }}
    }} catch (error) {{ disable(true); setState('Capability rejected: ' + error.message, 'error'); }}
  }};
  buttons.forEach(button => button.addEventListener('click', async () => {{
    const decision = button.dataset.decision;
    if (!verified || busy || button.disabled || !allowed.has(decision)) return;
    const snoozeInput = document.getElementById('snoozeUntil').value;
    const snoozeDate = new Date(snoozeInput);
    if (decision === 'snooze' && (!snoozeInput || !Number.isFinite(snoozeDate.getTime()) || snoozeDate <= new Date())) {{ setState('Choose a future snooze deadline first.', 'error'); return; }}
    const snoozeUntil = decision === 'snooze' ? snoozeDate.toISOString() : null;
    busy = true;
    disable(true); setState('Recording signed decision...');
    try {{
      const data = await call({{
        mode:'decide', capability, decision,
        note:document.getElementById('approvalNote').value,
        snooze_until:snoozeUntil,
        page_url:location.origin + location.pathname
      }});
      verified = false;
      setState('Decision recorded: ' + data.decision + ' (' + data.event_id + ')', 'ok');
    }} catch (error) {{ disable(false); setState('Decision failed: ' + error.message, 'error'); }}
    finally {{ busy = false; }}
  }}));
  disable(true); refresh();
}})();
</script>
"""


def render_gate(packet: dict[str, Any], out_dir: Path, anon_key: str) -> dict[str, Any]:
    source = normalize_packet(packet)
    validate_packet(source)
    out_dir.mkdir(parents=True, exist_ok=True)
    source_bytes = canonical_json(source)
    artifact_sha = sha256_bytes(source_bytes)
    context_sha = sha256_bytes(canonical_json(source.get("context_packet") or {}))
    (out_dir / "report-source.json").write_bytes(source_bytes)
    source["artifact_sha256"] = artifact_sha
    source["context_packet_sha256"] = context_sha

    sections = []
    for row in source["sections"]:
        sections.append({
            "label": str(row.get("label") or "Evidence"),
            "count_label": str(row.get("count_label") or "evidence"),
            "html": str(row.get("html") or ""),
            "open": bool(row.get("open", False)),
        })
    meta = {
        "report_id": source["gate_id"],
        "generated_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source_task_id": source.get("source_task_id") or source["parent_task_id"],
        "root_task_id": source.get("root_task_id") or source["parent_task_id"],
        "source_paths": "report-source.json",
        "source_name": "human-approval-gate.v1",
        "generated": time.strftime("%Y-%m-%d %H:%M UTC", time.gmtime()),
        "source": "report-source.json",
        "theme": "GBauto approval report",
        "author": "TAC Ops",
        "gate_id": source["gate_id"],
        "run_id": source["run_id"],
        "parent_task_id": source["parent_task_id"],
        "approval_recipient": source["approval_recipient"],
        "artifact_sha256": artifact_sha,
        "context_packet_sha256": context_sha,
        "source_commit": source["source_commit"],
        "decision_version": source["decision_version"],
        "expiry_policy": f"{int(source.get('ttl_seconds') or 3600)} seconds; single use; revocable",
    }
    trace = {key: (source.get("trace") or {}).get(key) or "not captured" for key in REQUIRED_TRACE_FIELDS}
    trace.update(human_approval_gate_id=source["gate_id"], human_approval_decision="Awaiting response")
    page = render_document(
        title=str(source["title"]),
        subtitle=str(source.get("subtitle") or source["recommendation"]),
        eyebrow="Human Approval Gate",
        taxonomy_pills=[
            {"kind": "status", "value": "Awaiting response"},
            {"kind": "type", "value": "Pre-signed"},
            {"kind": "surface", "value": "Netlify"},
        ],
        sections=sections,
        meta=meta,
        include_feedback_widget=False,
        extra_css=APPROVAL_CSS,
        review_controls_html=approval_controls(source, anon_key),
        trace=trace,
    )
    (out_dir / "index.html").write_text(page, encoding="utf-8")
    manifest = {
        "schema_version": "human-approval-gate-manifest.v1",
        "gate_id": source["gate_id"],
        "artifact_sha256": artifact_sha,
        "context_packet_sha256": context_sha,
        "source_commit": source["source_commit"],
        "files": ["index.html", "report-source.json"],
        "capability_embedded": False,
    }
    (out_dir / "manifest.json").write_bytes(canonical_json(manifest))
    return {**manifest, "packet": source}


def post_json(url: str, payload: dict[str, Any], key: str, operator_key: str = "") -> dict[str, Any]:
    headers = {"content-type": "application/json", "apikey": key, "authorization": f"Bearer {key}"}
    if operator_key:
        headers["x-gbauto-operator"] = operator_key
    request = urllib.request.Request(
        url,
        data=canonical_json(payload),
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:500]
        raise RuntimeError(f"Edge request failed ({exc.code}): {detail}") from exc
    if not data.get("ok"):
        raise RuntimeError(f"Edge request failed: {data.get('error')}")
    return data


def deploy_netlify(out_dir: Path, alias: str) -> str:
    auth = secret_json(NETLIFY_SECRET_ID)
    token = secret_value(auth, "value", "token", "auth_token")
    if not token.startswith("nfp_"):
        raise RuntimeError("Netlify token is unavailable")
    netlify = "netlify.cmd" if os.name == "nt" else "netlify"
    env = os.environ.copy()
    env["NETLIFY_AUTH_TOKEN"] = token
    # Netlify writes .netlify/netlify.toml in its working directory. Keep
    # generated CLI state outside both the immutable release and public report.
    with tempfile.TemporaryDirectory(prefix="gbauto-plan-publish-") as cli_state:
        proc = subprocess.run(
            [netlify, "deploy", f"--dir={out_dir.resolve()}", f"--site={NETLIFY_SITE_ID}", f"--alias={alias}", "--json"],
            cwd=cli_state,
            env=env,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=180,
            check=False,
        )
    if proc.returncode != 0:
        raise RuntimeError(f"Netlify deploy failed: {proc.stderr[-800:]}")
    data = json.loads(proc.stdout)
    url = str(data.get("deploy_url") or data.get("deployUrl") or data.get("url") or "").rstrip("/")
    if not url.startswith("https://"):
        raise RuntimeError("Netlify deploy did not return a live URL")
    return url


def gmail_service() -> Any:
    """Resolve the existing Workspace service without exposing credentials."""
    scripts_dir = ROOT / "resources" / "skills" / "consulting-admin" / "scripts"
    module_path = scripts_dir / "gmail_client.py"
    package_name = "gbauto_consulting_admin_scripts"
    package = types.ModuleType(package_name)
    package.__path__ = [str(scripts_dir)]  # type: ignore[attr-defined]
    sys.modules[package_name] = package
    spec = importlib.util.spec_from_file_location(f"{package_name}.gmail_client", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Gmail client could not be loaded")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.google_client.gmail_service()


def send_email(recipient: str, subject: str, base_url: str, capability: str, packet: dict[str, Any]) -> str:
    signed_url = f"{base_url}/#approval={capability}"
    # Drive producers may already own the unrelated consulting-admin `scripts`
    # package. Resolve this stateless adapter by file, as we do the Gmail client.
    spec = importlib.util.spec_from_file_location("gbauto_approval_notify", ROOT / "scripts/human_approval_notify.py")
    if spec is None or spec.loader is None:
        raise RuntimeError("approval notification adapter unavailable")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.send_notification(gmail_service(), recipient, subject, signed_url, packet)


def automatic_watch(packet: dict[str, Any]) -> dict[str, Any] | None:
    """House workers opt in via explicit task/board metadata, never plan prose."""
    profile = os.environ.get("HERMES_PROFILE", "")
    database = os.environ.get("HERMES_KANBAN_DB", "")
    if not database or not profile.startswith(("tac-", "expert-gbautomation-")):
        return None
    if not all(re.fullmatch(r"t_[0-9a-f]{8}", target) for target in packet["allowed_resume_targets"]):
        return None  # Drive access uses a separate decision consumer.
    return {"state": Path.home() / ".hermes/state/human-approval", "db": Path(database),
            "repo": Path(os.environ.get("HERMES_KANBAN_WORKSPACE") or Path.cwd())}


def publish(packet_path: Path, out_dir: Path, alias: str, *, watch: dict[str, Any] | None = None) -> dict[str, Any]:
    source = normalize_packet(load_json(packet_path))
    validate_packet(source)
    watch = watch if watch is not None else automatic_watch(source)
    if watch:
        from scripts.human_approval_enroll import activate, prepare
    receipt_path = out_dir / "publish-receipt.json"
    if watch and receipt_path.exists():
        receipt = load_json(receipt_path)
        if receipt.get("artifact_sha256") != sha256_bytes(canonical_json(source)):
            raise ValueError("published gate source changed; use a new gate/version")
        activate(Path(watch["state"]), source["gate_id"])
        return receipt
    sending = out_dir / "notification-sending.json"
    if watch and sending.exists():
        raise RuntimeError("notification outcome requires reconciliation; do not resend")
    secrets = secret_json(SUPABASE_SECRET_ID)
    anon_key = secret_value(secrets, "anon_key", "publishable_key", "SUPABASE_ANON_KEY")
    operator_key = secret_value(secret_json(OPERATOR_SECRET_ID), "value", "secret")
    if not operator_key or not anon_key:
        raise RuntimeError("Supabase anon and human approval operator keys are required")
    rendered = render_gate(source, out_dir, anon_key)
    packet = rendered.pop("packet")
    if watch:
        prepare(watch, out_dir / "report-source.json", receipt_path)
    base_url = deploy_netlify(out_dir, alias)
    mint_payload = {
        "mode": "mint",
        "gate_id": packet["gate_id"],
        "run_id": packet["run_id"],
        "parent_task_id": packet["parent_task_id"],
        "decision_version": int(packet["decision_version"]),
        "approval_recipient": packet["approval_recipient"],
        "artifact_sha256": rendered["artifact_sha256"],
        "context_packet_sha256": rendered["context_packet_sha256"],
        "source_commit": packet["source_commit"],
        "allowed_actions": packet.get("allowed_actions") or list(ALLOWED_ACTIONS),
        "allowed_resume_targets": packet["allowed_resume_targets"],
        "ttl_seconds": int(packet.get("ttl_seconds") or 3600),
    }
    minted = post_json(EDGE_URL, mint_payload, anon_key, operator_key)
    if watch:
        # At-most-once send boundary. An uncertain result requires readback,
        # never another automatic send. No signed capability is persisted.
        with sending.open("x", encoding="utf-8") as stream:
            stream.write(json.dumps({"gate_id": packet["gate_id"], "artifact_sha256": rendered["artifact_sha256"]}))
    message_id = send_email(
        str(packet["approval_recipient"]),
        str(packet.get("email_subject") or f"TAC PRD: {packet['title']}"),
        base_url,
        str(minted["capability"]),
        packet,
    )
    receipt = {
        "schema_version": "human-approval-publish-receipt.v1",
        "gate_id": packet["gate_id"],
        "run_id": packet["run_id"],
        "parent_task_id": packet["parent_task_id"],
        "report_url": base_url,
        "artifact_sha256": rendered["artifact_sha256"],
        "context_packet_sha256": rendered["context_packet_sha256"],
        "source_commit": packet["source_commit"],
        "capability_jti": minted["capability_jti"],
        "capability_expires_at": minted["expires_at"],
        "approval_recipient": packet["approval_recipient"],
        "notification_message_id": message_id,
        "capability_in_receipt": False,
        "published_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    if watch:
        from scripts.human_approval_enroll import atomic_json
        atomic_json(receipt_path, receipt)
        activate(Path(watch["state"]), packet["gate_id"])
    else:
        receipt_path.write_bytes(canonical_json(receipt))
    return receipt


def operator_status(gate_id: str) -> dict[str, Any]:
    if not re.fullmatch(r"[A-Za-z0-9._:-]{1,180}", gate_id):
        raise ValueError("invalid gate_id")
    secrets = secret_json(SUPABASE_SECRET_ID)
    anon_key = secret_value(secrets, "anon_key", "publishable_key", "SUPABASE_ANON_KEY")
    operator_key = secret_value(secret_json(OPERATOR_SECRET_ID), "value", "secret")
    return post_json(EDGE_URL, {"mode": "operator_status", "gate_id": gate_id}, anon_key, operator_key)


def operator_revoke(gate_id: str) -> dict[str, Any]:
    status = operator_status(gate_id)
    capability = status.get("capability") or {}
    jti = str(capability.get("capability_jti") or "")
    if not jti:
        raise RuntimeError("gate has no capability to revoke")
    secrets = secret_json(SUPABASE_SECRET_ID)
    anon_key = secret_value(secrets, "anon_key", "publishable_key", "SUPABASE_ANON_KEY")
    operator_key = secret_value(secret_json(OPERATOR_SECRET_ID), "value", "secret")
    return post_json(EDGE_URL, {"mode": "revoke", "capability_jti": jti}, anon_key, operator_key)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    render = sub.add_parser("render")
    render.add_argument("--packet", type=Path, required=True)
    render.add_argument("--out-dir", type=Path, required=True)
    render.add_argument("--anon-key", default="")
    publish_cmd = sub.add_parser("publish")
    publish_cmd.add_argument("--packet", type=Path, required=True)
    publish_cmd.add_argument("--out-dir", type=Path, required=True)
    publish_cmd.add_argument("--alias", required=True)
    publish_cmd.add_argument("--watch-state", type=Path)
    publish_cmd.add_argument("--db", type=Path)
    publish_cmd.add_argument("--repo", type=Path)
    status = sub.add_parser("status")
    status.add_argument("--gate-id", required=True)
    revoke = sub.add_parser("revoke")
    revoke.add_argument("--gate-id", required=True)
    args = parser.parse_args(argv)

    if args.command == "render":
        result = render_gate(load_json(args.packet), args.out_dir, args.anon_key)
        result.pop("packet", None)
    elif args.command == "publish":
        watch_args = (args.watch_state, args.db, args.repo)
        if any(watch_args) and not all(watch_args):
            parser.error("--watch-state, --db and --repo must be supplied together")
        watch = dict(zip(("state", "db", "repo"), watch_args)) if all(watch_args) else None
        result = publish(args.packet, args.out_dir, args.alias, watch=watch)
    elif args.command == "status":
        result = operator_status(args.gate_id)
    else:
        result = operator_revoke(args.gate_id)
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
