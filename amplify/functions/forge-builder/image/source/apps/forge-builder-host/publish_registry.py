"""Register a hosted Forge agent for an exact Cognito customer in private S3.

Default is a local preview. --apply uses an S3 conditional write and hash readback.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

TENANT = "gbautomation"
KEY = f"{TENANT}/forge-agent-registry.v1.json"
SUB = re.compile(r"^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$", re.I)
SLUG = re.compile(r"^[a-z][a-z0-9-]{2,62}$")
SHA = re.compile(r"^[a-f0-9]{64}$")


def encoded(value: dict) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def validate(value: dict) -> None:
    if value.get("schema_version") != "forge-agent-registry.v1" or value.get("tenant_id") != TENANT:
        raise ValueError("registry_binding_invalid")
    rows = value.get("agents")
    if not isinstance(rows, list) or len(rows) > 100:
        raise ValueError("registry_inventory_invalid")
    seen = set()
    for row in rows:
        if not isinstance(row, dict) or set(row) != {"tenant_id", "agent_id", "display_name", "config_sha256", "subjects", "status", "packet_id", "repository"}:
            raise ValueError("registry_row_invalid")
        agent = row["agent_id"]
        if row["tenant_id"] != TENANT or not SLUG.fullmatch(agent) or agent in seen:
            raise ValueError("registry_agent_invalid")
        seen.add(agent)
        if not isinstance(row["display_name"], str) or not 1 <= len(row["display_name"]) <= 120:
            raise ValueError("registry_name_invalid")
        if not SHA.fullmatch(row["config_sha256"]) or not SHA.fullmatch(row["packet_id"]):
            raise ValueError("registry_hash_invalid")
        if row["repository"] != f"gbauto/{TENANT}-{agent}" or row["status"] not in {"pending", "active"}:
            raise ValueError("registry_state_invalid")
        subjects = row["subjects"]
        if not isinstance(subjects, list) or not subjects or len(subjects) > 30 or len(set(subjects)) != len(subjects) or not all(isinstance(sub,str) and SUB.fullmatch(sub) for sub in subjects):
            raise ValueError("registry_membership_invalid")


def merge(current: dict, incoming: dict) -> dict:
    validate(current)
    result = json.loads(json.dumps(current))
    old = next((row for row in result["agents"] if row["agent_id"] == incoming["agent_id"]), None)
    if old:
        # A changed packet or customer membership cannot silently replace a registration.
        if old != incoming:
            if not (old.get("status") == "pending" and incoming.get("status") == "active"
                    and {k: v for k, v in old.items() if k != "status"}
                    == {k: v for k, v in incoming.items() if k != "status"}):
                raise ValueError("existing_registration_review_required")
            result["agents"] = [incoming if row["agent_id"] == incoming["agent_id"] else row
                                for row in result["agents"]]
        return result
    result["agents"].append(incoming)
    result["agents"].sort(key=lambda row: row["agent_id"])
    validate(result)
    return result


def load(s3, bucket: str) -> tuple[dict, str | None]:
    try:
        response = s3.get_object(Bucket=bucket, Key=KEY)
    except ClientError as error:
        if error.response.get("Error", {}).get("Code") in {"NoSuchKey", "404"}:
            return {"schema_version": "forge-agent-registry.v1", "tenant_id": TENANT, "agents": []}, None
        raise
    data = response["Body"].read()
    if len(data) > 100000 or hashlib.sha256(data).hexdigest() != response.get("Metadata", {}).get("sha256"):
        raise ValueError("registry_readback_invalid")
    current = json.loads(data)
    validate(current)
    return current, response["ETag"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("repository_receipt", type=Path)
    parser.add_argument("--customer-sub", required=True)
    parser.add_argument("--display-name", required=True)
    parser.add_argument("--config-sha256", required=True)
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--activate", action="store_true")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not SUB.fullmatch(args.customer_sub) or not SHA.fullmatch(args.config_sha256) or not args.bucket.startswith("amplify-"):
        raise ValueError("registry_target_invalid")
    receipt = json.loads(args.repository_receipt.read_text(encoding="utf-8"))
    if receipt.get("state") != "created" or receipt.get("schema_version") != "forge-repository-handoff.v1":
        raise ValueError("created_repository_required")
    incoming = {"tenant_id":TENANT,"agent_id":receipt["agent_id"],"display_name":args.display_name,
                "config_sha256":args.config_sha256,"subjects":[args.customer_sub],"status":"pending",
                "packet_id":receipt["packet_id"],"repository":receipt["repository"]}
    if args.activate:
        if not args.apply: raise ValueError("activation_requires_hosted_readback")
        incoming["status"] = "active"
    validate({"schema_version":"forge-agent-registry.v1","tenant_id":TENANT,"agents":[incoming]})
    if args.apply:
        s3 = boto3.client("s3", region_name="us-east-1")
        current, etag = load(s3, args.bucket)
        if args.activate:
            head = s3.head_object(Bucket=args.bucket, Key=f"{TENANT}/{incoming['agent_id']}/index.html")
            if not re.fullmatch(r"[a-f0-9]{64}", head.get("Metadata", {}).get("sha256", "")) or not head.get("VersionId") or not head.get("ContentLength"):
                raise ValueError("hosted_document_readback_required")
    else:
        current, etag = {"schema_version":"forge-agent-registry.v1","tenant_id":TENANT,"agents":[]}, None
    merged = merge(current, incoming)
    data = encoded(merged)
    digest = hashlib.sha256(data).hexdigest()
    if args.apply:
        condition = {"IfMatch": etag} if etag else {"IfNoneMatch": "*"}
        s3.put_object(Bucket=args.bucket, Key=KEY, Body=data, ContentType="application/json",
                      CacheControl="private, no-store", Metadata={"sha256":digest}, **condition)
        saved, _ = load(s3, args.bucket)
        if encoded(saved) != data:
            raise ValueError("registry_write_readback_failed")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"schema_version":"forge-registry-publication.v1","state":"published" if args.apply else "prepared",
                                       "tenant_id":TENANT,"agent_id":incoming["agent_id"],"registry_key":KEY,
                                       "sha256":digest,"agent_count":len(merged["agents"])},indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"state":"published" if args.apply else "prepared","agent_id":incoming["agent_id"],"agent_count":len(merged["agents"]),"sha256":digest}))


if __name__ == "__main__":
    main()
