# Patent Office Update Checker

Static React + Vite frontend for assigning daily IP office checks to workers, with Supabase Auth/DB/RLS and an Edge Function for AI summary/category suggestions.

## Features

- Google login via Supabase Auth
- Worker queue with randomized, once-per-site-per-day assignment
- Exact match vs mismatch handling
- Mismatch chain entry and required newest article text
- Server-side AI summary + category suggestion (`summarize-article` edge function)
- Admin mismatch review (edit summary/categories, approve/reject)
- Admin category management

## Local setup

1. Copy envs:
   ```bash
   cp .env.example .env
   ```
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Install deps:
   ```bash
   npm install
   ```
4. Run dev server:
   ```bash
   npm run dev
   ```

## Supabase setup

1. Run migration in `supabase/migrations/20260416104000_init.sql`.
2. Configure Google provider in Supabase Auth.
3. Set redirect URLs:
   - `http://localhost:5173`
   - `https://<github-username>.github.io/ipo-update-checker/`
4. Deploy edge function:
   ```bash
   supabase functions deploy summarize-article
   ```
5. Set function secrets:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
   - `SUPABASE_SERVICE_ROLE_KEY` (for function runtime)

## GitHub Pages deployment

- `vite.config.ts` sets `base` to `/ipo-update-checker/` in production.
- Build and publish `dist/` via your preferred GitHub Pages workflow.

## Notes

- Model API is only called server-side from Supabase Edge Functions.
- Baseline updates occur only through admin approval flow.
