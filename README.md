# Mockapy

A small mock API editor built with Vue 3, Netlify Functions, and Supabase.

## Local development

```sh
npm install
npm run dev
```

The editor works in local preview mode without credentials. To persist mocks, copy `.env.example` to `.env`, add Supabase values, and configure the same variables in Netlify.

Run `supabase/schema.sql` in the Supabase SQL editor before deploying. The Netlify function uses the service role key server-side; never expose that key as a `VITE_` variable.

## Deploy to Netlify

1. Push this folder to a Git repository.
2. Import the repository in Netlify.
3. Keep the defaults from `netlify.toml`: build command `npm run build`, publish directory `dist`, and functions directory `netlify/functions`.
4. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` under Netlify environment variables.

The editor POSTs saved mocks to `/.netlify/functions/mock`. Saved GET mocks can be called with `/.netlify/functions/mock?path=/api/users`.
