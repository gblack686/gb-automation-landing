"""Serve only a generated Forge package and a pinned, read-only Atlas feed on loopback."""
from __future__ import annotations

import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import time
from urllib.parse import urlsplit, parse_qs

from forge_atlas import ROOT, capture, agent_key, validate_snapshot
from render_expert_profile import validate_profile
from forge_planning import capture as capture_planning, validate_snapshot as validate_planning, scope_for, bounded_file
from forge_artifacts import validate_entries, verify_file
from forge_history import capture as capture_history

ALLOWED_FILES = {'/': ('index.html', 'text/html'), '/index.html': ('index.html', 'text/html'),
                 '/expert-config.yaml': ('expert-config.yaml', 'application/yaml')}


def make_server(workdir: Path, agent_id: str, port: int = 18804, reader=capture, *, planning_scope=None, planning_reader=capture_planning, history_reader=capture_history):
    agent_key(agent_id)
    root = workdir.resolve()
    receipt = json.loads(bounded_file(root, 'expert-profile-receipt.json', 100_000).read_text(encoding='utf-8'))
    if receipt['agent_id'] != agent_id:
        raise ValueError('The served Forge package must match the pinned agent')
    lock = threading.Lock()
    cache = {'value': None, 'at': 0.0}
    planning_lock = threading.Lock()
    planning_cache = {'value': None, 'at': 0.0}
    history_lock = threading.Lock()
    if planning_scope is not None and (planning_scope.get('agent_id') != agent_id or
            planning_scope.get('config_sha256') != receipt.get('yaml_sha256') or
            planning_scope != receipt.get('planning', {}).get('scope')):
        raise ValueError('Planning scope must match the served package receipt')
    artifacts = receipt.get('artifacts', [])
    validate_entries(artifacts)
    artifact_files = {'/' + item['filename']: item for item in artifacts}

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def send(self, code, body: bytes, content_type='application/json'):
            self.send_response(code)
            self.send_header('Content-Type', content_type + '; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
            self.send_header('Referrer-Policy', 'no-referrer')
            if content_type == 'text/html' and urlsplit(self.path).path in artifact_files:
                self.send_header('Content-Security-Policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            actual_port = self.server.server_port
            hosts = {f'127.0.0.1:{actual_port}', f'localhost:{actual_port}'}
            host = self.headers.get('Host')
            origin = self.headers.get('Origin')
            if host not in hosts or (origin and origin != f'http://{host}') or self.headers.get('Sec-Fetch-Site') == 'cross-site':
                return self.send(403, b'{"error":"Same-origin loopback only"}')
            url = urlsplit(self.path)
            if url.path == '/api/forge/history':
                if planning_scope is None:
                    return self.send(409, b'{"error":"History requires a confirmed tenant"}')
                try:
                    params = parse_qs(url.query, keep_blank_values=True, strict_parsing=True, max_num_fields=5)
                    if set(params) - {'view', 'session_key', 'message_key', 'after'} or any(len(v) != 1 or not v[0] or len(v[0]) > 512 for v in params.values()):
                        raise ValueError('Invalid parameters')
                    from forge_history import query_sql
                    kwargs = {k: v[0] for k, v in params.items()}
                    query_sql(planning_scope, **kwargs)
                except ValueError:
                    return self.send(400, b'{"error":"Invalid history request"}')
                if not history_lock.acquire(blocking=False):
                    return self.send(429, b'{"error":"A history read is already running"}')
                try:
                    value = history_reader(planning_scope, **kwargs)
                    return self.send(200, json.dumps(value, allow_nan=False).encode('utf-8'))
                except Exception:
                    return self.send(503, b'{"error":"History unavailable; retain the last good view"}')
                finally:
                    history_lock.release()
            if url.path == '/api/forge/planning':
                if url.query:
                    return self.send(400, b'{"error":"Query parameters are not supported"}')
                if planning_scope is None:
                    return self.send(409, b'{"error":"This document has no confirmed planning tenant"}')
                try:
                    with planning_lock:
                        if planning_cache['value'] is None or time.monotonic() - planning_cache['at'] > 60:
                            fresh = planning_reader(planning_scope)
                            validate_planning(fresh, planning_scope)
                            planning_cache.update(value=fresh, at=time.monotonic())
                        value = planning_cache['value']
                    return self.send(200, json.dumps(value, allow_nan=False).encode('utf-8'))
                except Exception:
                    return self.send(503, b'{"error":"Planning refresh unavailable; retain the last good snapshot"}')
            if url.path == '/api/forge/atlas':
                # Browser input cannot change the identity, projection, time window or row limit.
                if url.query:
                    return self.send(400, b'{"error":"Query parameters are not supported"}')
                try:
                    with lock:
                        if cache['value'] is None or time.monotonic() - cache['at'] > 60:
                            fresh = reader(agent_id)
                            validate_snapshot(fresh, agent_id)
                            cache['value'] = fresh
                            cache['at'] = time.monotonic()
                        value = cache['value']
                    return self.send(200, json.dumps(value, allow_nan=False).encode('utf-8'))
                except Exception:
                    return self.send(503, b'{"error":"Supabase read unavailable; keep the saved snapshot"}')
            artifact = artifact_files.get(url.path)
            if artifact is not None:
                if url.query:
                    return self.send(400, b'{"error":"Query parameters are not supported"}')
                try:
                    return self.send(200, verify_file(root, artifact), artifact['mime'])
                except (OSError, ValueError):
                    return self.send(404, b'{"error":"Artifact unavailable"}')
            item = ALLOWED_FILES.get(url.path)
            if item is None:
                return self.send(404, b'{"error":"Not found"}')
            try:
                return self.send(200, bounded_file(root, item[0], 30_000_000).read_bytes(), item[1])
            except (OSError, ValueError):
                return self.send(404, b'{"error":"Not found"}')

    return ThreadingHTTPServer(('127.0.0.1', port), Handler)


def main():
    import sys
    sys.path.insert(0, str(ROOT))
    from resources.lib.tracing import trace_agent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', type=Path, required=True)
    parser.add_argument('--workdir', type=Path, required=True)
    parser.add_argument('--port', type=int, default=18804)
    args = parser.parse_args()
    profile = json.loads(args.profile.read_text(encoding='utf-8'))
    validate_profile(profile)

    @trace_agent('lead_magnet.forge_atlas_refresh', metadata={'mode': 'read_only_loopback'})
    def read(agent_id):
        return capture(agent_id)

    @trace_agent('lead_magnet.forge_planning_refresh', metadata={'mode': 'read_only_loopback'})
    def read_planning(scope):
        return capture_planning(scope)

    @trace_agent('lead_magnet.forge_history_read', metadata={'mode': 'read_only_loopback'})
    def read_history(scope, **kwargs):
        return capture_history(scope, **kwargs)

    server = make_server(args.workdir, profile['config']['agent_id'], args.port, reader=read,
                         planning_scope=scope_for(profile), planning_reader=read_planning, history_reader=read_history)
    print(f'Forge preview: http://127.0.0.1:{server.server_port}/', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
