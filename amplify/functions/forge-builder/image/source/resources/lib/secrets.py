"""
resources/lib/secrets.py -- shared secrets helper for GBAutomation scripts.

Two call forms:

1. Platform (AWS Secrets Manager):
     get_secret('telegram/bot')                       -> raw string
     get_secret('core/anthropic-api-key', 'api_key')  -> JSON field

2. Per-client (backend determined by client profile):
     get_secret(client='fisch-group', key='quickbooks-token')

The `name` argument (platform form) is the path *under* the `gbautomation/`
prefix, so get_secret('telegram/bot') calls GetSecretValue for
'gbautomation/telegram/bot'.

Per-client routing reads `second-brain/clients/<slug>/profile.md` to find the
`secrets.backend` field ('aws' or '1password'), then delegates accordingly.
The 1Password backend calls `op read` via subprocess -- this dependency is
isolated so client-agnostic code never imports or invokes it.

lru_cache keeps values for the lifetime of the process.
"""
from __future__ import annotations

import json
import os
import subprocess
from functools import lru_cache
from pathlib import Path

_PREFIX = "gbautomation"
_REGION = "us-east-1"
_REPO_ROOT = Path(__file__).resolve().parents[2]


class UnsupportedBackend(RuntimeError):
    """Raised when a client profile specifies an unknown secrets backend."""


@lru_cache(maxsize=64)
def _fetch_raw(name: str) -> str:
    """Fetch the raw SecretString from AWS Secrets Manager.

    Cached per process -- repeated calls with the same `name` are free.
    Raises ClientError (boto3) on any AWS failure.
    """
    import boto3  # imported lazily so the module can be loaded without boto3 installed

    client = boto3.client("secretsmanager", region_name=_REGION)
    secret_id = f"{_PREFIX}/{name}"
    response = client.get_secret_value(SecretId=secret_id)
    return response["SecretString"]


@lru_cache(maxsize=16)
def _client_secrets_config(client_slug: str) -> dict:
    """Read the 'secrets' section from a client's profile.md frontmatter.

    Returns an empty dict if no 'secrets' key is present.
    Raises FileNotFoundError if the profile does not exist.
    """
    import yaml  # lazy import -- only needed for per-client secret routing

    profile_path = _REPO_ROOT / "second-brain" / "clients" / client_slug / "profile.md"
    if not profile_path.exists():
        raise FileNotFoundError(
            f"No client profile found at {profile_path}. "
            f"Create second-brain/clients/{client_slug}/profile.md with a 'secrets:' section."
        )

    text = profile_path.read_text()
    if not text.startswith("---"):
        return {}
    end = text.index("---", 3)
    fm = yaml.safe_load(text[3:end])
    return fm.get("secrets", {}) if fm else {}


def _fetch_op(op_ref: str, service_account_token: str) -> str:
    """Fetch a secret from 1Password via `op read`.

    Calls the 1Password CLI subprocess. Isolated here so this dependency
    never leaks into callers that use the AWS backend.
    """
    env = {**os.environ, "OP_SERVICE_ACCOUNT_TOKEN": service_account_token}
    try:
        result = subprocess.run(
            ["op", "read", op_ref],
            env=env,
            capture_output=True,
            text=True,
            check=True,
        )
    except FileNotFoundError:
        raise RuntimeError(
            "1Password CLI ('op') not found in PATH. "
            "Install from https://developer.1password.com/docs/cli/get-started/"
        )
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(
            f"op read failed for {op_ref!r}: {exc.stderr.strip()}"
        ) from exc
    return result.stdout.strip()


@lru_cache(maxsize=64)
def _fetch_client_secret(client_slug: str, key: str) -> str:
    """Route a per-client secret request based on the client's configured backend."""
    config = _client_secrets_config(client_slug)
    backend = config.get("backend", "aws")

    if backend == "aws":
        raw = _fetch_raw(f"clients/{client_slug}/{key}")
        field = config.get("key_field")
        if field:
            return json.loads(raw)[field]
        return raw

    if backend == "1password":
        vault = config["vault"]
        token_path = config["op_token_path"]
        token = _fetch_raw(token_path)
        op_ref = f"op://{vault}/{key}/credential"
        return _fetch_op(op_ref, token)

    raise UnsupportedBackend(
        f"Unknown secrets backend {backend!r} for client {client_slug!r}. "
        "Supported values: 'aws', '1password'."
    )


def get_secret(name: str | None = None, key: str | None = None, *, client: str | None = None) -> str:
    """Return a secret value.

    Platform call (AWS Secrets Manager):
        get_secret('telegram/bot')                       -> raw string
        get_secret('core/anthropic-api-key', 'api_key')  -> JSON field

    Per-client call (backend from client profile):
        get_secret(client='fisch-group', key='quickbooks-token')

    Args:
        name:   Path under the 'gbautomation/' prefix (platform form only).
        key:    JSON field name (platform) or item name in the client's store.
        client: Client slug. When set, routes to the client's configured backend.

    Returns:
        The secret value as a plain string.

    Raises:
        ValueError: if required arguments are missing.
        FileNotFoundError: if the client profile does not exist.
        UnsupportedBackend: if the profile specifies an unknown backend.
        botocore.exceptions.ClientError: on AWS Secrets Manager errors.
        RuntimeError: if the 1Password CLI is unavailable or `op read` fails.
    """
    if client is not None:
        if key is None:
            raise ValueError("'key' is required when 'client' is provided")
        return _fetch_client_secret(client, key)

    if name is None:
        raise ValueError("Either 'name' or 'client' must be provided")

    raw = _fetch_raw(name)
    if key is None:
        return raw
    return json.loads(raw)[key]
