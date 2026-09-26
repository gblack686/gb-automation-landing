"""gbauto_agent_os — the GBAutomation Agent OS V2.4 contract layer.

This package is the single source of truth for the Agent OS contract set: the
v1 JSON Schemas, the conformance fixtures, and (from Phase 3 onward) the
validators and their CLI entry points. Consumers — the monorepo CI gate, the
gbauto-hermes-aws proof of concept, the hermes-gbauto template and per-client
Hermes stacks — depend on a pinned version of this package rather than copying
the contracts, so a contract fix lands once instead of once per fork.

Phase 2 status
--------------
The contract data has landed. ``schemas/`` holds the 43 v1 JSON Schemas and
``fixtures/`` holds the 204 conformance fixtures, both declared explicitly as
package data in ``pyproject.toml`` and both proven present in a built wheel.
They were ``git mv``d out of the repository's ``schemas/`` and
``fixtures/agent-os/`` trees, which no longer exist — there is no second copy.

The validators have NOT moved yet; that is Phase 3. Until then the monorepo's
``scripts/*.py`` validators reach this package for their data by putting
``services/gbauto_agent_os/src`` on ``sys.path`` (tests do it via pytest.ini's
``pythonpath``), because the package is not installed in a monorepo checkout.

Path helpers
------------
``schemas_dir()`` and ``fixtures_dir()`` resolve package data relative to this
module, never relative to a repository checkout. That is deliberate: a path
resolved from the repository root works in a source tree and fails at install
time, which is exactly the failure Phase 2 exists to catch.

Compatibility matrix (Phase 4.1)
--------------------------------
``compatibility-matrix.json`` is the version contract that makes a pin
meaningful: per package version, which contract this package supplies and at
which ``schema_version``. It ships as package data (declared explicitly in
``pyproject.toml`` alongside the schemas and fixtures) so an installed consumer
can resolve its pin without a repository checkout, and it is read through
``compatibility_matrix()``.

Two facts about the shipped matrix that the strict-mode resolver (step 4.2)
depends on, recorded here so nobody has to re-derive them:

* **Contract id is the schema filename with its ``.v<N>.schema.json`` suffix
  stripped** — ``agent-configuration``, ``build-receipt``,
  ``ecom-orchestrator-contract``. The id names the contract *family*; the value
  names the generation supplied. Putting the generation in the key too would
  make the value redundant and the matrix unable to express a version bump.
* **The supplied ``schema_version`` is read out of the schema file itself**, by
  this precedence: ``properties.schema_version.const`` (34 schemas — note
  ``build-receipt`` declares the integer ``1``, carried as the string ``"1"``,
  and ``artifact-index`` declares ``artifact.index.v1``, which is *not* its
  filename); else ``properties.schema.const`` (3 schemas, the
  ``gbauto-tac-artifact-manifest`` / client-hub pair); else the generation token
  from the filename (1 schema — ``ecom-orchestrator-contract`` is a bare
  ``oneOf`` union and declares no version property anywhere in its body).

The historical ``0.1.0`` row retains the original 40-contract set. Version
``0.2.0`` adds the three Agent Forge research-planning contracts and carries the
current 43-contract corpus. This lets strict consumers prove that a stale
``0.1.0`` pin fails closed when the new contracts are required while preserving
an honest record of what each released package version supplied.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

__all__ = [
    "__version__",
    "SCHEMA_VERSION",
    "COMPATIBILITY_MATRIX_SCHEMA_VERSION",
    "package_root",
    "schemas_dir",
    "fixtures_dir",
    "compatibility_matrix_path",
    "compatibility_matrix",
    "main",
]

#: Distribution version. Keep in step with ``[project] version`` in pyproject.toml.
__version__ = "0.2.0"

#: The contract generation this package ships. Every schema under ``schemas/``
#: is a ``*.v1.schema.json``; consumers pin against this.
SCHEMA_VERSION = "v1"

#: The ``schema_version`` the compatibility matrix document itself declares.
#: Readers that do not recognise this value must refuse rather than guess.
COMPATIBILITY_MATRIX_SCHEMA_VERSION = "gbauto-agent-os-compatibility-matrix.v1"


def package_root() -> Path:
    """Absolute path to the installed package directory."""
    return Path(__file__).resolve().parent


def schemas_dir() -> Path:
    """Absolute path to the bundled v1 JSON Schemas (package data)."""
    return package_root() / "schemas"


def fixtures_dir() -> Path:
    """Absolute path to the bundled conformance fixtures (package data)."""
    return package_root() / "fixtures"


def compatibility_matrix_path() -> Path:
    """Absolute path to the bundled compatibility matrix (package data)."""
    return package_root() / "compatibility-matrix.json"


def compatibility_matrix() -> dict:
    """Return the parsed compatibility matrix shipped with this package.

    Resolved from package data, exactly like ``schemas_dir()`` — an installed
    consumer with no repository checkout gets the same answer a monorepo
    checkout gets. Raises rather than returning a default: a strict-mode
    resolver that silently saw an empty matrix would pass every pin, which is
    the failure mode Phase 4 exists to remove.
    """
    return json.loads(compatibility_matrix_path().read_text(encoding="utf-8"))


def main(argv: "list[str] | None" = None) -> int:
    """Console entry point for ``gbauto-agent-os``.

    ``validate`` is the contract-set validate path, and the surface Phase 4.2
    hangs ``--strict`` off: ``validate --strict`` resolves the consumer's pinned
    package version against ``compatibility-matrix.json`` BEFORE validating a
    single contract, and refuses with a named error code and a distinct exit
    code (see :mod:`gbauto_agent_os._pins`) when the pin cannot be satisfied.

    Every other invocation is the Phase 2 skeleton, unchanged to the byte: it
    reports what the installed package contains, which is the only claim it can
    make honestly, and returns 0. Phase 4.2 deliberately did not touch it —
    ``--strict`` is opt-in, so nothing that does not type ``validate --strict``
    can observe that Phase 4 landed.
    """
    argv = list(sys.argv[1:] if argv is None else argv)

    if argv and argv[0] == "validate":
        from ._pins import validate_cli

        return validate_cli(argv[1:])

    schemas = sorted(p.name for p in schemas_dir().glob("*.json"))
    fixtures = sum(1 for p in fixtures_dir().rglob("*") if p.is_file())

    print(f"gbauto-agent-os {__version__} (contracts {SCHEMA_VERSION})")
    print(f"  package root : {package_root()}")
    print(f"  schemas      : {len(schemas)}")
    print(f"  fixtures     : {fixtures}")
    if argv:
        print(f"  note         : no verbs yet (Phase 2 skeleton); ignored {argv}")
    return 0


if __name__ == "__main__":  # pragma: no cover - exercised via the console script
    raise SystemExit(main())
