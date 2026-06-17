---
title: Artifact Pipeline Isolation Test
client: fisch-group
project: artifact-pipeline
artifact_kind: test
tags: [test, drive-isolation]
---

# Artifact Pipeline Isolation Test

This is a test document to verify client-isolated Google Drive artifact publishing.

Expected client folder: Fish Group.

Expected behavior:
- The artifact is copied into the local artifact registry.
- The artifact is mirrored into the Amplify public artifacts folder.
- The artifact is uploaded to the Fish Group Google Drive folder only.
- The manifest includes Drive metadata and the artifact route.
