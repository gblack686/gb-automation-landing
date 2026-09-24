"""Opt-in release canary. Creates one temporary Cognito user without sending email."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import uuid

import boto3
from playwright.sync_api import sync_playwright, expect


def run(args):
    outputs = json.loads(args.outputs.read_text(encoding='utf-8-sig'))
    auth, data = outputs['auth'], outputs['data']
    cognito = boto3.client('cognito-idp', region_name=auth['aws_region'])
    pool = auth['user_pool_id']
    group = 'tenant-gbautomation'
    cognito.get_group(UserPoolId=pool, GroupName=group)
    email = f'forge-atlas-canary-{uuid.uuid4().hex}@example.invalid'
    password = secrets.token_urlsafe(32) + 'aA1!'
    username = None
    receipt = {'ok': False, 'base': args.base, 'stage': 'create_user', 'checks': []}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    try:
        user = cognito.admin_create_user(
            UserPoolId=pool, Username=email, MessageAction='SUPPRESS',
            UserAttributes=[{'Name': 'email', 'Value': email}, {'Name': 'email_verified', 'Value': 'true'}])
        username = user['User']['Username']
        receipt['temporary_user'] = username
        cognito.admin_set_user_password(UserPoolId=pool, Username=username, Password=password, Permanent=True)
        with sync_playwright() as p:
            executable = os.environ.get('PLAYWRIGHT_EXECUTABLE')
            browser = p.chromium.launch(**({'executable_path': executable} if executable else {'channel': args.channel}))
            try:
                def login(context):
                    page = context.new_page()
                    page.set_default_timeout(45000)
                    page.goto(args.base + '/atlas/artist-packet-expert')
                    page.locator('input[name="username"]').fill(email)
                    page.locator('input[name="password"]').fill(password)
                    page.get_by_role('button', name='Sign in', exact=True).click()
                    page.wait_for_url('**/atlas/artist-packet-expert')
                    return page

                def read(page, request):
                    return page.evaluate('''async ({endpoint,client,request}) => {
                      const prefix='CognitoIdentityServiceProvider.'+client+'.';
                      const user=localStorage.getItem(prefix+'LastAuthUser');
                      const token=localStorage.getItem(prefix+user+'.idToken');
                      if(!token)throw Error('No signed-in token');
                      const response=await fetch(endpoint,{method:'POST',headers:{Authorization:token,'Content-Type':'application/json'},
                        body:JSON.stringify({query:'query Atlas($input: AWSJSON!){forgeAtlasRead(input:$input){payload}}',variables:{input:JSON.stringify(request)}})});
                      const value=await response.json();
                      if(value.errors?.length) return {graphql_error:true};
                      const payload=value.data?.forgeAtlasRead?.payload;
                      return typeof payload==='string'?JSON.parse(payload):payload;
                    }''', {'endpoint': data['url'], 'client': auth['user_pool_client_id'], 'request': request})

                receipt['stage'] = 'tenant_denial'
                foreign = browser.new_context()
                page = login(foreign)
                expect(page.get_by_text('Tenant access required', exact=True)).to_be_visible()
                denied = read(page, {'view': 'document'})
                if isinstance(denied, dict) and denied.get('error') in ('authentication_required', 'tenant_access_required', 'invalid_request', 'atlas_unavailable'):
                    receipt['nonmember_error'] = denied['error']
                assert denied == {'ok': False, 'error': 'tenant_access_required'}
                receipt['checks'].append('Real Cognito sign-in without tenant membership is denied by UI and API')
                foreign.close()

                receipt['stage'] = 'owned_document'
                cognito.admin_add_user_to_group(UserPoolId=pool, Username=username, GroupName=group)
                owned = browser.new_context(viewport={'width': 1500, 'height': 1000})
                page = login(owned)
                errors = []
                page.on('pageerror', lambda error: errors.append(type(error).__name__))
                frame = page.frame_locator('iframe[title="Artist Packet Expert Atlas"]')
                expect(frame.locator('.nav-window[data-nav="proposals"]')).to_be_visible(timeout=60000)
                doc = read(page, {'view': 'document'})
                assert doc['ok'] and doc['data']['tenant_id'] == 'gbautomation'
                response = owned.request.get(doc['data']['url'])
                assert response.ok
                assert hashlib.sha256(response.body()).hexdigest() == doc['data']['sha256']
                receipt['document_sha256'] = doc['data']['sha256']
                assert owned.request.get(doc['data']['url'].split('?')[0]).status == 403
                receipt['checks'].append('Tenant member opens the real private document; hash matches and unsigned S3 returns 403')

                receipt['stage'] = 'supabase_reads'
                snapshots = {}
                for view, query in [('history', {'view': 'sessions'}), ('atlas', {}), ('planning', {})]:
                    value = read(page, {'view': view, 'query': query})
                    assert value['ok'], f'{view} unavailable'
                    assert value['data']['source'] == 'supabase'
                    snapshots[view] = value['data']
                assert read(page, {'view': 'document', 'tenant': 'other'})['ok'] is False
                frame.locator('.nav-window[data-nav="chat"]').click()
                expect(frame.locator('[data-status="history"]')).to_contain_text('Supabase')
                proposal_page = read(page, {'view': 'proposals', 'query': {}})
                def expert_scope(value):
                    return value.get('tenant_id') == 'gbautomation' and value.get('agent_id') == 'artist-packet-expert'
                assert proposal_page['ok'] and expert_scope(proposal_page['data'])
                assert all(expert_scope(row) for row in proposal_page['data']['rows'])
                frame.locator('.nav-window[data-nav="proposals"]').click()
                expect(frame.locator('[data-status="proposals"]')).to_contain_text('Supabase')
                if proposal_page['data']['rows']:
                    first = proposal_page['data']['rows'][0]
                    detail = read(page, {'view': 'proposal', 'query': {'proposal_id': first['proposal_id']}})
                    assert detail['ok'] and expert_scope(detail['data']) and detail['data']['proposal_id'] == first['proposal_id']
                    frame.locator('[data-action="proposal-open"]').first.click()
                    expect(frame.locator('[data-status="proposal"]')).to_contain_text('Supabase')
                    expect(frame.get_by_role('button', name='Accept proposal', exact=True)).to_be_disabled()
                    search = first['card_title'][:120]
                else:
                    assert proposal_page['data']['total'] == 0
                    expect(frame.locator('.cards')).to_contain_text('No proposals for this expert')
                    expect(frame.locator('[data-action="proposal-next"]')).to_be_disabled()
                    search = 'scope'
                filtered = read(page, {'view': 'proposals', 'query': {'search': search, 'state': 'gated'}})
                assert filtered['ok'] and expert_scope(filtered['data'])
                assert filtered['data']['total'] <= proposal_page['data']['total']
                assert all(expert_scope(row) for row in filtered['data']['rows'])
                for proposal_id in args.excluded_proposal:
                    excluded = read(page, {'view': 'proposal', 'query': {'proposal_id': proposal_id}})
                    assert excluded['ok'] and excluded['data'] is None
                receipt['excluded_proposals_checked'] = len(args.excluded_proposal)
                assert read(page, {'view': 'proposals', 'query': {'agent_id': 'other-expert'}})['ok'] is False
                frame.locator('input[name="search"]').fill(search)
                frame.locator('#proposal-search button').click()
                expect(frame.locator('[data-status="proposals"]')).to_contain_text('Supabase')
                snapshot = read(page, {'view': 'approvalSnapshot'})
                assert snapshot['ok']
                assert all(snapshot['data']['connection'][flag] is False for flag in ['writes_enabled','email_enabled','execution_enabled'])
                receipt['checks'].append('Real expert-scoped proposal list and search load; excluded detail IDs return null; decisions, email and execution remain disabled')
                assert not errors
                receipt['counts'] = {'sessions': len(snapshots['history']['rows']),
                    'expert_proposals': proposal_page['data']['total'],
                    'prds': len(snapshots['planning']['prds']), 'cards': len(snapshots['planning']['cards']),
                    **{name: len(rows) for name, rows in snapshots['atlas']['datasets'].items() if name != 'sessions'}}
                receipt['checks'].append('Live scoped Supabase projections load and the Sessions window renders them')
                receipt['capture_verified'] = False
                receipt['ok'] = True
                receipt['stage'] = 'complete'
                args.output.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
                owned.close()
            finally:
                # Remove the canary before browser teardown, which can hang on Windows.
                if username:
                    cognito.admin_delete_user(UserPoolId=pool, Username=username)
                    try:
                        cognito.admin_get_user(UserPoolId=pool, Username=username)
                        raise RuntimeError('Canary account still exists')
                    except cognito.exceptions.UserNotFoundException:
                        receipt['temporary_user_deleted'] = True
                        username = None
                    args.output.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
                browser.close()
    finally:
        try:
            if username:
                receipt['temporary_user_deleted'] = False
                cognito.admin_delete_user(UserPoolId=pool, Username=username)
                try:
                    cognito.admin_get_user(UserPoolId=pool, Username=username)
                    raise RuntimeError('Canary account still exists')
                except cognito.exceptions.UserNotFoundException:
                    receipt['temporary_user_deleted'] = True
        finally:
            if username and not receipt['temporary_user_deleted']:
                receipt['ok'] = False
            args.output.write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    return receipt


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--outputs', required=True, type=Path)
    parser.add_argument('--base', default='https://gbautomation.xyz', choices=['https://gbautomation.xyz', 'https://master.d1qefy5a1kauhs.amplifyapp.com'])
    parser.add_argument('--output', type=Path, default=Path('artifacts/forge-atlas-validation/live.json'))
    parser.add_argument('--channel', default='chrome')
    parser.add_argument('--create-test-user', required=True, action='store_true')
    parser.add_argument('--excluded-proposal', required=True, action='append', help='Verified existing proposal ID outside the selected expert; repeat for unassigned records')
    args = parser.parse_args()
    try:
        print(json.dumps(run(args)))
    except Exception as error:
        # Assertion/browser details may contain document text. Keep them local and redacted.
        print(json.dumps({'ok': False, 'error_type': type(error).__name__, 'receipt': str(args.output)}))
        raise SystemExit(1)
