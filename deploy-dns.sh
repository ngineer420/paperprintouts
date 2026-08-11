#!/usr/bin/env bash
#
# Point paperprintouts.com at GitHub Pages.
#
# Needs a Cloudflare API token with Zone:DNS:Edit on this zone. Create one at
#   Cloudflare → My Profile → API Tokens → Create Token → "Edit zone DNS"
#   → Zone Resources: Include → Specific zone → paperprintouts.com
#
# Then:
#   CLOUDFLARE_API_TOKEN=xxxx ./deploy-dns.sh
#
# Records are created DNS-only (not proxied). GitHub needs to reach the apex
# directly to issue the TLS certificate; turning the orange cloud on before that
# certificate exists is the usual cause of a Pages site stuck on "unavailable".
# Once HTTPS works you can proxy it if you want the Cloudflare cache.
#
# Re-running is safe: an existing record with the same name and content is left
# alone rather than duplicated.

set -euo pipefail

ZONE_NAME="paperprintouts.com"
PAGES_IPS=(185.199.108.153 185.199.109.153 185.199.110.153 185.199.111.153)
WWW_TARGET="ngineer420.github.io"

: "${CLOUDFLARE_API_TOKEN:?Set CLOUDFLARE_API_TOKEN (needs Zone:DNS:Edit on ${ZONE_NAME})}"

api() {
  curl -sS -m 30 -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
       -H "Content-Type: application/json" "$@"
}

zone_id=$(api "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}" \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); r=d.get("result") or []; print(r[0]["id"] if r else "")')

if [ -z "$zone_id" ]; then
  echo "Could not find the zone ${ZONE_NAME}." >&2
  echo "Either the token is scoped to a different zone, or the domain is not in this account." >&2
  exit 1
fi
echo "zone ${ZONE_NAME} → ${zone_id:0:8}…"

existing=$(api "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records?per_page=100")

have() {
  # $1 = type, $2 = name, $3 = content
  echo "$existing" | python3 -c '
import sys, json
t, n, c = sys.argv[1], sys.argv[2], sys.argv[3]
for r in (json.load(sys.stdin).get("result") or []):
    if r["type"] == t and r["name"] == n and r["content"] == c:
        sys.exit(0)
sys.exit(1)
' "$1" "$2" "$3"
}

add() {
  # $1 = type, $2 = name, $3 = content
  if have "$1" "$2" "$3"; then
    echo "  = $1 $2 → $3 (already there)"
    return
  fi
  result=$(api -X POST "https://api.cloudflare.com/client/v4/zones/${zone_id}/dns_records" \
    --data "{\"type\":\"$1\",\"name\":\"$2\",\"content\":\"$3\",\"ttl\":1,\"proxied\":false}")
  ok=$(echo "$result" | python3 -c 'import sys,json; print(json.load(sys.stdin).get("success"))')
  if [ "$ok" = "True" ]; then
    echo "  + $1 $2 → $3"
  else
    echo "  ! $1 $2 → $3 failed:" >&2
    echo "$result" | python3 -c 'import sys,json; [print("     ", e.get("message")) for e in json.load(sys.stdin).get("errors",[])]' >&2
  fi
}

for ip in "${PAGES_IPS[@]}"; do
  add A "$ZONE_NAME" "$ip"
done
add CNAME "www.${ZONE_NAME}" "$WWW_TARGET"

echo
echo "Done. DNS usually answers within a minute or two:"
echo "  dig +short ${ZONE_NAME} A"
echo
echo "Then in the repo settings, wait for GitHub to issue the certificate and tick"
echo "\"Enforce HTTPS\". Until that certificate exists, leave the records DNS-only."
