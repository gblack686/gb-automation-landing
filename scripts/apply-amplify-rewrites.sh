#!/usr/bin/env bash
# Apply amplify-rewrites.json to the gb-automation-landing Amplify Hosting app.
#
# Requires:
#   - AWS credentials with amplify:UpdateApp on the target app
#   - Either AMPLIFY_APP_ID exported in the env, or pass --app-id <id> as arg 1
#
# Usage:
#   AMPLIFY_APP_ID=d1abc23defghij ./scripts/apply-amplify-rewrites.sh
#   ./scripts/apply-amplify-rewrites.sh d1abc23defghij
#
# See AMPLIFY_REWRITES.md for context.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RULES_FILE="$REPO_ROOT/amplify-rewrites.json"
REGION="${AWS_REGION:-us-east-1}"

if [[ ! -f "$RULES_FILE" ]]; then
  echo "missing $RULES_FILE" >&2
  exit 1
fi

APP_ID="${1:-${AMPLIFY_APP_ID:-}}"
if [[ -z "$APP_ID" ]]; then
  echo "set AMPLIFY_APP_ID or pass the Amplify app id as the first arg" >&2
  echo "find it in the Amplify console URL: console.aws.amazon.com/amplify/home?region=us-east-1#/<APP_ID>" >&2
  exit 1
fi

# Sanity-check the rules JSON parses.
python3 -c "import json,sys; json.load(open('$RULES_FILE'))" || {
  echo "$RULES_FILE is not valid JSON" >&2
  exit 1
}

echo "applying rewrites to amplify app $APP_ID in $REGION ..."
aws amplify update-app \
  --app-id "$APP_ID" \
  --custom-rules "$(cat "$RULES_FILE")" \
  --region "$REGION" \
  --output json | python3 -c "import json,sys; d=json.load(sys.stdin); rules=d.get('app',{}).get('customRules',[]); print(f'updated. {len(rules)} rules now live.')"

echo
echo "verify with:"
echo "  curl -s https://gbautomation.xyz/prds/test-clients-hermes-iac-prd.html | head -3"
echo "expect: <!DOCTYPE html> + a real PRD title, NOT the SPA shell."
