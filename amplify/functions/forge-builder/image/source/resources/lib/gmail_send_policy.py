"""Gmail send recipient allowlist -- policy ``gmail_send_recipient_allowlist.v1``.

Mirrors ``resources/lib/telegram_artifact_policy.py``: a frozen decision object, a
named policy version, fail-closed defaults. The SOT is ``config/gmail_send_allowlist.yaml``
(exact addresses + exact domains); every send call site asks :func:`classify_recipients`
BEFORE ``users().messages().send`` / ``drafts().send`` and records the decision with
:func:`write_receipt` -- on refusal too, so the gate is auditable, never silent.

    from resources.lib.gmail_send_policy import gate, SendRefused
    decision = gate(to="x@gbautomation.xyz", cc=None, bcc=None, profile="expert-gbautomation-google-workspace",
                    code_path="consulting-admin.gmail_client.send_email", subject="...")
    ... perform the send ...
    complete_receipt(decision, message_id="18f...", thread_id="18f...")

Receipts: ``outbound_runs`` through the ``gbauto-supabase`` CLI (insert, on-conflict run_id)
plus a JSON copy under ``~/.claude/logs/gmail-send-receipts/<date>/``. Never a body, never
a credential; recipients and subject only.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import re
import shutil
import subprocess
import tempfile
import uuid
from dataclasses import dataclass, field
from email.utils import getaddresses
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence

try:
    import yaml
except Exception:  # pragma: no cover
    yaml = None

POLICY_NAME = "gmail_send_recipient_allowlist.v1"
RECEIPT_SCHEMA = "gmail-send-receipt.v1"
REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG = REPO_ROOT / "config" / "gmail_send_allowlist.yaml"
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")


class SendRefused(PermissionError):
    """Raised by call sites when the policy refuses; carries the receipt that was written."""

    def __init__(self, decision: "SendPolicyDecision"):
        super().__init__(decision.reason)
        self.decision = decision


@dataclass(frozen=True)
class SendPolicyDecision:
    allowed: bool
    recipients: List[str]
    denied: List[str]
    reason_code: str
    reason: str
    policy_name: str = POLICY_NAME
    run_id: str = ""
    profile: str = ""
    code_path: str = ""
    subject: str = ""
    receipt_path: str = ""
    receipt_row: Dict[str, Any] = field(default_factory=dict)


# --------------------------------------------------------------------------- config
def load_allowlist(path: Optional[Path] = None) -> Dict[str, Any]:
    path = Path(path or os.environ.get("GBAUTO_GMAIL_SEND_ALLOWLIST") or DEFAULT_CONFIG)
    if yaml is None or not path.is_file():
        # Fail closed: with no readable allowlist nothing is allowed.
        return {"addresses": [], "domains": [], "receipts": {}, "_missing": str(path)}
    doc = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    addresses = {str(a).strip().lower() for a in (doc.get("addresses") or []) if str(a).strip()}
    domains = {str(d).strip().lower().lstrip("@") for d in (doc.get("domains") or []) if str(d).strip()}
    return {"addresses": sorted(addresses), "domains": sorted(domains), "receipts": doc.get("receipts") or {},
            "policy": doc.get("policy") or POLICY_NAME, "path": str(path)}


def parse_recipients(*fields: Optional[str]) -> List[str]:
    """Flatten To/Cc/Bcc header strings (display names, commas, semicolons) to bare lowercase addresses."""
    out: List[str] = []
    for value in fields:
        if not value:
            continue
        text = str(value).replace(";", ",")
        for _name, addr in getaddresses([text]):
            addr = addr.strip().lower()
            if addr and addr not in out:
                out.append(addr)
    return out


def classify_recipients(recipients: Iterable[str], *, allowlist: Optional[Dict[str, Any]] = None) -> SendPolicyDecision:
    """Every recipient must be an allowed address or sit on an allowed domain (exact match)."""
    cfg = allowlist or load_allowlist()
    recips = [r.strip().lower() for r in recipients if r and r.strip()]
    if not recips:
        return SendPolicyDecision(False, [], [], "no_recipients", "refused: no recipients")
    if cfg.get("_missing"):
        return SendPolicyDecision(False, recips, recips, "allowlist_missing", f"refused: allowlist not readable ({cfg['_missing']})")
    denied: List[str] = []
    for addr in recips:
        if not EMAIL_RE.match(addr):
            denied.append(addr)
            continue
        domain = addr.rsplit("@", 1)[1]
        if addr in cfg["addresses"] or domain in cfg["domains"]:
            continue
        denied.append(addr)
    if denied:
        return SendPolicyDecision(False, recips, denied, "allowlist_denied", f"refused: not on the send allowlist: {', '.join(denied)}")
    return SendPolicyDecision(True, recips, [], "allowlisted", "allowed: every recipient is on the send allowlist")


# --------------------------------------------------------------------------- receipts
def _utc() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0)


def _supabase_cli() -> Optional[str]:
    found = shutil.which("gbauto-supabase")
    if found:
        return found
    for candidate in (Path.home() / ".local" / "bin" / "gbauto-supabase", Path.home() / ".local" / "bin" / "gbauto-supabase.exe"):
        if candidate.exists():
            return str(candidate)
    return None


def build_receipt_row(decision: SendPolicyDecision, *, status: str, message_id: Optional[str] = None,
                      thread_id: Optional[str] = None, failure_reason: Optional[str] = None,
                      dry_run: bool = False, skill_name: str = "google-workspace") -> Dict[str, Any]:
    now = _utc()
    return {
        "run_id": decision.run_id,
        "created_at": now.isoformat().replace("+00:00", "Z"),
        "profile": decision.profile or "unknown",
        "skill_name": skill_name,
        "skill_version": "1.0.0",
        "channel": "email",
        "action": "gmail_send",
        "target_id": message_id,
        "target_name": ", ".join(decision.recipients),
        "status": status,
        "failure_reason": (failure_reason or (decision.reason if not decision.allowed else None) or None),
        "payload": {
            "schema": RECEIPT_SCHEMA, "policy": decision.policy_name, "decision": "allowed" if decision.allowed else "refused",
            "reason_code": decision.reason_code, "recipients": decision.recipients, "denied": decision.denied,
            "subject": (decision.subject or "")[:200], "code_path": decision.code_path, "thread_id": thread_id, "dry_run": dry_run,
        },
        "execution": {"tool": decision.code_path or "gmail_send_policy", "dry_run": dry_run, "host": os.environ.get("COMPUTERNAME") or os.uname().nodename if hasattr(os, "uname") else os.environ.get("COMPUTERNAME", "unknown")},
        "receipt": {"schema": RECEIPT_SCHEMA},
    }


def write_receipt(row: Dict[str, Any], *, disk_root: Optional[Path] = None, insert: bool = True) -> Dict[str, Any]:
    """Disk copy always; Supabase insert through the CLI unless ``insert`` is False (tests, dry runs)."""
    root = Path(disk_root or os.environ.get("GBAUTO_GMAIL_RECEIPT_ROOT") or (Path.home() / ".claude" / "logs" / "gmail-send-receipts"))
    day_dir = root / row["created_at"][:10]
    day_dir.mkdir(parents=True, exist_ok=True)
    path = day_dir / f"{row['run_id']}.json"
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(row, handle, indent=2)
    result: Dict[str, Any] = {"path": str(path).replace("\\", "/"), "supabase": "skipped", "error": None}
    if not insert:
        return result
    cli = _supabase_cli()
    if not cli:
        result["error"] = "gbauto-supabase_missing"
        return result
    tmp = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
    try:
        json.dump(row, tmp)
        tmp.close()
        proc = subprocess.run([cli, "--json", "insert", "outbound_runs", tmp.name, "--on-conflict", "run_id"],
                              capture_output=True, text=True, timeout=90)
        if proc.returncode == 0 and '"ok": false' not in proc.stdout:
            result["supabase"] = "inserted"
        else:
            result["supabase"] = "failed"
            result["error"] = (proc.stderr or proc.stdout).strip()[-200:]
    except (OSError, subprocess.TimeoutExpired) as exc:
        result["supabase"] = "failed"
        result["error"] = exc.__class__.__name__
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass
    return result


# --------------------------------------------------------------------------- the gate
def gate(*, to: Optional[str], cc: Optional[str] = None, bcc: Optional[str] = None, profile: str, code_path: str,
         subject: str = "", dry_run: bool = False, allowlist: Optional[Dict[str, Any]] = None,
         insert_receipts: bool = True) -> SendPolicyDecision:
    """Classify; on refusal write a ``denied`` receipt and raise :class:`SendRefused`.

    On allow, returns the decision with ``run_id`` set; the caller performs the send and then
    calls :func:`complete_receipt` with the message id (or the failure)."""
    cfg = allowlist or load_allowlist()
    verdict = classify_recipients(parse_recipients(to, cc, bcc), allowlist=cfg)
    run_id = f"gmail-send-{_utc().strftime('%Y%m%dT%H%M%SZ')}-{uuid.uuid4().hex[:8]}"
    decision = SendPolicyDecision(verdict.allowed, verdict.recipients, verdict.denied, verdict.reason_code, verdict.reason,
                                  policy_name=cfg.get("policy") or POLICY_NAME, run_id=run_id, profile=profile,
                                  code_path=code_path, subject=subject or "")
    skill = str((cfg.get("receipts") or {}).get("skill_name") or "google-workspace")
    if not decision.allowed:
        row = build_receipt_row(decision, status="denied", dry_run=dry_run, skill_name=skill)
        written = write_receipt(row, insert=insert_receipts)
        raise SendRefused(SendPolicyDecision(**{**decision.__dict__, "receipt_path": written["path"], "receipt_row": row}))
    if dry_run:
        row = build_receipt_row(decision, status="ok", dry_run=True, skill_name=skill)
        written = write_receipt(row, insert=insert_receipts)
        return SendPolicyDecision(**{**decision.__dict__, "receipt_path": written["path"], "receipt_row": row})
    return decision


def complete_receipt(decision: SendPolicyDecision, *, message_id: Optional[str] = None, thread_id: Optional[str] = None,
                     error: Optional[str] = None, allowlist: Optional[Dict[str, Any]] = None,
                     insert_receipts: bool = True) -> Dict[str, Any]:
    """After the API call: ``ok`` with the Gmail message id, or ``fail`` with the error."""
    cfg = allowlist or load_allowlist()
    skill = str((cfg.get("receipts") or {}).get("skill_name") or "google-workspace")
    status = "ok" if message_id and not error else "fail"
    row = build_receipt_row(decision, status=status, message_id=message_id, thread_id=thread_id,
                            failure_reason=error, skill_name=skill)
    written = write_receipt(row, insert=insert_receipts)
    return {**written, "run_id": decision.run_id, "status": status, "message_id": message_id}
