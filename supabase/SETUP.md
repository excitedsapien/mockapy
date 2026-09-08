# Supabase setup

1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor**, create a new query, paste the contents of `schema.sql`, and run it.
3. Open **Project Settings > API** and copy the project URL and service role key.
4. In Netlify, open **Site configuration > Environment variables** and add:

   - `SUPABASE_URL`: the Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: the service role key

5. Redeploy the site after saving the variables.

The service role key is used only by `netlify/functions/mock.js`. Do not commit it, put it in `.env.example`, or expose it as a `VITE_` variable.

## Verify persistence

After deployment, save a mock in the app, then call the saved GET route:

```sh
curl "https://YOUR-SITE.netlify.app/.netlify/functions/mock?path=/api/users"
```

The response comes from Supabase when the environment variables are configured. Without them, the function returns its local fallback response.
