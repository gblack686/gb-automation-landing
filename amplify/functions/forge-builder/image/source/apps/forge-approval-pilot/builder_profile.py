"""Resolve a trusted profile into its canonical Forge identity binding."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'resources/skills/hermes-prospect-agent-team-lead-magnet/scripts'))
from forge_planning import scope_for
from render_expert_profile import validate_profile

if __name__ == '__main__':
    profile = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8-sig'))
    validate_profile(profile)
    print(json.dumps({'scope': scope_for(profile)}))
