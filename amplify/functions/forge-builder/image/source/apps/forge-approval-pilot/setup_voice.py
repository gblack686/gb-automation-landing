"""Prepare or apply the bounded Forge seam to the EXISTING ElevenLabs agent.

No conversation is started. The default prompt, voice and historical recordings
are preserved. The intake tool is attached alongside existing tools, as required
by provider session overrides. Pauses never end a call. The bounded pilot duration
is separate from the human's decision to finish. New sessions keep no audio.
Secrets stay in process memory; receipts contain setting names and provider IDs.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import re
import urllib.request

AGENT = 'agent_7801k999ndjreah8914cn4pfy1mq'
FIELDS = ['problem', 'audience', 'data_access', 'output', 'success']
TOOL = {'type': 'client', 'name': 'capture_intake',
        'description': 'Capture explicit facts, corrections, uncertainty or skips into the five-area Forge brief. Only use this tool when the session prompt asks for Forge intake.',
        'expects_response': True, 'response_timeout_secs': 20,
        'parameters': {'type': 'object', 'required': ['answers'], 'properties': {
            'answers': {'type': 'array', 'description': 'One or more explicitly supplied areas from the current user utterance.', 'items': {
                'type': 'object', 'required': ['field', 'value', 'status', 'evidence'], 'properties': {
                    'field': {'type': 'string', 'enum': FIELDS, 'description': 'Canonical intake area.'},
                    'value': {'type': 'string', 'description': 'Brief factual summary, or empty for unknown.'},
                    'status': {'type': 'string', 'enum': ['captured', 'needs_clarification', 'skipped'], 'description': 'Unknown or skipped is never captured.'},
                    'evidence': {'type': 'string', 'description': 'Verbatim excerpt of the current user utterance supporting this change.'}
                }}}}}}
PATCH = {'conversation_config': {'conversation': {'max_duration_seconds': 300},
                                  'turn': {'silence_end_call_timeout': -1}},
         'platform_settings': {'privacy': {'record_voice': False, 'retention_days': 0,
                                           'apply_to_existing_conversations': False},
                               'overrides': {'conversation_config_override': {
                                   'agent': {'first_message': True, 'prompt': {'prompt': True, 'tool_ids': True}},
                                   'conversation': {'text_only': True}}}}}


def read_key(path):
    text = Path(path).read_text(encoding='utf-8-sig')
    match = re.search(r'^\s*ELEVENLABS_API_KEY\s*=\s*(.*?)\s*$', text, re.M)
    if not match:
        raise ValueError('ELEVENLABS_API_KEY is missing from the selected file')
    return match[1].strip().strip('"\'')


def call(key, path, body=None, method=None):
    request = urllib.request.Request('https://api.elevenlabs.io/v1/convai/' + path,
        data=None if body is None else json.dumps(body).encode(),
        headers={'xi-api-key': key, 'Content-Type': 'application/json'}, method=method)
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def contains_contract(actual, expected):
    """The API adds default metadata to schemas; compare every requested value."""
    if isinstance(expected, dict):
        return isinstance(actual, dict) and all(contains_contract(actual.get(k), v) for k, v in expected.items())
    return actual == expected


def run(args):
    key = read_key(args.env_file)
    before = call(key, 'agents/' + AGENT)
    patch = copy.deepcopy(PATCH)
    patch['conversation_config']['conversation']['client_events'] = list(dict.fromkeys(
        before['conversation_config']['conversation']['client_events'] + ['client_tool_call']))
    args.output.mkdir(parents=True, exist_ok=True)
    preview = {'agent_id': AGENT, 'agent_name': before['name'], 'patch': patch, 'client_tool': TOOL,
               'default_prompt_changed': False, 'intake_tool_attachment_required': True, 'existing_recordings_changed': False,
               'conversation_started': False, 'source': 'https://api.elevenlabs.io/openapi.json'}
    (args.output / 'voice-settings-proposal.json').write_text(json.dumps(preview, indent=2) + '\n')
    if not args.apply:
        print(json.dumps({'status': 'prepared', 'path': str(args.output / 'voice-settings-proposal.json')}))
        return
    tools = call(key, 'tools?page_size=100')
    if tools.get('has_more'):
        raise ValueError('tool_inventory_requires_pagination_review')
    matches = [t for t in tools.get('tools', []) if t.get('tool_config', {}).get('name') == 'capture_intake']
    if len(matches) > 1:
        raise ValueError('ambiguous_intake_tool')
    if matches:
        match = matches[0]
        if not contains_contract(match['tool_config'], TOOL):
            raise ValueError('existing_intake_tool_differs')
        tool_id = match['id']
    else:
        tool_id = call(key, 'tools', {'tool_config': TOOL}, 'POST')['id']
    old_ids = before['conversation_config']['agent']['prompt'].get('tool_ids', [])
    patch['conversation_config']['agent'] = {'prompt': {'tool_ids': list(dict.fromkeys(old_ids + [tool_id]))}}
    preview['default_tools_changed'] = tool_id not in old_ids
    # A sparse PATCH merges nested settings. Never replace the whole agent.
    after = call(key, 'agents/' + AGENT, patch, 'PATCH')
    after = call(key, 'agents/' + AGENT)
    old = before['conversation_config'];new = after['conversation_config']
    old_prompt, new_prompt = old['agent']['prompt'], new['agent']['prompt']
    core = lambda prompt: {k: v for k, v in prompt.items() if k not in ('tools', 'tool_ids')}
    # The API expands attached IDs into its returned tools array.
    if (core(old_prompt) != core(new_prompt) or old['tts'] != new['tts'] or
            new_prompt['tool_ids'] != patch['conversation_config']['agent']['prompt']['tool_ids'] or
            any(tool not in new_prompt.get('tools', []) for tool in old_prompt.get('tools', []))):
        raise ValueError('unexpected_default_prompt_or_voice_change')
    privacy = after['platform_settings']['privacy']
    if privacy['record_voice'] or privacy['retention_days'] != 0 or privacy['apply_to_existing_conversations']:
        raise ValueError('privacy_readback_failed')
    if (new['conversation']['max_duration_seconds'] != 300 or
            new.get('turn', {}).get('silence_end_call_timeout') != -1 or
            'client_tool_call' not in new['conversation']['client_events']):
        raise ValueError('conversation_readback_failed')
    receipt = {**preview, 'status': 'provider_readback_pass', 'tool_id': tool_id,
               'prompt_sha256': hashlib.sha256(json.dumps(new['agent']['prompt'], sort_keys=True).encode()).hexdigest(),
                'max_duration_seconds': new['conversation']['max_duration_seconds'],
                'silence_end_call_timeout': new['turn']['silence_end_call_timeout'],
               'privacy': privacy, 'overrides': after['platform_settings']['overrides']}
    (args.output / 'voice-setup-receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps({k: receipt[k] for k in ['status', 'agent_id', 'tool_id', 'conversation_started', 'default_prompt_changed', 'existing_recordings_changed']}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env-file', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--apply', action='store_true')
    try:
        run(parser.parse_args())
    except Exception as error:
        # Provider exceptions may include response/request detail. Do not print it.
        print(json.dumps({'status': 'failed', 'error_type': type(error).__name__}))
        raise SystemExit(1)
