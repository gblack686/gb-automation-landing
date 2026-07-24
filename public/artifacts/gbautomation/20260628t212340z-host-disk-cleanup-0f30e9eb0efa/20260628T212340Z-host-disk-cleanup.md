---
type: host-maintenance
client: gbautomation
project: host-disk-cleanup
host: Gregs-Mac-mini.local
created_at: 20260628T212340Z
status: completed_uploaded
cloud_upload: uploaded_gcs_direct_user
---

# Host Disk Cleanup — 20260628T212340Z

## Request

ECOM reported host GB outside ECOM scope and escalated to main-ops.

## Initial GCS status

- : failed
- Reason: Google auth/ADC requires reauthentication
- Local Second Brain log created first; GCS upload will be retried after auth is fixed.

## Initial disk

```
Filesystem        Size    Used   Avail Capacity iused ifree %iused  Mounted on
/dev/disk3s1s1   228Gi    17Gi   9.3Gi    65%    455k   98M    0%   /
/dev/disk3s5     228Gi   167Gi   9.3Gi    95%    5.6M   98M    5%   /System/Volumes/Data
```

## Actions

### Pre-clean target sizes
```
5.6G	/opt/homebrew
3.7G	/Applications/iMovie.app
1.1G	/Applications/GarageBand.app
2.7G	/Applications/Google Chrome.app
839M	/Users/greg/Library/Caches
910M	/Users/jason-agent/.npm
965M	/Users/jason-agent/.bun
2.4G	/Users/jason-agent/repos
```

### Time Machine snapshots before
```
Snapshots for volume group containing disk /:
com.apple.os.update-5514FF97DEE9C60C7FBF462B06A418D5FC4A882D5AF41D2BAF0A1419FB9B9F86
com.apple.os.update-B637DF12758CF0EBDDADA12002339AEF42145C281A27CEDFF36CE4491383767655DCCFD40DA43D421B94991CB1D275A5
com.apple.os.update-MSUPrepareUpdate
```
### Homebrew cleanup
```
Sun Jun 28 21:25:15 UTC 2026
$ brew autoremove
✔︎ JSON API formula_tap_migrations.jws.json
✔︎ JSON API cask_tap_migrations.jws.json
✔︎ JSON API cask.jws.json
✔︎ JSON API formula.jws.json
$ brew cleanup -s --prune=all
Warning: Skipping aom: most recent version 3.14.1 not installed
Warning: Skipping awscli: most recent version 2.35.11 not installed
Warning: Skipping bitwarden-cli: most recent version 2026.6.0 not installed
Warning: Skipping oven-sh/bun/bun: most recent version 1.3.14 not installed
Warning: Skipping caddy: most recent version 2.11.4 not installed
Warning: Skipping certifi: most recent version 2026.6.17 not installed
Warning: Skipping cloudflared: most recent version 2026.6.1 not installed
Warning: Skipping colima: most recent version 0.10.3 not installed
Warning: Skipping deno: most recent version 2.9.0 not installed
Warning: Skipping docker: most recent version 29.6.1 not installed
Warning: Skipping docker-completion: most recent version 29.6.1 not installed
Warning: Skipping docker-compose: most recent version 5.2.0 not installed
Warning: Skipping ffmpeg: most recent version 8.1.2 not installed
Warning: Skipping fmt: most recent version 12.2.0 not installed
Warning: Skipping fontconfig: most recent version 2.18.1 not installed
Warning: Skipping fswatch: most recent version 1.21.0 not installed
Warning: Skipping ggml: most recent version 0.15.3 not installed
Warning: Skipping gh: most recent version 2.95.0 not installed
Warning: Skipping glib: most recent version 2.88.2 not installed
Warning: Skipping graphite2: most recent version 1.3.15 not installed
Warning: Skipping harfbuzz: most recent version 14.2.1 not installed
Warning: Skipping json-c: most recent version 0.19 not installed
Warning: Skipping just: most recent version 1.54.0 not installed
Warning: Skipping libavif: most recent version 1.4.2 not installed
Warning: Skipping libnghttp3: most recent version 1.17.0 not installed
Warning: Skipping libngtcp2: most recent version 1.24.0 not installed
Warning: Skipping libomp: most recent version 22.1.8 not installed
Warning: Skipping libvmaf: most recent version 3.2.0 not installed
Warning: Skipping lima: most recent version 2.1.3 not installed
Warning: Skipping llhttp: most recent version 9.4.2 not installed
Warning: Skipping node: most recent version 26.4.0 not installed
Warning: Skipping node@22: most recent version 22.23.1 not installed
Warning: Skipping pandoc: most recent version 3.10 not installed
Warning: Skipping pango: most recent version 1.58.0 not installed
Warning: Skipping python@3.11: most recent version 3.11.15_3 not installed
Warning: Skipping python@3.14: most recent version 3.14.6 not installed
Warning: Skipping sdl2-compat: most recent version 2.32.70 not installed
Warning: Skipping sqlite: most recent version 3.53.3 not installed
Warning: Skipping tmux: most recent version 3.7 not installed
Warning: Skipping uv: most recent version 0.11.25 not installed
Warning: Skipping weasyprint: most recent version 69.0 not installed
Warning: Skipping whisper-cpp: most recent version 1.9.1 not installed
Warning: Skipping yq: most recent version 4.53.3 not installed
Warning: Skipping yt-dlp: most recent version 2026.6.9 not installed
Removing: /opt/homebrew/lib/python3.11/site-packages/__pycache__/google_auth_httplib2.cpython-311.pyc... (11.6KB)
Removing: /opt/homebrew/lib/python3.11/site-packages/__pycache__/py.cpython-311.pyc... (515B)
Removing: /opt/homebrew/lib/python3.14/site-packages/__pycache__/brotli.cpython-314.pyc... (1.9KB)
Removing: /opt/homebrew/lib/python3.14/site-packages/__pycache__/google_auth_httplib2.cpython-314.pyc... (11.2KB)
Removing: /opt/homebrew/lib/python3.14/site-packages/__pycache__/py.cpython-314.pyc... (472B)
Removing: /opt/homebrew/lib/python3.14/site-packages/__pycache__/six.cpython-314.pyc... (43.0KB)
Removing: /opt/homebrew/lib/python3.14/site-packages/__pycache__/typing_extensions.cpython-314.pyc... (175.5KB)
Pruned 0 symbolic links and 2 directories from /opt/homebrew
==> This operation has freed approximately 244.2KB of disk space.
$ brew cleanup --prune-prefix
Homebrew size after:
5.6G	/opt/homebrew
```
### Move removable Apple apps to Trash
```
Trash target: /Users/greg/.Trash/host-cleanup-20260628T212725Z
Before: 3.7G	/Applications/iMovie.app
Moved: /Applications/iMovie.app -> /Users/greg/.Trash/host-cleanup-20260628T212725Z/
Before: 1.1G	/Applications/GarageBand.app
Moved: /Applications/GarageBand.app -> /Users/greg/.Trash/host-cleanup-20260628T212725Z/
Trash size:
4.8G	/Users/greg/.Trash/host-cleanup-20260628T212725Z
```
### Cache cleanup
```
Sun Jun 28 21:27:45 UTC 2026
Greg cache before:
839M	/Users/greg/Library/Caches
Cleaning Greg ~/Library/Caches contents
rm: /Users/greg/Library/Caches/com.apple.HomeKit: Interrupted system call
rm: /Users/greg/Library/Caches/CloudKit: Interrupted system call
rm: /Users/greg/Library/Caches/com.apple.Safari: Interrupted system call
rm: /Users/greg/Library/Caches/com.apple.containermanagerd: Interrupted system call
rm: /Users/greg/Library/Caches/com.apple.python/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/lib/python3.9: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9/lib: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions/3.9: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework/Versions: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Library/Developer/CommandLineTools/Library/Frameworks/Python3.framework: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Library/Developer/CommandLineTools/Library/Frameworks: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Library/Developer/CommandLineTools/Library: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Library/Developer/CommandLineTools: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Library/Developer: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Library: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Users/greg/Library/Python/3.9/lib/python/site-packages: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Users/greg/Library/Python/3.9/lib/python: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Users/greg/Library/Python/3.9/lib: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Users/greg/Library/Python/3.9: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Users/greg/Library/Python: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Users/greg/Library: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Users/greg: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python/Users: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.python: Directory not empty
rm: /Users/greg/Library/Caches/com.apple.homed: Interrupted system call
rm: /Users/greg/Library/Caches/com.apple.ap.adprivacyd: Interrupted system call
Greg cache after:
6.3M	/Users/greg/Library/Caches
Jason cache/npm/bun before:
1.2G	/Users/jason-agent/Library/Caches
910M	/Users/jason-agent/.npm
965M	/Users/jason-agent/.bun
Cleaning Jason user caches
rm: /Users/jason-agent/Library/Caches/com.apple.containermanagerd: Interrupted system call
npm warn using --force Recommended protections disabled.
npm error code EACCES
npm error syscall lstat
npm error path /Users/greg/.hermes/profiles/sysadmin/home/.npm/_cacache
npm error errno -13
npm error
npm error Your cache folder contains root-owned files, due to a bug in previous versions of npm which has since been addressed.
npm error
npm error To permanently fix this problem, please run:
npm error   sudo chown -R 503:20 "/Users/greg/.hermes/profiles/sysadmin/home/.npm"
npm error Log files were not written due to an error writing to the directory: /Users/greg/.hermes/profiles/sysadmin/home/.npm/_logs
npm error You can rerun the command with `--loglevel=verbose` to see the logs in your terminal
error: No package.json was found for directory "/Users/greg"
note: Run "bun init" to initialize a project
Jason cache/npm/bun after:
  0B	/Users/jason-agent/Library/Caches
910M	/Users/jason-agent/.npm
965M	/Users/jason-agent/.bun
```
### Jason npm/bun cache cleanup retry with scrubbed env
```
Before:
910M	/Users/jason-agent/.npm
965M	/Users/jason-agent/.bun
npm warn using --force Recommended protections disabled.
error: No package.json was found for directory "/Users/greg"
note: Run "bun init" to initialize a project
After:
493M	/Users/jason-agent/.npm
 15M	/Users/jason-agent/.bun
```
### Jason npx cache cleanup
```
Before:
492M	/Users/jason-agent/.npm/_npx
After:
996K	/Users/jason-agent/.npm
```
### Time Machine snapshot thinning
```
Before snapshots:
Snapshots for volume group containing disk /:
com.apple.os.update-5514FF97DEE9C60C7FBF462B06A418D5FC4A882D5AF41D2BAF0A1419FB9B9F86
com.apple.os.update-B637DF12758CF0EBDDADA12002339AEF42145C281A27CEDFF36CE4491383767655DCCFD40DA43D421B94991CB1D275A5
com.apple.os.update-MSUPrepareUpdate
Thin request:
Thinned local snapshots:
After snapshots:
Snapshots for volume group containing disk /:
com.apple.os.update-5514FF97DEE9C60C7FBF462B06A418D5FC4A882D5AF41D2BAF0A1419FB9B9F86
com.apple.os.update-B637DF12758CF0EBDDADA12002339AEF42145C281A27CEDFF36CE4491383767655DCCFD40DA43D421B94991CB1D275A5
com.apple.os.update-MSUPrepareUpdate
```
### Empty scoped app Trash folder
```
Target: /Users/greg/.Trash/host-cleanup-20260628T212725Z
Before:
4.8G	/Users/greg/.Trash/host-cleanup-20260628T212725Z
After exists?
no
```
### Final verification
```
Disk after:
Filesystem        Size    Used   Avail Capacity iused ifree %iused  Mounted on
/dev/disk3s1s1   228Gi    17Gi    17Gi    50%    455k  181M    0%   /
/dev/disk3s5     228Gi   159Gi    17Gi    91%    5.3M  181M    3%   /System/Volumes/Data

Target sizes after:
5.6G	/opt/homebrew
missing /Applications/iMovie.app
missing /Applications/GarageBand.app
2.7G	/Applications/Google Chrome.app
6.4M	/Users/greg/Library/Caches
missing /Users/jason-agent/Library/Caches
996K	/Users/jason-agent/.npm
 15M	/Users/jason-agent/.bun
2.4G	/Users/jason-agent/repos

GCS retry:
GCS_BLOCKED
ERROR: (gcloud.storage.ls) There was a problem refreshing your current auth tokens: Reauthentication is needed. Please run `gcloud auth application-default login` to reauthenticate.
Please run:

  $ gcloud auth login

to obtain new credentials.
```

## Final status

- Cleanup completed locally.
- GCS upload completed directly as `greg@gbautomation.xyz`.
- Keyless uploader service account exists and bucket IAM was granted, but impersonation is still blocked by `iam.serviceAccounts.getAccessToken` despite the visible `roles/iam.serviceAccountTokenCreator` binding; keep as IAM follow-up.

## Artifact registry

- Local registry: `/Users/greg/repos/gbautomation/second-brain/intelligence/artifact-registry/gbautomation/20260628t212340z-host-disk-cleanup-0df88a046809/20260628T212340Z-host-disk-cleanup.md`
- Web route: `/artifacts/gbautomation/20260628t212340z-host-disk-cleanup-0df88a046809`
- GCS package staged: `/Users/greg/repos/gbautomation/second-brain/intelligence/host-maintenance/20260628T212340Z-host-disk-cleanup.tar.gz`
- GCS package sha256: `323779716c835fdca1c52a87126ada5aa65dc3a262b5b88167d4342a7aeb6471`

## Cloud upload

Uploaded successfully:

```text
gs://gbautomationxyz-artifacts/repo-artifacts/gbautomation/host-maintenance/2026/06/28/20260628T212340Z-host-disk-cleanup.tar.gz
```

Object proof:

- Creation Time: `2026-06-28T23:54:36Z`
- Content-Length: `3229`
- Storage Class: `STANDARD`
- Generation: `1782690876454190`

