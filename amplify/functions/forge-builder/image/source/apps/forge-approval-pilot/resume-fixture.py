"""Exercise the existing narrow resume writer on a disposable Kanban fixture.

The Forge service supplies a database-read release. This does not fabricate a
legacy HMAC verification result or permit a path to a live Kanban database.
"""
import hashlib
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from scripts.human_approval_resume import apply_decision  # noqa: E402


def resume(request: dict) -> dict:
    root = Path(request['root']).resolve()
    if not (root / 'mirror' / '.forge-pilot').is_file() or root == ROOT:
        raise ValueError('isolated_pilot_root_required')
    release = request['release']
    if release.get('schema_version') != 'forge-approval-release.v1' or release.get('execution_performed') is not False:
        raise ValueError('bound_nonexecuting_release_required')
    targets = release['binding']['targets']
    if len(targets) != 1 or not targets[0].startswith('pilot-fw_'):
        raise ValueError('disposable_target_required')
    database = root / 'resume-fixture.sqlite'
    with sqlite3.connect(database) as conn:
        conn.executescript('''create table if not exists tasks(id text primary key,status text,assignee text,title text,consecutive_failures integer,body text);
          create table if not exists task_events(task_id text,kind text,payload text,created_at integer);''')
        if 'body' not in {row[1] for row in conn.execute('pragma table_info(tasks)')}:
            conn.execute('alter table tasks add column body text')
        conn.execute('insert or ignore into tasks(id,status,assignee,title,consecutive_failures) values(?,?,?,?,?)', (targets[0], 'blocked', 'no-worker', 'Non-executing approval fixture', 0))
    packet = {'gate_id': release['workflow_id'] + ':plan:' + str(release['plan_version']), 'parent_task_id': targets[0],
              'source_commit': release['binding']['base_commit'], 'report_url': None}
    proof = {'event': {'decision': 'approve', 'event_id': release['decision_event']}, 'allowed_resume_targets': targets}
    result = apply_decision(database, packet, proof)
    with sqlite3.connect(database) as conn:
        rows = conn.execute("select payload from task_events where kind='human_approval_resumed' and task_id=?", (targets[0],)).fetchall()
        state = conn.execute('select status from tasks where id=?', (targets[0],)).fetchone()[0]
    if len(rows) != 1 or state != 'ready':
        raise ValueError('resume_readback_failed')
    return {**json.loads(rows[0][0]), 'fixture': True, 'execution_performed': False,
            'idempotent': result['idempotent'], 'readback_count': len(rows),
            'release_sha256': hashlib.sha256(json.dumps(release, sort_keys=True).encode()).hexdigest()}


if __name__ == '__main__':
    print(json.dumps(resume(json.load(sys.stdin))))
