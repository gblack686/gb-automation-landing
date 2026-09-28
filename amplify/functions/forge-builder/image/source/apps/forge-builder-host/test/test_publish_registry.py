import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('publish_registry', Path(__file__).resolve().parents[1] / 'publish_registry.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RegistryTest(unittest.TestCase):
    def test_preserves_other_agents_and_requires_explicit_activation(self):
        sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
        first = {'tenant_id':'gbautomation','agent_id':'artist-packet-expert','display_name':'Artist Packet Expert',
                 'config_sha256':'a'*64,'subjects':[sub],'status':'pending','packet_id':'b'*64,
                 'repository':'gbauto/gbautomation-artist-packet-expert'}
        other = {**first, 'agent_id':'music-release-expert', 'display_name':'Music Release Expert',
                 'repository':'gbauto/gbautomation-music-release-expert', 'packet_id':'c'*64}
        start = {'schema_version':'forge-agent-registry.v1','tenant_id':'gbautomation','agents':[]}
        both = module.merge(module.merge(start, first), other)
        self.assertEqual([row['agent_id'] for row in both['agents']], ['artist-packet-expert','music-release-expert'])
        active = module.merge(both, {**first, 'status':'active'})
        self.assertEqual(active['agents'][0]['status'], 'active')
        self.assertEqual(active['agents'][1]['status'], 'pending')
        with self.assertRaisesRegex(ValueError, 'existing_registration_review_required'):
            module.merge(active, {**first, 'subjects':['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']})


if __name__ == '__main__':
    unittest.main()
