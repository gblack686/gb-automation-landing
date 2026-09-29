import importlib.util
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('provision_repository', Path(__file__).resolve().parents[1] / 'provision_repository.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
prepare, select_files = module.prepare, module.select_files


class RepositoryHandoffTest(unittest.TestCase):
    def packet(self, root: Path) -> Path:
        packet = root / 'packet'
        packet.mkdir()
        files = {
            'experts/gbautomation/artist-packet-expert/expertise.md': b'approved source\n',
            'agent-expert-config.json': b'{}\n',
            'intake.json': b'{"private":"customer"}\n',
            'approval-release.json': b'{"private":"operator"}\n',
        }
        rows = []
        for name, data in files.items():
            path = packet / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            rows.append({'path': name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
        manifest = {'packet_id': 'a' * 64, 'runtime_authorized': False, 'intake_version': 2,
                    'approval_evidence': 'local_pilot_only',
                    'binding': {'tenant_id': 'gbautomation', 'agent_id': 'artist-packet-expert'}, 'files': rows}
        (packet / 'packet-manifest.json').write_text(json.dumps(manifest))
        return packet

    def test_private_operator_and_intake_files_never_enter_repo(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            packet = self.packet(root)
            record = prepare(packet, root / 'repo')
            self.assertEqual(record['state'], 'prepared')
            self.assertEqual(record['repository'], 'gbauto/gbautomation-artist-packet-expert')
            self.assertFalse((root / 'repo/intake.json').exists())
            self.assertFalse((root / 'repo/approval-release.json').exists())
            self.assertTrue((root / 'repo/experts/gbautomation/artist-packet-expert/expertise.md').exists())
            self.assertIn('Download ZIP', (root / 'repo/README.md').read_text())
            with self.assertRaisesRegex(ValueError, 'hosted_approval_evidence_required'):
                module.require_hosted_approval(record, 'a' * 64, 2)
            with self.assertRaisesRegex(ValueError, 'approved_packet_binding_mismatch'):
                module.require_hosted_approval(record, 'a' * 64, 3)
            (packet / 'intake.json').write_text('changed')
            with self.assertRaisesRegex(ValueError, 'packet_hash_mismatch'):
                select_files(packet)


if __name__ == '__main__':
    unittest.main()
