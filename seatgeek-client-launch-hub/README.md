# SeatGeek Client Launch Hub

Migration package for the SeatGeek Client Launch Hub.

- Source revision: `40f06e602b54e4927eec37f59de01f0ad1d2af11`
- Exported: October 6, 2026
- Runtime: Vinext/Next.js on Cloudflare Workers
- Language: TypeScript and CSS
- Package manager: npm

## What is included

- `app/` — pages, portal interface, API routes, authentication helpers, CSS, and 3PE templates
- `public/` — favicon and static image assets
- `worker/` — Cloudflare Worker entry point
- `db/` — Drizzle database schema and binding helper
- `drizzle/` — versioned D1 database migrations and metadata
- `build/` and `scripts/` — local/build tooling and artifact validation
- `tests/` — rendered application test
- `.vinext/fonts/` — bundled Geist font assets
- `.openai/hosting.json` — logical Sites binding names for D1 and R2
- `package.json` and `package-lock.json` — exact dependency definitions
- TypeScript, Vite, Next.js, PostCSS, ESLint, and Drizzle configuration files

The package intentionally excludes installed dependencies, generated build
output, local runtime state, Git history, environment files, credentials,
tokens, and secrets.

## Requirements

- Node.js 22.13.0 or newer
- npm
- Linux is recommended for the included build scripts because they use
  `flock` and GNU `timeout`

## Run locally

1. Extract the ZIP and open a terminal in the extracted
   `seatgeek-client-launch-hub` folder.
2. Install the locked dependencies:

   ```bash
   npm ci
   ```

3. Start the local development server:

   ```bash
   npm run dev
   ```

4. Open the local address printed in the terminal.

Local development uses the configured Miniflare simulation for the logical D1
binding `DB` and R2 binding `FILES`. The portal treats localhost as an Admin
preview when hosted identity headers are unavailable.

## Build and verify

```bash
npm run build
npm test
```

The production build is written to `dist/`. To run the built application:

```bash
npm run start
```

Additional commands:

- `npm run lint` — run ESLint
- `npm run validate:artifact` — validate an existing build
- `npm run db:generate` — generate a new Drizzle migration after schema changes

## Storage and database

The portal uses:

- Cloudflare D1 binding `DB` for portal state, activity history, and attachment metadata
- Cloudflare R2 binding `FILES` for uploaded file contents

The database schema is in `db/schema.ts`, with migrations in `drizzle/`.
Apply those migrations to the destination D1 database before production use.
Configure an R2 bucket as the `FILES` binding.

This ZIP includes the schema and application source, but it does **not** include
the live hosted D1 records, uploaded R2 files, the Sites visitor-access list, or
other production service data. Those should be exported and migrated separately
only through an approved secure process.

## Authentication and authorization

The hosted Site receives signed-in identity through these request headers:

- `oai-authenticated-user-email`
- `oai-authenticated-user-full-name` when available
- `oai-authenticated-user-full-name-encoding`

The portal then applies its Admin, CSS, and Client authorization rules on the
server. If moving to another platform, replace the hosting identity layer while
preserving the server-side role and client-scope checks.

## Optional email notifications

In-portal notifications work without an email provider. Email delivery remains
optional and supports either:

- `EMAIL_NOTIFICATION_WEBHOOK_URL` for an approved webhook such as Google Apps Script
- `RESEND_API_KEY` together with `NOTIFICATION_FROM_EMAIL`

Do not commit these values. Add them as secrets in the destination hosting
environment.

## Migration checklist

1. Install dependencies with `npm ci`.
2. Run `npm test`.
3. Provision D1 and R2 equivalents.
4. Apply the migrations from `drizzle/`.
5. Configure the `DB` and `FILES` bindings.
6. Configure the destination authentication/visitor-access layer.
7. Add optional email secrets only through the destination secret manager.
8. Build and deploy the Worker output from `dist/`.
9. Test Admin, CSS, and Client permissions before inviting users.
10. Migrate hosted records and uploaded files separately if required.

## Important files

- `app/portal-client.tsx` — primary portal UI and interactions
- `app/globals.css` — complete light/dark responsive styling
- `app/api/pilot-state/route.ts` — saved portal state and notification rules
- `app/api/files/` — secure file upload/download routes
- `app/chatgpt-auth.ts` — hosted sign-in helpers
- `worker/index.ts` — Cloudflare Worker runtime bindings
- `vite.config.ts` — local D1/R2 simulation and Vinext build configuration
- `.openai/hosting.json` — logical Sites resource declarations

## Security

No secrets or credentials are included in this archive. Keep `.env*`, private
keys, access tokens, API keys, service credentials, production database exports,
and uploaded client files outside source control and outside unsecured ZIPs.
