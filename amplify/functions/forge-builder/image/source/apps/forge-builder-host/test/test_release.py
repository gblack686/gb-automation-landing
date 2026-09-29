import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('release', Path(__file__).resolve().parents[1] / 'release_bootstrap.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseTests(unittest.TestCase):
    def test_ref_must_be_current_canonical_head(self):
        with patch.object(release, 'github', return_value={'sha': 'b' * 40}):
            with self.assertRaisesRegex(ValueError, 'source_not_canonical_head'):
                release.check_release('repo', 'main', 'a' * 40, {'validate'})

    def test_latest_failed_attempt_cannot_be_replaced_by_older_success(self):
        checks = [{'check_runs': [{'name': 'validate', 'id': 1, 'status': 'completed', 'conclusion': 'success'},
                                  {'name': 'validate', 'id': 2, 'status': 'completed', 'conclusion': 'failure'}]}]
        with patch.object(release, 'github', return_value={'sha': 'a' * 40}), patch.object(release.subprocess, 'check_output', return_value=json.dumps(checks)):
            with self.assertRaisesRegex(ValueError, 'normal_release_checks_not_green'):
                release.check_release('repo', 'main', 'a' * 40, {'validate'})

    def test_missing_check_blocks_release(self):
        with patch.object(release, 'github', return_value={'sha': 'a' * 40}), patch.object(release.subprocess, 'check_output', return_value='[{"check_runs":[]}]'):
            with self.assertRaisesRegex(ValueError, 'normal_release_checks_not_green'):
                release.check_release('repo', 'main', 'a' * 40, {'validate'})


if __name__ == '__main__':
    unittest.main()
