import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

APP = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP))
spec = importlib.util.spec_from_file_location('send_handoff', APP / 'send_handoff.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SendHandoffTest(unittest.TestCase):
    def fixture(self):
        email = 'customer@example.test'
        receipt = {'schema_version': 'forge-repository-handoff.v1', 'state': 'created',
                   'tenant_id': 'gbautomation', 'agent_id': 'artist-packet-expert',
                   'packet_id': 'b' * 64, 'repository': 'gbauto/gbautomation-artist-packet-expert',
                   'url': 'https://github.com/gbauto/gbautomation-artist-packet-expert',
                   'commit': 'a' * 40, 'github_user': 'forge-test', 'customer_access': 'invited'}
        acceptance = {'schema_version': 'forge-hosted-acceptance.v1', 'status': 'verified',
                      **{name: receipt[name] for name in ('tenant_id', 'agent_id', 'packet_id', 'repository', 'commit', 'github_user')},
                      'recipient_email': email, 'portal_url': 'https://gbautomation.xyz/atlas/artist-packet-expert',
                      'login': 'verified', 'repo_access': 'verified', 'packet_download': 'verified',
                      'registry_source': 's3', 'registered_agents': ['artist-packet-expert'],
                      'windows': {name: 'live_verified' for name in module.compose.__globals__['WINDOWS']},
                      'deployed_task': 'verified'}
        return receipt, acceptance, email

    def test_dry_run_and_verified_send_are_bound_and_single_use(self):
        receipt, acceptance, email = self.fixture()
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / 'send.json'
            prepared = module.send(receipt, acceptance, email, output)
            self.assertEqual(prepared['state'], 'prepared')
            self.assertFalse(output.exists())

            def fake_gws(args):
                if args[0] == 'getProfile':
                    return {'emailAddress': 'greg@gbautomation.xyz'}
                if args[:2] == ['messages', 'send']:
                    return {'id': 'provider-id'}
                self.assertEqual(json.loads(args[3])['id'], 'provider-id')
                return {'payload': {'headers': [
                    {'name': 'From', 'value': 'greg@gbautomation.xyz'},
                    {'name': 'To', 'value': email},
                    {'name': 'Message-ID', 'value': prepared['message_id']}]}}

            with patch.object(module, 'gws', side_effect=fake_gws):
                sent = module.send(receipt, acceptance, email, output, apply=True)
            self.assertEqual(sent['state'], 'sent_verified')
            self.assertEqual(json.loads(output.read_text())['provider_id'], 'provider-id')
            with self.assertRaisesRegex(RuntimeError, 'existing_send_receipt_review_required'):
                module.send(receipt, acceptance, email, output, apply=True)
            with self.assertRaisesRegex(ValueError, 'customer_handoff_binding_mismatch'):
                module.send(receipt, acceptance, 'other@example.test', output)


if __name__ == '__main__':
    unittest.main()
