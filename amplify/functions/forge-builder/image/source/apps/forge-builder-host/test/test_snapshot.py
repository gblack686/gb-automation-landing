import importlib.util
import io
from pathlib import Path
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('snapshot', Path(__file__).resolve().parents[1] / 'snapshot.py')
snapshot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(snapshot)


class SnapshotTests(unittest.TestCase):
    def test_roundtrip_excludes_packets_and_preserves_signing_key(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d) / 'data'
            for name in ['postgres/db', 'signing-key', 'builder/.forge-builder', 'builder/packets/secret']:
                p = root / name
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text(name)
            (root / 'postgres/pg_tblspc').mkdir()
            archive, restored = Path(d) / 'state.tgz', Path(d) / 'restored'
            snapshot.pack(root, archive)
            snapshot.restore(restored, archive)
            self.assertEqual((restored / 'signing-key').read_text(), 'signing-key')
            self.assertFalse((restored / 'builder/packets').exists())
            self.assertTrue((restored / 'postgres/pg_tblspc').is_dir())

    def test_malicious_members_are_rejected_before_extracting_any_file(self):
        cases = [(['../secret'], False), (['/etc/passwd'], False), (['postgres/../secret'], False),
                 (['postgres\\secret'], False), (['postgres/x', 'postgres/x'], False),
                 (['postgres/x', 'postgres/./x'], False), (['postgres/x', 'postgres/X'], False),
                 (['postgres//x'], False), (['builder/packets/x'], False), (['mail/link'], True)]
        for names, symlink in cases:
            with self.subTest(names=names), tempfile.TemporaryDirectory() as d:
                archive, root = Path(d) / 'malicious.tgz', Path(d) / 'out'
                with tarfile.open(archive, 'w:gz') as tar:
                    for name in ['mail/valid', *names]:
                        info = tarfile.TarInfo(name)
                        info.size = 1
                        if symlink and name == names[-1]:
                            info.type, info.linkname, info.size = tarfile.SYMTYPE, '/etc/passwd', 0
                        tar.addfile(info, io.BytesIO(b'x'))
                with self.assertRaises(ValueError):
                    snapshot.restore(root, archive)
                self.assertFalse((root / 'mail/valid').exists())


if __name__ == '__main__':
    unittest.main()
