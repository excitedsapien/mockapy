# Mockapy

A small mock API editor built with Vue 3, Netlify Functions, and Airtable-friendly persistence.

## Local development

```sh
npm install
npm run dev
```

The editor works in local preview mode without credentials. To persist mocks, copy `.env.example` to `.env`, add Airtable values, and configure the same variables in Netlify.

The Netlify function reads and writes user-scoped mock records using Airtable records keyed by `path`, `method`, and `user_id`. Each user slot keeps its own data, so `user-1`, `user-2`, and so on remain isolated.

## Airtable setup

1. Create an Airtable base and a table named `mocks`.
2. Add these fields:
   - `path` as a single line text
   - `method` as a single line text
   - `user_id` as a single line text
   - `status` as a number
   - `headers` as a long text
   - `body` as a long text
   - `rules` as a long text
3. Add the following environment variables in Netlify:
   - `AIRTABLE_PAT`
   - `AIRTABLE_BASE_ID`
   - `AIRTABLE_TABLE_NAME` (default `mocks`)

The editor POSTs saved mocks to `/.netlify/functions/mock`. Saved GET mocks can be called with `/.netlify/functions/mock?path=/api/users&user=user-1`.
