#!/usr/bin/env bash
# One-time (idempotent) preparation for running the exported Site outside the
# hosted Sites platform. It does not touch application source. Run it after
# `npm ci` and before `npm run dev`, with the dev server stopped.
#
# 1. Font cache: `.vinext/fonts/*/style.css` was generated on the original host
#    and embeds that host's absolute checkout path. Vinext only rewrites URLs
#    that start with the *current* project's `.vinext/fonts` path, so the cached
#    Geist fonts 404 anywhere else. Point them at this checkout instead.
# 2. Local D1: the hosted platform applied `drizzle/` migrations for the app.
#    Apply them to the Miniflare D1 state that `npm run dev` uses
#    (`.wrangler/state`), so `/api/pilot-state` and `/api/files` have tables.
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${project_root}"

wrangler="${project_root}/node_modules/.bin/wrangler"
if [[ ! -x "${wrangler}" ]]; then
  echo "wrangler is unavailable. Run npm ci first." >&2
  exit 69
fi

font_cache="${project_root}/.vinext/fonts"
if [[ -d "${font_cache}" ]]; then
  echo "[local-setup] pointing cached font CSS at ${font_cache}"
  find "${font_cache}" -name style.css -print0 |
    xargs -0 -r sed -i -E "s#url\\([^)]*/\\.vinext/fonts/#url(${font_cache}/#g"
fi

# Mirrors the local D1 binding in vite.config.ts (binding from
# .openai/hosting.json, placeholder database id). Kept under the ignored
# .wrangler/ directory so the Cloudflare Vite plugin never discovers it.
d1_binding="$(node -e 'process.stdout.write(require(process.argv[1]).d1 || "")' "${project_root}/.openai/hosting.json")"
if [[ -z "${d1_binding}" ]]; then
  echo "[local-setup] no d1 binding in .openai/hosting.json; skipping migrations"
  exit 0
fi

setup_dir="${project_root}/.wrangler/local-setup"
mkdir -p "${setup_dir}"
cat >"${setup_dir}/wrangler.json" <<JSON
{
  "name": "seatgeek-client-launch-hub-local",
  "compatibility_flags": ["nodejs_compat"],
  "d1_databases": [
    {
      "binding": "${d1_binding}",
      "database_name": "site-creator-d1",
      "database_id": "00000000-0000-4000-8000-000000000000",
      "migrations_dir": "${project_root}/drizzle"
    }
  ]
}
JSON

echo "[local-setup] applying drizzle/ migrations to local D1 binding ${d1_binding}"
CI=1 \
  WRANGLER_SEND_METRICS=false \
  WRANGLER_LOG_PATH="${project_root}/.wrangler/logs" \
  "${wrangler}" d1 migrations apply "${d1_binding}" \
  --local \
  --config "${setup_dir}/wrangler.json" \
  --persist-to "${project_root}/.wrangler/state"

echo "[local-setup] done. Start the app with: npm run dev"
