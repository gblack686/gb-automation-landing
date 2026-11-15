"""Publish the preserved live artifact with only the reviewed AI resume replaced."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess
import zipfile

EXPECTED_ZIP = 'e2f13645432232d0cb4c4f6c29e26b8467bf44f0453ce6a6384492563186af08'
EXPECTED_RESUME = 'c43a028b73f4c94428b99c00771dfd76b0905eceddf107c87d10f36e2e811190'
SOURCE_COMMIT = '4e8ca091a33a897bc7d46b87a60ecebbee97dc88'
ARTIFACT = 's3://cdk-amplifygb-assets-274487662938-us-east-1/resume-releases/20261115/resume-deployment.zip'

package = Path('/tmp/verified-resume-release.zip')
subprocess.run(['aws', 's3', 'cp', ARTIFACT, str(package), '--region', 'us-east-1', '--only-show-errors'], check=True)
assert hashlib.sha256(package.read_bytes()).hexdigest() == EXPECTED_ZIP, 'Artifact digest mismatch'
output = Path('dist')
output.mkdir(exist_ok=True)
assert not any(output.iterdir()), 'Expected an empty release destination'
with zipfile.ZipFile(package) as archive:
    assert len(archive.namelist()) == 696
    for name in archive.namelist():
        path = PurePosixPath(name)
        assert not path.is_absolute() and '..' not in path.parts
    resume = archive.read('ai-resume.html')
    assert hashlib.sha256(resume).hexdigest() == EXPECTED_RESUME
    assert resume.replace(b'\r\n', b'\n') == Path('public/ai-resume.html').read_bytes().replace(b'\r\n', b'\n')
    archive.extractall(output)
print(json.dumps({'base_live_job': '197', 'resume_source_commit': SOURCE_COMMIT,
                  'changed_files': ['ai-resume.html'], 'preserved_files': 695,
                  'artifact_sha256': EXPECTED_ZIP, 'resume_sha256': EXPECTED_RESUME}))
