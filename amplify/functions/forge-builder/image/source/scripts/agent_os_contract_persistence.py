"""Lightweight bridge from repository producers to Agent OS persistence.

The bridge keeps default-off producer paths free of the Agent OS package's
YAML and JSON Schema imports. When production persistence is enabled it loads
the canonical hook from ``gbauto_agent_os.contract_records``; no producer gets
its own database writer.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
PERSIST_ENV = "GBAUTO_AGENT_OS_PERSIST_CONTRACTS"
_ENABLED = frozenset({"1", "true", "yes", "on"})


def persist_validated_document(
    payload: Any,
    *,
    source_ref: str,
    contract_id: str | None = None,
) -> list[str]:
    """Delegate an enabled producer write to the canonical persistence hook."""
    if os.getenv(PERSIST_ENV, "").strip().lower() not in _ENABLED:
        return []
    package_src = REPO_ROOT / "services" / "gbauto_agent_os" / "src"
    if str(package_src) not in sys.path:
        sys.path.insert(0, str(package_src))
    from gbauto_agent_os.contract_records import maybe_persist_document

    return maybe_persist_document(
        payload,
        source_ref=source_ref,
        contract_id=contract_id,
    )
