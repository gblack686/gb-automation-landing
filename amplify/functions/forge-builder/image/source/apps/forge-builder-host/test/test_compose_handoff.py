import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('compose_handoff', Path(__file__).resolve().parents[1] / 'compose_handoff.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class HandoffEmailTest(unittest.TestCase):
    def test_message_uses_verified_repo_and_explains_both_downloads(self):
        receipt = {'schema_version': 'forge-repository-handoff.v1', 'state': 'created',
                   'repository': 'gbauto/gbautomation-artist-packet-expert',
                   'tenant_id': 'gbautomation', 'packet_id': 'b' * 64,
                   'agent_id': 'artist-packet-expert', 'url': 'https://github.com/gbauto/gbautomation-artist-packet-expert',
                   'commit': 'a' * 40, 'github_user':'forge-test', 'customer_access':'invited'}
        acceptance = {'schema_version':'forge-hosted-acceptance.v1', 'status':'verified',
                      'tenant_id':receipt['tenant_id'], 'agent_id':receipt['agent_id'],
                      'packet_id':receipt['packet_id'], 'repository':receipt['repository'],
                      'commit':receipt['commit'], 'portal_url':'https://gbautomation.xyz/atlas/artist-packet-expert',
                      'login':'verified', 'repo_access':'verified', 'packet_download':'verified',
                      'registry_source':'s3', 'registered_agents':['artist-packet-expert'],
                      'windows':{name:'live_verified' for name in module.WINDOWS}, 'deployed_task':'verified'}
        message = module.compose(receipt, 'greg+forge-test@gbautomation.xyz', acceptance)
        body = message.get_content()
        self.assertIn('Code, then Download ZIP', body)
        self.assertIn('Registered agents dropdown', body)
        self.assertIn('https://gbautomation.xyz/atlas/artist-packet-expert', body)
        receipt['state'] = 'prepared'
        with self.assertRaisesRegex(ValueError, 'verified_repository_required'):
            module.compose(receipt, 'greg+forge-test@gbautomation.xyz', acceptance)
        receipt['state'] = 'created'
        acceptance['registry_source'] = 'baseline'
        with self.assertRaisesRegex(ValueError, 'hosted_registry_readback_required'):
            module.compose(receipt, 'greg+forge-test@gbautomation.xyz', acceptance)
        acceptance['registry_source'] = 's3'
        del acceptance['windows']['chat']
        with self.assertRaisesRegex(ValueError, 'live_windows_readback_required'):
            module.compose(receipt, 'greg+forge-test@gbautomation.xyz', acceptance)


if __name__ == '__main__':
    unittest.main()
