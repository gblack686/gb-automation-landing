"""Host-named deployment environment for observability producers.

One answer to "which machine sent this?" shared by the Langfuse hook lanes
(OTel ``deployment.environment`` resource attribute) and the Python SDK lane
(``resources.lib.tracing``), so every trace can be grouped by host in Langfuse
regardless of which producer emitted it. Ruled 2026-09-02: the value names the
host, not a stage — ``mac-mini`` vs ``gregs-acer`` — and is never a client or
tenant identifier.

Deliberately dependency-free: the hook must call this before the Langfuse SDK
is imported, because OTel resource attributes are snapshotted at SDK init.
"""

from __future__ import annotations

import os
import sys
import getpass
import ipaddress
import platform as platform_module
import socket
from datetime import datetime, timezone

OVERRIDE_ENV_VAR = "GBAUTO_DEPLOYMENT_ENV"
GITHUB_ACTIONS = "github-actions"
MAC_MINI = "mac-mini"
GREGS_ACER = "gregs-acer"
LOCAL = "local"
KNOWN_HOSTS = (GITHUB_ACTIONS, MAC_MINI, GREGS_ACER, LOCAL)


def deployment_environment(environ: os._Environ[str] | dict[str, str] | None = None,
                           platform: str | None = None, os_name: str | None = None) -> str:
    """Return the host-named environment.

    Precedence: explicit ``GBAUTO_DEPLOYMENT_ENV`` > GitHub Actions > macOS
    (the Mac Mini) > Windows (Greg's Acer laptop) > ``local``. The optional
    arguments exist so tests can pin a platform without monkeypatching globals.
    """
    env = os.environ if environ is None else environ
    explicit = str(env.get(OVERRIDE_ENV_VAR) or "").strip()
    if explicit:
        return explicit
    if str(env.get("GITHUB_ACTIONS") or "").lower() == "true":
        return GITHUB_ACTIONS
    if (platform or sys.platform) == "darwin":
        return MAC_MINI
    if (os_name or os.name) == "nt":
        return GREGS_ACER
    return LOCAL


def normalize_host_ips(values) -> list[str]:
    """Validate bounded host interface addresses, excluding unusable addresses."""
    if not isinstance(values, list) or len(values) > 16:
        return []
    found = []
    for value in values:
        if not isinstance(value, str) or '%' in value:
            continue
        try: address = ipaddress.ip_address(value)
        except ValueError: continue
        if address.is_loopback or address.is_unspecified or address.is_multicast or address.is_link_local:
            continue
        if str(address) not in found: found.append(str(address))
    return found


def observed_host_metadata() -> dict:
    """Observe only named host fields; never copy the process environment.

    Uses the hostname resolver already used by session history capture. These
    are locally resolved interface addresses, not a public-IP lookup. The
    collection timestamp distinguishes current host context from event time.
    """
    hostname = socket.gethostname()
    try: username = getpass.getuser()
    except (OSError, KeyError): username = ''
    try: addresses = [row[4][0] for row in socket.getaddrinfo(hostname, None)]
    except OSError: addresses = []
    addresses = normalize_host_ips(list(dict.fromkeys(addresses))[:16])
    result = {'hostname': hostname, 'host': deployment_environment(),
              'os_version': platform_module.release(), 'architecture': platform_module.machine(),
              'host_metadata_captured_at': datetime.now(timezone.utc).isoformat()}
    if username and len(username) <= 128 and not any(ord(c) < 32 for c in username):
        result['username'] = username
    if addresses: result.update(host_ip=addresses[0], host_ips=addresses)
    return result


__all__ = ["deployment_environment", "observed_host_metadata", "normalize_host_ips", "OVERRIDE_ENV_VAR", "KNOWN_HOSTS", "GITHUB_ACTIONS", "MAC_MINI", "GREGS_ACER", "LOCAL"]
