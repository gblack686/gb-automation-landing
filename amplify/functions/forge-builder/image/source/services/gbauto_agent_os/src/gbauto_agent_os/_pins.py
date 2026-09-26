"""Pin resolution against the compatibility matrix — Phase 4.2, fail-closed strict mode.

What this module is for
-----------------------
Phase 4.1 shipped ``compatibility-matrix.json`` as package data: per package
version, which contract this package supplies and at which ``schema_version``.
A matrix nobody reads is a document, not a contract. This module is the reader,
and :func:`resolve_pin` is the gate.

Operator decision D1 was ratified as FAIL-CLOSED STRICT. Warn-only was offered
and rejected. So an unsatisfiable pin does not produce a warning next to a green
result — it produces a non-zero exit whose reason is *named*.

Why the reason has to be named
------------------------------
The V2.4 closeout's F05 defect was a gate that failed for the right thing and
recorded the WRONG REASON. A gate that exits 1 with "validation failed" is
indistinguishable, to the operator reading the receipt, from a schema typo. So
the error identity is the deliverable here, and it is carried three ways that
must agree:

* ``error`` in the JSON payload — the exact string from the agreed interface;
* the process exit code — one distinct code per named error (see
  :data:`EXIT_CODES`), so a shell that never parses the JSON still learns which
  refusal happened;
* ``exit_code`` echoed inside the payload, so a receipt captured from stdout
  alone is self-describing.

The three named codes, and how they are told apart
--------------------------------------------------
The agreed interface defines three codes. They overlap in prose, so the split
implemented here is stated explicitly and is checked in
``tests/test_agent_os_strict_mode.py``:

``unknown_package_version``
    The pin is not a key in ``package_versions``. Nothing about the request can
    be evaluated, so this is decided before any contract is looked at. A matrix
    that is missing, unparseable, or declares a ``schema_version`` this reader
    does not recognise lands here too: in each case the pin cannot be found in a
    matrix, which is exactly what the code says. Refusing beats guessing.

``unsatisfiable_pin``
    The pin EXISTS in the matrix, but its row carries no entry for a contract
    the consumer needs. This is the stale-pin case the plan calls the core
    proof: "pin a version predating a contract". The pinned build simply does
    not ship that contract, at any generation.

``unknown_schema_version``
    The pin exists AND supplies the contract, but at a different generation than
    the consumer asked for. The request names a ``schema_version`` that is not
    the one this package supplies for that contract — the literal wording of the
    interface.

Read as a decision list, that is: is the version known? then is the contract
present? then is the generation the one asked for? Each "no" has its own name.

Contract ids and supplied generations
-------------------------------------
Both are derived exactly the way 4.1 derived them when writing the matrix, and
:func:`package_requirements` reproducing the shipped matrix byte-for-byte is
asserted by the positive test. If the two derivations ever drift, the positive
test fails rather than the gate quietly resolving against a different corpus.

* Contract id = schema filename with its ``.v<N>.schema.json`` suffix stripped.
* Supplied ``schema_version`` = ``properties.schema_version.const`` if present
  (as a string — ``build-receipt`` declares the integer ``1``), else
  ``properties.schema.const``, else the generation token from the filename
  (``ecom-orchestrator-contract`` is a bare ``oneOf`` union with no version
  property anywhere in its body).

Nothing in this module resolves anything from a repository checkout. The matrix
and the schemas are package data, so an installed consumer with no checkout runs
the same resolution a monorepo checkout runs.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Iterable, Mapping, NamedTuple, Sequence

__all__ = [
    "ERROR_UNSATISFIABLE_PIN",
    "ERROR_UNKNOWN_PACKAGE_VERSION",
    "ERROR_UNKNOWN_SCHEMA_VERSION",
    "NAMED_ERROR_CODES",
    "EXIT_OK",
    "EXIT_CONTRACT_VIOLATION",
    "EXIT_CODES",
    "PinResolutionError",
    "Requirement",
    "contract_id_for",
    "supplied_schema_version",
    "package_requirements",
    "load_matrix",
    "resolve_pin",
    "validate_cli",
]


#: Pinned version exists but cannot supply a contract the consumer needs.
ERROR_UNSATISFIABLE_PIN = "unsatisfiable_pin"

#: Pinned version is absent from the matrix (or the matrix cannot be read).
ERROR_UNKNOWN_PACKAGE_VERSION = "unknown_package_version"

#: Requested schema_version is not the one this package supplies for a contract.
ERROR_UNKNOWN_SCHEMA_VERSION = "unknown_schema_version"

#: The complete named vocabulary. A refusal outside this set is a bug.
NAMED_ERROR_CODES = (
    ERROR_UNSATISFIABLE_PIN,
    ERROR_UNKNOWN_PACKAGE_VERSION,
    ERROR_UNKNOWN_SCHEMA_VERSION,
)

#: Everything resolved and every contract validated.
EXIT_OK = 0

#: A shipped contract is not a usable JSON Schema. 2 is the exit code every
#: other Agent OS validator already uses for "a violation was found", so a
#: caller that only knows the existing convention still reads this correctly.
EXIT_CONTRACT_VIOLATION = 2

#: One distinct exit code per named error, so the refusal is identifiable
#: without parsing stdout. These start at 3 to stay clear of 2 above and of
#: argparse's own 2-on-usage-error.
EXIT_CODES = {
    ERROR_UNSATISFIABLE_PIN: 3,
    ERROR_UNKNOWN_PACKAGE_VERSION: 4,
    ERROR_UNKNOWN_SCHEMA_VERSION: 5,
}

_GENERATION_SUFFIX = re.compile(r"\.(v\d+)\.schema\.json$")


class PinResolutionError(Exception):
    """A pin could not be resolved against the matrix, with a NAMED reason.

    Never raised without one of :data:`NAMED_ERROR_CODES`; the constructor
    rejects anything else, because an unnamed refusal is the F05 defect.
    """

    def __init__(
        self,
        code: str,
        message: str,
        *,
        pin: str,
        contract: "str | None" = None,
        requested_schema_version: "str | None" = None,
        supplied_schema_version: "str | None" = None,
        matrix_path: "str | None" = None,
    ) -> None:
        if code not in NAMED_ERROR_CODES:
            raise ValueError(
                f"refusal code {code!r} is not one of the named codes "
                f"{NAMED_ERROR_CODES!r}"
            )
        super().__init__(message)
        self.code = code
        self.message = message
        self.pin = pin
        self.contract = contract
        self.requested_schema_version = requested_schema_version
        self.supplied_schema_version = supplied_schema_version
        self.matrix_path = matrix_path

    @property
    def exit_code(self) -> int:
        """The process exit code that identifies this refusal."""
        return EXIT_CODES[self.code]

    def to_dict(self) -> dict:
        """The refusal as the JSON payload the CLI prints."""
        return {
            "ok": False,
            "error": self.code,
            "message": self.message,
            "pin": self.pin,
            "contract": self.contract,
            "requested_schema_version": self.requested_schema_version,
            "supplied_schema_version": self.supplied_schema_version,
            "matrix_path": self.matrix_path,
            "exit_code": self.exit_code,
        }


class Requirement(NamedTuple):
    """One thing a consumer needs: a contract, at a generation."""

    contract: str
    schema_version: str


def contract_id_for(filename: str) -> str:
    """Contract id for a schema filename (``foo.v1.schema.json`` -> ``foo``)."""
    return _GENERATION_SUFFIX.sub("", filename)


def _generation_for(filename: str) -> "str | None":
    match = _GENERATION_SUFFIX.search(filename)
    return match.group(1) if match else None


def supplied_schema_version(document: Mapping, filename: str) -> str:
    """The ``schema_version`` a contract document declares.

    Precedence is 4.1's, reproduced rather than re-invented — see the module
    docstring. Returns a string always: ``build-receipt`` declares the integer
    ``1`` and the matrix carries ``"1"``.
    """
    properties = document.get("properties")
    if isinstance(properties, Mapping):
        for key in ("schema_version", "schema"):
            node = properties.get(key)
            if isinstance(node, Mapping) and "const" in node:
                return str(node["const"])
    generation = _generation_for(filename)
    if generation is not None:
        return generation
    raise ValueError(
        f"{filename}: declares no schema_version and carries no .v<N> "
        "generation token, so the contract it supplies cannot be named"
    )


def package_requirements(schemas_directory: "Path | None" = None) -> "tuple[Requirement, ...]":
    """The full contract set this package ships, as consumer requirements.

    This is the default requirement set for ``validate --strict``: every
    contract under ``schemas/``, each at the generation the schema itself
    declares. Sorted by contract id, so the first refusal a stale pin produces
    is deterministic and a receipt is reproducible.
    """
    if schemas_directory is None:
        from . import schemas_dir  # local import: avoids a package import cycle

        schemas_directory = schemas_dir()

    requirements = []
    for path in sorted(schemas_directory.glob("*.schema.json")):
        document = json.loads(path.read_text(encoding="utf-8-sig"))
        requirements.append(
            Requirement(
                contract_id_for(path.name),
                supplied_schema_version(document, path.name),
            )
        )
    return tuple(sorted(requirements))


def load_matrix(path: "Path | None" = None) -> dict:
    """Read the compatibility matrix (package data unless ``path`` is given)."""
    if path is None:
        from . import compatibility_matrix  # local import: avoids a cycle

        return compatibility_matrix()
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _matrix_or_refuse(pin: str, matrix: "Mapping | None", path: "Path | None") -> dict:
    """Load and sanity-check the matrix, refusing with a NAMED code on failure.

    A matrix that is absent, unparseable, or of an unrecognised generation is
    treated as ``unknown_package_version``: the pin is not findable in a matrix,
    which is precisely what that code means. The alternative — resolving
    against ``{}`` — passes every pin, which is the exact failure Phase 4
    exists to remove.
    """
    from . import COMPATIBILITY_MATRIX_SCHEMA_VERSION

    where = str(path) if path is not None else None
    if matrix is None:
        try:
            matrix = load_matrix(path)
        except FileNotFoundError as exc:
            raise PinResolutionError(
                ERROR_UNKNOWN_PACKAGE_VERSION,
                f"pin {pin!r} cannot be resolved: no compatibility matrix at "
                f"{exc.filename!r}",
                pin=pin,
                matrix_path=where or getattr(exc, "filename", None),
            ) from exc
        except ValueError as exc:  # json.JSONDecodeError subclasses ValueError
            raise PinResolutionError(
                ERROR_UNKNOWN_PACKAGE_VERSION,
                f"pin {pin!r} cannot be resolved: the compatibility matrix does "
                f"not parse ({exc})",
                pin=pin,
                matrix_path=where,
            ) from exc

    if not isinstance(matrix, Mapping):
        raise PinResolutionError(
            ERROR_UNKNOWN_PACKAGE_VERSION,
            f"pin {pin!r} cannot be resolved: the compatibility matrix is a "
            f"{type(matrix).__name__}, not an object",
            pin=pin,
            matrix_path=where,
        )

    declared = matrix.get("schema_version")
    if declared != COMPATIBILITY_MATRIX_SCHEMA_VERSION:
        raise PinResolutionError(
            ERROR_UNKNOWN_PACKAGE_VERSION,
            f"pin {pin!r} cannot be resolved: matrix declares schema_version "
            f"{declared!r}, this reader understands only "
            f"{COMPATIBILITY_MATRIX_SCHEMA_VERSION!r}",
            pin=pin,
            matrix_path=where,
        )
    return dict(matrix)


def resolve_pin(
    pin: str,
    requirements: Iterable[Requirement],
    *,
    matrix: "Mapping | None" = None,
    matrix_path: "Path | None" = None,
) -> dict:
    """Resolve ``pin`` against the matrix, or raise :class:`PinResolutionError`.

    Returns a receipt dict on success. Raises with a named code otherwise; there
    is no third outcome and no warn-only mode (operator decision D1).
    """
    resolved = _matrix_or_refuse(pin, matrix, matrix_path)
    where = str(matrix_path) if matrix_path is not None else None

    package_versions = resolved.get("package_versions")
    if not isinstance(package_versions, Mapping) or pin not in package_versions:
        known = sorted(package_versions) if isinstance(package_versions, Mapping) else []
        raise PinResolutionError(
            ERROR_UNKNOWN_PACKAGE_VERSION,
            f"pinned version {pin!r} is absent from the compatibility matrix "
            f"(declared versions: {known or 'none'})",
            pin=pin,
            matrix_path=where,
        )

    row = package_versions[pin]
    contracts = row.get("contracts") if isinstance(row, Mapping) else None
    if not isinstance(contracts, Mapping):
        raise PinResolutionError(
            ERROR_UNSATISFIABLE_PIN,
            f"pinned version {pin!r} declares no contracts map, so it can "
            "supply nothing",
            pin=pin,
            matrix_path=where,
        )

    checked = []
    for requirement in sorted(requirements):
        if requirement.contract not in contracts:
            raise PinResolutionError(
                ERROR_UNSATISFIABLE_PIN,
                f"pinned version {pin!r} does not supply contract "
                f"{requirement.contract!r}, which the consumer needs at "
                f"{requirement.schema_version!r}",
                pin=pin,
                contract=requirement.contract,
                requested_schema_version=requirement.schema_version,
                supplied_schema_version=None,
                matrix_path=where,
            )
        supplied = str(contracts[requirement.contract])
        if supplied != requirement.schema_version:
            raise PinResolutionError(
                ERROR_UNKNOWN_SCHEMA_VERSION,
                f"contract {requirement.contract!r} is requested at "
                f"{requirement.schema_version!r}, but pinned version {pin!r} "
                f"supplies {supplied!r}",
                pin=pin,
                contract=requirement.contract,
                requested_schema_version=requirement.schema_version,
                supplied_schema_version=supplied,
                matrix_path=where,
            )
        checked.append({"contract": requirement.contract, "schema_version": supplied})

    return {
        "pin": pin,
        "matrix_schema_version": resolved.get("schema_version"),
        "matrix_path": where,
        "contracts_resolved": len(checked),
        "contracts": checked,
    }


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------


def _parse_require(values: "Sequence[str] | None") -> "tuple[Requirement, ...] | None":
    if not values:
        return None
    requirements = []
    for raw in values:
        contract, sep, schema_version = raw.partition("=")
        if not sep or not contract or not schema_version:
            raise argparse.ArgumentTypeError(
                f"--require expects CONTRACT=SCHEMA_VERSION, got {raw!r}"
            )
        requirements.append(Requirement(contract, schema_version))
    return tuple(sorted(requirements))


def _validate_contracts(schemas_directory: Path) -> "list[dict]":
    """Check every shipped contract is a usable JSON Schema. Returns findings."""
    import jsonschema

    findings = []
    for path in sorted(schemas_directory.glob("*.schema.json")):
        try:
            document = json.loads(path.read_text(encoding="utf-8-sig"))
        except ValueError as exc:
            findings.append({"contract": path.name, "problem": f"does not parse: {exc}"})
            continue
        if not isinstance(document, dict):
            findings.append({"contract": path.name, "problem": "is not a JSON object"})
            continue
        try:
            jsonschema.validators.validator_for(document).check_schema(document)
        except Exception as exc:  # jsonschema raises SchemaError, and worse on junk
            findings.append(
                {"contract": path.name, "problem": f"is not a valid JSON Schema: {exc}"}
            )
    return findings


def validate_cli(argv: Sequence[str]) -> int:
    """``gbauto-agent-os validate [--strict ...]``.

    Without ``--strict`` this validates the shipped contract corpus and says
    nothing about pins — no matrix is read, so a consumer that never opted in
    sees behaviour that does not depend on Phase 4 landing at all.

    With ``--strict`` the pin is resolved against the matrix FIRST, before a
    single contract is validated. That ordering is the point: a stale pin must
    not be able to produce a green contract report on its way to failing.
    """
    parser = argparse.ArgumentParser(
        prog="gbauto-agent-os validate",
        description=(
            "Validate the shipped Agent OS contract set; with --strict, first "
            "resolve the consumer's pinned package version against the "
            "compatibility matrix and refuse with a named error code."
        ),
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="resolve the pin against the compatibility matrix before validating",
    )
    parser.add_argument(
        "--pin",
        default=None,
        help="the package version the consumer pins (default: this package's version)",
    )
    parser.add_argument(
        "--matrix",
        default=None,
        help="read the matrix from this path instead of package data (testing/override)",
    )
    parser.add_argument(
        "--require",
        action="append",
        metavar="CONTRACT=SCHEMA_VERSION",
        help=(
            "a contract the consumer needs, repeatable. When given, these "
            "REPLACE the default requirement set (every shipped contract at the "
            "generation it declares)."
        ),
    )
    args = parser.parse_args(list(argv))

    from . import __version__, schemas_dir

    pin = args.pin or __version__
    payload: dict = {"verb": "validate", "strict": bool(args.strict), "pin": pin}

    if args.strict:
        try:
            requirements = _parse_require(args.require)
        except argparse.ArgumentTypeError as exc:
            parser.error(str(exc))
        if requirements is None:
            requirements = package_requirements()
        try:
            resolution = resolve_pin(
                pin,
                requirements,
                matrix_path=Path(args.matrix) if args.matrix else None,
            )
        except PinResolutionError as exc:
            payload.update(exc.to_dict())
            payload["contracts_validated"] = 0
            print(json.dumps(payload, indent=2, sort_keys=True))
            return exc.exit_code
        payload["resolution"] = {
            key: value for key, value in resolution.items() if key != "contracts"
        }
        payload["contracts_required"] = len(requirements)

    findings = _validate_contracts(schemas_dir())
    payload["contracts_validated"] = len(sorted(schemas_dir().glob("*.schema.json")))
    payload["findings"] = findings
    payload["ok"] = not findings
    if findings:
        payload["error"] = "contract_invalid"
        payload["exit_code"] = EXIT_CONTRACT_VIOLATION
        print(json.dumps(payload, indent=2, sort_keys=True))
        return EXIT_CONTRACT_VIOLATION

    payload["exit_code"] = EXIT_OK
    print(json.dumps(payload, indent=2, sort_keys=True))
    return EXIT_OK
