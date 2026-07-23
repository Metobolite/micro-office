# Micro Office

Micro Office is a Next.js workspace for team tasks, chat, files, document
summaries, calendars, presence, settings, and time tracking. Authentication,
database access, storage, and realtime features use Supabase.

## Local development

Requirements:

- Node.js 22 or newer
- A Supabase project with the application schema installed

Create `.env.local` with:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Optional invitation email configuration
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

The app is available at [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Database performance

SQL migrations live in `supabase/migrations`. Apply them to the target
Supabase project as part of deployment. The performance-index migration covers
the filter and ordering patterns used by dashboard navigation and the main
feature pages.
