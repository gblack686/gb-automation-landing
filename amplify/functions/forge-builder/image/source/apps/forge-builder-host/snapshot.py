"""Bounded snapshots of the private pilot store, never user-selected paths."""
import argparse
from pathlib import Path, PurePosixPath
import tarfile

ALLOWED = {'postgres', 'mirror', 'mail', 'builder', 'signing-key', 'resume-fixture.sqlite'}
MAX_BYTES = 200_000_000
MAX_FILES = 12000


def allowed(name):
    p = PurePosixPath(name)
    return (isinstance(name, str) and name == p.as_posix()
            and not p.is_absolute() and bool(p.parts) and p.parts[0] in ALLOWED
            and '..' not in p.parts and '\\' not in name and ':' not in name
            and not (p.parts[0] == 'builder' and len(p.parts) > 1 and p.parts[1] != '.forge-builder'))


def pack(root, archive):
    files = [p for p in root.rglob('*') if allowed(p.relative_to(root).as_posix())]
    if len(files) > MAX_FILES or sum(p.stat().st_size for p in files if p.is_file()) > MAX_BYTES:
        raise ValueError('snapshot_size_limit')
    with tarfile.open(archive, 'w:gz') as output:
        for p in sorted(files):
            if p.is_symlink() or not p.resolve().is_relative_to(root.resolve()):
                raise ValueError('snapshot_link_denied')
            output.add(p, arcname=p.relative_to(root).as_posix(), recursive=False)


def restore(root, archive):
    root.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive, 'r:gz') as source:
        members, names, size = [], set(), 0
        for member in source:
            size += member.size
            if len(members) >= MAX_FILES or size > MAX_BYTES or member.size < 0:
                raise ValueError('snapshot_size_limit')
            if (not (member.isfile() or member.isdir()) or not allowed(member.name) or member.name.casefold() in names
                    or not (root / member.name).resolve().is_relative_to(root.resolve())):
                raise ValueError('snapshot_route_denied')
            names.add(member.name.casefold())
            members.append(member)
        source.extractall(root, members=members, filter='data')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['pack', 'restore'])
    parser.add_argument('root', type=Path)
    parser.add_argument('archive', type=Path)
    args = parser.parse_args()
    globals()[args.action](args.root.resolve(), args.archive.resolve())
