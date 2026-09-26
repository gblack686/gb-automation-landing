"""Read a bounded, exact-agent Supabase snapshot for the Forge Bokeh window.

Uses the CLI/identity pattern from workshop windows (PR 1218) and the scatter
encoding from Atlas (PR 1160). No database mutation or browser credentials.
"""
from __future__ import annotations

import datetime as dt
import json
import math
from pathlib import Path
import re
import subprocess
import sys

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[4]
SCHEMA = Path(__file__).resolve().parent.parent / 'templates/forge-atlas-snapshot.schema.json'
LIMIT = 200
DAYS = 90
DATASETS = ('traces', 'runs', 'sessions')


def agent_key(value: str) -> str:
    if not re.fullmatch(r'[a-z0-9][a-z0-9_-]{0,119}', value):
        raise ValueError('Atlas requires a safe, exact agent ID')
    return value


def query_sql(agent_id: str, dataset: str) -> str:
    """Only three fixed projections; never fall back to an unscoped query."""
    key = agent_key(agent_id)
    if dataset == 'traces':
        projection = ('trace_timestamp as observed_at, total_tokens as tokens, '
                      'total_cost as cost, latency_sec as duration, null::integer as events')
        table, timestamp = 'langfuse_traces', 'trace_timestamp'
        predicate = (f"(profile = '{key}' or agent = '{key}' or "
                     f"tags && array['expert:{key}', 'profile:{key}']::text[])")
        tie = 'trace_id'
    elif dataset == 'runs':
        projection = ('started_at as observed_at, null::integer as tokens, null::numeric as cost, '
                      'extract(epoch from (ended_at - started_at)) as duration, null::integer as events')
        table, timestamp, predicate, tie = 'agent_runs', 'started_at', f"profile = '{key}'", 'run_id'
    elif dataset == 'sessions':
        projection = ('started_at as observed_at, null::integer as tokens, null::numeric as cost, '
                      'extract(epoch from (ended_at - started_at)) as duration, tool_call_count as events')
        table, timestamp, predicate, tie = 'agent_sessions', 'started_at', f"profile = '{key}'", 'session_key'
    else:
        raise ValueError('Dataset is not allowed')
    return (f'select {projection} from public.{table} where {predicate} '
            f"and {timestamp} >= now() - interval '{DAYS} days' "
            f'order by {timestamp} desc, {tie} desc limit {LIMIT}')


def cli_query(sql: str) -> list[dict]:
    try:
        result = subprocess.run(['gbauto-supabase', '--json', 'query', '--mode', 'pooler-session',
                                 sql, '--limit', str(LIMIT)], capture_output=True, text=True,
                                encoding='utf-8', timeout=40, check=True)
        rows = json.loads(result.stdout)
        if not isinstance(rows, list):
            raise ValueError('Unexpected database response')
        return rows
    except (OSError, subprocess.SubprocessError, ValueError):
        # Do not return raw CLI errors, connection strings, SQL or environment.
        raise RuntimeError('Supabase read unavailable; saved snapshot retained') from None


def capture(agent_id: str, query=cli_query) -> dict:
    agent_key(agent_id)
    datasets = {}
    for dataset in DATASETS:
        rows = []
        for index, raw in enumerate(query(query_sql(agent_id, dataset))[:LIMIT]):
            timestamp = dt.datetime.fromisoformat(str(raw['observed_at']).replace('Z', '+00:00'))
            if timestamp.tzinfo is None:
                raise ValueError('Atlas timestamps require a timezone')
            row = {'row_key': f'{dataset}-{index + 1}', 'observed_at': timestamp.isoformat()}
            for field in ('tokens', 'cost', 'duration', 'events'):
                value = raw.get(field)
                value = float(value) if value is not None else None
                row[field] = value if value is not None and math.isfinite(value) and value >= 0 else None
            rows.append(row)
        datasets[dataset] = rows
    result = {'schema_version': 'forge-atlas-snapshot.v1', 'source': 'supabase',
              'agent_id': agent_id, 'captured_at': dt.datetime.now(dt.timezone.utc).isoformat(),
              'days': DAYS, 'limit_per_dataset': LIMIT, 'datasets': datasets}
    validate_snapshot(result, agent_id)
    return result


def validate_snapshot(value: dict, agent_id: str) -> None:
    schema = json.loads(SCHEMA.read_text(encoding='utf-8'))
    errors = list(Draft202012Validator(schema, format_checker=FormatChecker()).iter_errors(value))
    if errors or value.get('agent_id') != agent_id:
        raise ValueError('Atlas snapshot is invalid or belongs to a different agent')
    for rows in value['datasets'].values():
        for row in rows:
            if any(row[key] is not None and not math.isfinite(row[key]) for key in ('tokens', 'cost', 'duration', 'events')):
                raise ValueError('Atlas snapshot contains a non-finite metric')


def read_snapshot(profile: dict, asset_root: Path) -> dict | None:
    name = profile.get('atlas_snapshot_path')
    if not name:
        return None
    root = asset_root.resolve()
    path = (root / name).resolve()
    if not path.is_relative_to(root) or not path.is_file() or path.stat().st_size > 500_000:
        raise ValueError('Atlas snapshot must be a bounded JSON file inside the profile directory')
    result = json.loads(path.read_text(encoding='utf-8'))
    validate_snapshot(result, profile['config']['agent_id'])
    return result


def chart_bundle() -> tuple[str, dict]:
    """Offline Bokeh core, one source, safe hover, pan/zoom/select/reset/save."""
    from bokeh.embed import json_item
    from bokeh.models import ColumnDataSource, HoverTool, LinearAxis, DatetimeAxis
    from bokeh.plotting import figure
    from bokeh.resources import Resources

    source = ColumnDataSource({key: [] for key in ('x', 'y', 'row_key', 'marker_size', 'size_value', 'color_value', 'alpha_value')}, name='forge-atlas-source')
    chart = figure(name='forge-atlas-plot', width=800, height=500,
                   sizing_mode='fixed', aspect_ratio=1.6,
                   tools='pan,wheel_zoom,box_zoom,tap,box_select,reset,save',
                   toolbar_location='above', x_axis_type=None, y_axis_label='Tokens',
                   min_border_left=52, min_border_bottom=45)
    chart.add_layout(DatetimeAxis(name='forge-atlas-date-axis', axis_label='Recorded at'), 'below')
    chart.add_layout(LinearAxis(name='forge-atlas-number-axis', visible=False), 'below')
    glyph = chart.scatter(x='x', y='y', size='marker_size', source=source, marker='circle', color='color_value',
                          fill_alpha='alpha_value', line_alpha='alpha_value', nonselection_alpha=.18)
    chart.add_tools(HoverTool(renderers=[glyph], tooltips=[('Record', '@row_key'), ('Y', '@y{0,0.000}'),
                                                        ('Bubble value', '@size_value{0,0.000}')]))
    chart.toolbar.logo = None
    return Resources(mode='inline', components=['bokeh']).render_js(), json_item(chart, 'atlas-plot')


def main() -> int:
    import argparse
    sys.path.insert(0, str(ROOT))
    from resources.lib.tracing import trace_agent

    @trace_agent('lead_magnet.forge_atlas_capture', metadata={'mode': 'read_only'})
    def run():
        parser = argparse.ArgumentParser(description=__doc__)
        parser.add_argument('--agent-id', required=True)
        parser.add_argument('--out', type=Path, required=True)
        args = parser.parse_args()
        snapshot = capture(args.agent_id)
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(snapshot, indent=2) + '\n', encoding='utf-8')
        print(json.dumps({'agent_id': snapshot['agent_id'], 'captured_at': snapshot['captured_at'],
                          'rows': {k: len(v) for k, v in snapshot['datasets'].items()}}))
        return 0
    return run()


if __name__ == '__main__':
    raise SystemExit(main())
