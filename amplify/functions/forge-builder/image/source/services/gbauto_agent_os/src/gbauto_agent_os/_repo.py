"""Monorepo-root resolution for the validators' repository-relative defaults.

Why this module exists
----------------------
Before Phase 3 every validator lived at ``scripts/<module>.py`` and computed
``REPO_ROOT = Path(__file__).resolve().parents[1]`` — one level up from
``scripts/`` is the repository root, and that arithmetic was correct precisely
because the module's location inside the repository was fixed.

Moving the modules into ``services/gbauto_agent_os/src/gbauto_agent_os/``
breaks that arithmetic, and an installed copy in ``site-packages`` breaks the
premise behind it: there is no repository above an installed wheel. So the
resolution becomes a *search* with an explicit override rather than a hard-coded
parent count.

What ``REPO_ROOT`` is and is not
--------------------------------
It is only ever used for **defaults that name monorepo files** — the ownership
registry, the deterministic-operations allowlist, the source-adapter registry,
the ``experts/`` tree, the repo-relative path arithmetic in receipts. It is
never used to find contract data: the 43 schemas and 204 fixtures resolve
through :func:`gbauto_agent_os.schemas_dir` / :func:`gbauto_agent_os.fixtures_dir`,
which read package data and work identically from a checkout and from a wheel.

An installed consumer that is not sitting in a checkout should pass explicit
paths on the CLI (every one of these defaults has a corresponding flag), or set
``GBAUTO_REPO_ROOT`` to point at a checkout.

Resolution order
----------------
1. ``$GBAUTO_REPO_ROOT`` when set — the explicit, documented escape hatch.
2. The first marker-bearing ancestor of this file. In a source checkout that is
   the repository root and the answer is byte-identical to the pre-move
   ``parents[1]`` result.
3. The first marker-bearing ancestor of the current working directory — covers
   an installed console script run from inside a checkout.
4. The current working directory. Nothing was found, so the repo-relative
   defaults will simply not exist and the validator reports a missing file
   rather than resolving something surprising.
"""

from __future__ import annotations

import os
from pathlib import Path

__all__ = ["REPO_ROOT_ENV_VAR", "repo_root"]

#: Explicit override for an installed copy that still needs monorepo files.
REPO_ROOT_ENV_VAR = "GBAUTO_REPO_ROOT"

#: Directories that together identify the GBAutomation monorepo root. All three
#: must be present, so a lone ``scripts/`` or ``experts/`` directory somewhere
#: up the tree cannot be mistaken for the repository.
_MARKER_DIRS = ("config/agent-os", "experts", "scripts")


def _is_repo_root(candidate: Path) -> bool:
    return all((candidate / marker).is_dir() for marker in _MARKER_DIRS)


def _search_upward(start: Path) -> Path | None:
    for candidate in (start, *start.parents):
        if _is_repo_root(candidate):
            return candidate
    return None


def repo_root() -> Path:
    """Absolute path to the GBAutomation monorepo root, best-effort.

    See the module docstring for the resolution order and for what this value is
    allowed to be used for.
    """
    override = os.environ.get(REPO_ROOT_ENV_VAR)
    if override:
        return Path(override).expanduser().resolve()

    found = _search_upward(Path(__file__).resolve().parent)
    if found is not None:
        return found

    found = _search_upward(Path.cwd().resolve())
    if found is not None:
        return found

    return Path.cwd().resolve()
