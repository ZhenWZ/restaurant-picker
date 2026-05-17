# GitHub Pages + Supabase Deployment

## GitHub Secrets

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_DB_PASSWORD`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## GitHub Variables

- `VITE_BASE_PATH`: use `/<repo>/` for a GitHub Pages project site, or `/` for a custom domain.
- `VITE_SUPABASE_OAUTH_PROVIDERS`: comma-separated provider list, default `google,github`.

## Supabase Auth

Enable Email/password sign-in and the OAuth providers you expose in `VITE_SUPABASE_OAUTH_PROVIDERS`.

Add redirect URLs for:

- Local dev: `http://localhost:5173/`
- GitHub Pages: `https://<owner>.github.io/<repo>/`

The app uses hash routing, so OAuth returns to the Pages root and the browser restores the route.
