"""Launch the loopback Config Builder with optional server-only ElevenLabs auth."""
import argparse
import json
import os
from pathlib import Path
import subprocess

from setup_voice import read_key

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--profile', type=Path, required=True)
    parser.add_argument('--visuals', type=Path)
    parser.add_argument('--data', type=Path, required=True)
    parser.add_argument('--port', type=int, default=4188)
    parser.add_argument('--voice-env', type=Path)
    parser.add_argument('--voice-setup', type=Path)
    args = parser.parse_args()
    env = {**os.environ, 'FORGE_BUILDER_PROFILE': str(args.profile.resolve()),
           'FORGE_PILOT_DATA_ROOT': str(args.data.resolve()), 'FORGE_PILOT_PORT': str(args.port),
           'FORGE_VOICE_ENABLED': 'false'}
    if args.visuals:
        env['FORGE_BUILDER_VISUALS'] = str(args.visuals.resolve())
    if args.voice_env:
        if not args.voice_setup:
            parser.error('--voice-setup readback receipt is required with --voice-env')
        setup = json.loads(args.voice_setup.read_text())
        if setup.get('status') != 'provider_readback_pass':
            parser.error('voice setup has not passed readback')
        env.update(ELEVENLABS_API_KEY=read_key(args.voice_env),
                   FORGE_ELEVENLABS_TOOL_ID=setup['tool_id'],
                   FORGE_ELEVENLABS_AGENT_ID=setup['agent_id'], FORGE_VOICE_ENABLED='true')
    subprocess.run(['node', 'apps/forge-approval-pilot/build-voice.mjs'], cwd=ROOT, check=True)
    subprocess.run(['node', 'apps/forge-approval-pilot/server.mjs'], cwd=ROOT, env=env, check=True)


if __name__ == '__main__':
    main()
