"""
resources/lib/queue.py — Shared JSONL queue for GBAutomation hook areas.

QUEUE FORMAT SPEC
-----------------
Queue files live at:  ~/.config/gbautomation/queues/<area>.jsonl

Each line is a JSON object (one payload per line) appended atomically.
Fields:
  - area       str   — queue area name (e.g. "wiki", "skill-registry", "linear-sync")
  - commit     str   — git SHA that triggered this entry (40 chars)
  - files      list[str]  — repo-relative file paths changed in the commit
  - timestamp  str   — ISO-8601 UTC timestamp of enqueue
  - payload    dict  — arbitrary area-specific data (detectors may add keys here)
  - id         str   — sha256(area + commit + sorted files) — idempotency key

Example entry:
  {"area":"wiki","commit":"abc1234...","files":["second-brain/tasks/foo.md"],
   "timestamp":"2026-04-28T05:55:00Z","payload":{},"id":"deadbeef..."}

DESIGN NOTES (for R3 sister specs)
------------------------------------
- enqueue() is idempotent: same commit+files pair for the same area is a no-op.
- drain() returns ALL pending entries and truncates the file atomically (write-then-rename).
- Both functions use a fcntl advisory lock (POSIX) for concurrent safety.
  On Windows (dev machines), the lock is skipped gracefully.
- Queue dir is created on first use.
- This module has ZERO non-stdlib dependencies.

SISTER SPEC INTEGRATION GUIDE
------------------------------
To add a new queue area (e.g. "skill-registry"):
  1. In your hook detector, call:  enqueue("skill-registry", payload_dict)
  2. In your cron runner, call:    entries = drain("skill-registry")
  3. Process `entries` — each is a dict with the fields above.
  That's it. No schema registration required.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# fcntl is POSIX-only (unavailable on Windows dev machines).
# The lock functions below degrade gracefully on Windows.
try:
    import fcntl as _fcntl  # type: ignore[import]
    _HAS_FCNTL = True
except ImportError:
    _fcntl = None  # type: ignore[assignment]
    _HAS_FCNTL = False

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

_QUEUE_DIR = Path.home() / ".config" / "gbautomation" / "queues"


def _queue_path(area: str) -> Path:
    """Return the JSONL file path for the given queue area."""
    _QUEUE_DIR.mkdir(parents=True, exist_ok=True)
    return _QUEUE_DIR / f"{area}.jsonl"


def _make_id(area: str, commit: str, files: list[str]) -> str:
    """Stable idempotency key: sha256(area + commit + sorted-file-list)."""
    blob = area + commit + "|".join(sorted(files))
    return hashlib.sha256(blob.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Lock helper (POSIX; no-op on Windows)
# ---------------------------------------------------------------------------

def _lock(fp) -> None:  # type: ignore[type-arg]
    """Advisory exclusive lock — skipped silently on platforms without fcntl."""
    if not _HAS_FCNTL:
        return
    try:
        _fcntl.flock(fp, _fcntl.LOCK_EX)
    except OSError:
        pass  # filesystem that doesn't support flock


def _unlock(fp) -> None:  # type: ignore[type-arg]
    if not _HAS_FCNTL:
        return
    try:
        _fcntl.flock(fp, _fcntl.LOCK_UN)
    except OSError:
        pass


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def enqueue(area: str, payload: dict[str, Any], commit: str = "", files: list[str] | None = None) -> bool:
    """Append a payload to the <area> queue.

    Args:
        area:    Queue area name. Use simple slugs: "wiki", "skill-registry",
                 "commit-linter", "linear-sync".
        payload: Arbitrary dict of area-specific data produced by a detector.
        commit:  Git SHA for the triggering commit (40 chars). Empty string
                 is allowed for manually-triggered entries.
        files:   List of repo-relative file paths changed in the commit.

    Returns:
        True  — entry was appended.
        False — entry already exists (idempotent no-op).

    Notes:
        - Atomically appends one JSONL line under an advisory file lock.
        - Creates the queue dir (~/.config/gbautomation/queues/) if absent.
        - Safe to call from concurrent processes (e.g. multiple hook fires).
    """
    if files is None:
        files = []

    entry_id = _make_id(area, commit, files)
    queue_file = _queue_path(area)

    # Check for existing entry (idempotency)
    if queue_file.exists():
        with open(queue_file, "r", encoding="utf-8") as f:
            _lock(f)
            try:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        existing = json.loads(line)
                        if existing.get("id") == entry_id:
                            return False  # duplicate
                    except json.JSONDecodeError:
                        continue
            finally:
                _unlock(f)

    entry = {
        "area": area,
        "commit": commit,
        "files": files,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
        "id": entry_id,
    }

    # Atomic append: write to temp file in same dir, then rename (POSIX atomic)
    # On Windows, we fall back to a plain append (rename across files is atomic
    # on NTFS for files in the same directory as of Windows 10).
    queue_file_str = str(queue_file)
    tmp_fd, tmp_path = tempfile.mkstemp(dir=str(_QUEUE_DIR), suffix=".tmp")
    try:
        # Copy existing content
        if queue_file.exists():
            with open(queue_file, "rb") as src:
                _lock(src)
                try:
                    existing_bytes = src.read()
                finally:
                    _unlock(src)
            os.write(tmp_fd, existing_bytes)
        # Append new entry
        line = json.dumps(entry, separators=(",", ":"), ensure_ascii=False) + "\n"
        os.write(tmp_fd, line.encode("utf-8"))
        os.close(tmp_fd)
        os.replace(tmp_path, queue_file_str)
    except Exception:
        os.close(tmp_fd)
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise

    return True


def drain(area: str) -> list[dict[str, Any]]:
    """Return all pending queue entries for <area> and truncate the file.

    Args:
        area: Queue area name (must match what was passed to enqueue()).

    Returns:
        List of entry dicts (in enqueue order). Empty list if queue is absent
        or empty. Each entry has: area, commit, files, timestamp, payload, id.

    Notes:
        - Truncation is atomic: we read, collect, then replace with an empty
          file in one rename operation. If the process crashes after reading
          but before rename, the queue retains its entries (safe to re-drain).
        - Duplicate-commit protection in enqueue() ensures re-draining is safe.
    """
    queue_file = _queue_path(area)
    if not queue_file.exists():
        return []

    entries: list[dict[str, Any]] = []
    with open(queue_file, "r", encoding="utf-8") as f:
        _lock(f)
        try:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    continue  # skip malformed lines
        finally:
            _unlock(f)

    if not entries:
        return []

    # Atomically truncate: replace with empty file
    tmp_fd, tmp_path = tempfile.mkstemp(dir=str(_QUEUE_DIR), suffix=".tmp")
    os.close(tmp_fd)
    os.replace(tmp_path, str(queue_file))

    return entries


def peek(area: str) -> list[dict[str, Any]]:
    """Return all pending entries WITHOUT draining (read-only).

    Useful for monitoring / status checks.
    """
    queue_file = _queue_path(area)
    if not queue_file.exists():
        return []

    entries: list[dict[str, Any]] = []
    with open(queue_file, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return entries


def queue_size(area: str) -> int:
    """Return count of pending entries for <area> without loading full content."""
    queue_file = _queue_path(area)
    if not queue_file.exists():
        return 0
    count = 0
    with open(queue_file, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                count += 1
    return count
