# Micro Office

A Next.js workspace for team tasks, chat, files, document previews, calendars,
presence, settings, and time tracking. Supabase provides authentication,
database access, storage, and realtime features. AI summaries are not yet
connected to a backend.

## Local development

Use Node.js 24 (see `.nvmrc`) and npm. The package supports Node.js 22 or newer.
You also need an existing Supabase project with the application schema and RPCs.
The migrations in this repository do not create a complete database from scratch.

1. Copy `.env.example` to `.env.local` and fill in your Supabase public URL/key.
2. Install the locked dependencies with `npm ci`.
3. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

For invitation email delivery, configure both `RESEND_API_KEY` and
`RESEND_FROM_EMAIL`. Set `APP_URL` to the origin recipients should open.
See [the deployment guide](docs/DEPLOYMENT.md) for production configuration.

## Verification

```bash
npm run check
```

This runs lint (including warnings), generates route types and checks TypeScript,
runs the configuration regression tests, validates production environment
variables, and creates a production build. `npm run build` also runs the
environment check automatically.

Individual commands:

```bash
npm run lint
npm run typecheck
npm test
npm run test:db
npm run check:env
npm run build
npm audit
npm start
```

`test:db` requires local PostgreSQL binaries (including `pg_trgm`). Set `PG_BIN`
to the PostgreSQL `bin` directory if `pg_config` is not on PATH. The test runner
always creates and removes a disposable cluster containing synthetic data; it
never accepts a live database URL. See the [security and performance audit](docs/AUDIT-2026-09-10.md)
for results, migration prerequisites, limitations, and optional browser checks.

GitHub Actions runs these quality checks using build-only placeholder credentials.
A passing CI build does not verify the live Supabase schema, OAuth, or emails.
Google Fonts must be reachable during the build to download Manrope; Next.js
serves the resulting font files with the application.

## Deployment status

The code includes copyright footers, recovery/404 pages, private-route metadata,
security headers, and environment validation. Follow the outstanding database,
OAuth, storage, and acceptance checks in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
before publishing a production deployment.

## Copyright

Copyright (c) 2026 Micro Office. All rights reserved.

Third-party dependencies retain their respective licenses.
