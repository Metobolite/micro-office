# Deployment guide

## Current readiness

The application uses server actions, cookies, OAuth routes, and a session proxy.
Deploy it on a managed Next.js host or a Node.js server, not static export hosting.

The repository is not yet a complete Supabase installation. These release
requirements are not performed automatically by deploying the application:

- Obtain and version the existing base database schema and missing RPC definitions
  below. Verify the full setup on a staging project.
- Verify database RLS, Storage policies, and private Realtime authorization with
  separate accounts before accepting real workspace data.
- Configure the public domain, OAuth providers, and invitation sender.
- AI document summary generation has no backend implementation. Keep it marked
  as unavailable until that feature is implemented and tested.
- Email delivery failures after a database insert leave a pending invitation;
  expired pending records also block reinviting the same address. A resend/expiry
  flow still needs a transactional backend implementation. Missing email
  configuration is now detected before inserting an invitation.

## Environment variables

Configure local, preview/staging, and production values separately. Keep real
environment files out of Git; `.env.example` contains only a safe template.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Required project API URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required publishable or legacy anon key. Never use a secret/service-role key. |
| `APP_URL` | Public origin, e.g. `https://office.example.com`. Required in production unless another supported origin below is available. |
| `NEXT_PUBLIC_APP_URL` | Legacy fallback for `APP_URL`; new deployments should use `APP_URL`. |
| `VERCEL_URL` | Supplied by Vercel; used as `https://<host>` when explicit app origins are absent. |
| `RESEND_API_KEY` | Optional server-only invitation email credential. |
| `RESEND_FROM_EMAIL` | Required with the email API key; use a verified sender, e.g. `Micro Office <invites@example.com>`. |

Use a separate Supabase staging project for previews. Set the preview origin
explicitly, or leave `APP_URL` unset on Vercel previews to use `VERCEL_URL`.
Do not copy the localhost value from `.env.example` into a hosted deployment.
Explicit HTTP loopback origins remain allowed for local production smoke tests.

`npm run check:env` uses Next.js production environment file precedence. It checks
required values, public-key safety, and invitation origin shape without printing
credentials. It does not verify active keys, sender ownership, or the remote
database. Public variables are bundled at build time; rebuild after changing them.

## Hosting configuration

For a managed host, select Next.js and Node.js 24 (matching `.nvmrc` and CI), use
`npm ci` for installation and `npm run build` for the build, and keep the platform's
default output directory. Include development dependencies during the build.
Add production environment variables before building.

For a Node.js server:

```bash
npm ci
npm run check
npm start
```

Run behind HTTPS and preserve the public host/origin through the reverse proxy.
Preserve cookies and response cache headers; do not apply shared public CDN
caching to authenticated pages or OAuth responses. Test logout and server actions
through the actual proxy. Configure process restarts and runtime log collection
on the hosting platform. Retain the previous working release for rollback.

Google Fonts must be reachable at build time. Runtime Supabase requests and
WebSocket connections must be allowed; invitation emails also require access to
Resend. A passing build is not a live service connectivity check.

## Supabase schema and migrations

Expected tables: `teams`, `team_members`, `team_invitations`, `tasks`, `events`,
`messages`, `files`, and `time_entries`.

Existing migrations, in timestamp order:

1. `20260816120000_security_hardening.sql`: membership checks and RLS guards.
2. `20260816121000_performance_indexes.sql`: indexes and invitation uniqueness.
3. `20260820160000_sync_profile_across_teams.sql`: profile synchronization RPC.

These migrations require the base tables to exist. They do not install the
application schema on an empty project. Before applying pending migrations,
compare the project's migration history, take a backup, and validate in staging.
The index migration assumes small tables and uses bounded lock timeouts; read
the migration comments first.

RPC definitions called by the application but missing from this repository:

- `accept_team_invitation_with_role`
- `update_team_name_settings`
- `can_access_team_presence`
- `get_time_entry_summary`
- `start_time_entry`, `pause_time_entry`, `resume_time_entry`, `stop_time_entry`
- `create_manual_time_entry`, `delete_time_entry`

`sync_own_profile_settings` is included in the third migration. Verify RPC caller
identity, membership checks, input validation, and execution grants. Review
privileged function ownership and safe `search_path` as described in the security
migration.

## Storage and Realtime

- `user-files`: private bucket. Uploads use `<user-id>/<random-id>_<filename>`;
  downloads use authentication/signed URLs. Match access to the owner/team rules
  in the `files` table. Enforce paths and membership in Storage policies and
  configure upload size limits.
- `avatars`: the current code uses public image URLs. Limit writes/deletes to the
  authenticated user's `<user-id>/avatars/` prefix, with image type/size limits.
- Chat subscribes to Postgres changes on `messages`. Verify publication and RLS
  for the intended members.
- Presence uses private `team:<team-id>:presence` channels. Verify both
  `can_access_team_presence` and Realtime authorization reject nonmembers.

The migrations do not provision Storage policies or Realtime configuration.
Export and version their reviewed setup before a reproducible release.

## OAuth and email

Enable Google and GitHub in Supabase. Their provider callback is the Supabase
Auth callback shown in its dashboard. The application's callback is
`/auth/callback`; these are different configuration points.

Set Supabase Auth's Site URL to the production origin. Configure the Redirect
URLs allowlist for the application's `/auth/callback`, including the `next` query
parameter used by login. Allow only the required production, staging, and local
domains. Verify regular login and login returning to `/invite/<token>`.

Configure a verified Resend sender, then test delivery and acceptance in staging.
A saved invitation is not proof of a delivered email. Never put the Resend API key
into a `NEXT_PUBLIC_` variable.

## Acceptance before production

- Run `npm run check` and `npm audit` against the lockfile.
- Start the production build and check home, login, 404, copyright, light/dark
  themes, and mobile layouts. Check headers over the final HTTPS domain.
- Complete Google/GitHub login, refresh, callback failure, and logout.
- Create/select a team; verify tasks, calendar, chat, avatar upload, file
  upload/download/delete, document previews, and timer start/pause/resume/stop.
- Send and accept an invitation; check wrong-account, expired, and reused links.
- Use two accounts in different teams. Verify cross-team reads/writes, forged
  identities, Storage paths, and private Presence access are rejected.
- Check browser/server logs and verify backup recovery and application rollback.

CI runs lint, TypeScript, configuration tests, build, and dependency audit without
production secrets. It does not replace authenticated/database acceptance tests.

## References

- [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [Supabase Auth redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
