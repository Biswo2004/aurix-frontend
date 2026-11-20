# AURIX AI: Google sign-in + Netlify + Render

## 0. Files to upload (frontend repo only; backend needs NO code change)
| File | Path in repo |
|---|---|
| netlify.toml | repo ROOT (new file) |
| auth.ts, auth.test.ts | src/lib/ |
| login.tsx, privacy.tsx | src/routes/ |
| routeTree.gen.ts | src/ (replaces the existing one) |
On GitHub open the target folder first, then Add file > Upload files.

## 1. Google Cloud: create the OAuth client
1. https://console.cloud.google.com > create/select a project.
2. APIs & Services > OAuth consent screen: User type External, app name AURIX AI, your support email. Save. (Scopes: email, profile, openid are the defaults, nothing else needed.) Click Publish app so anyone, not just test users, can sign in.
3. APIs & Services > Credentials > Create credentials > OAuth client ID > Web application.
4. Authorized JavaScript origins:  https://YOUR-SITE.netlify.app  and  http://localhost:8080 (optional, local dev)
5. Authorized redirect URIs (exactly this one):
   https://wpcrpcnkjyxoqonrxuio.supabase.co/auth/v1/callback
6. Create, then copy the Client ID and Client secret.

## 2. Supabase: enable the provider
Dashboard > Authentication > Sign In / Providers > Google: turn ON, paste Client ID + Client secret, Save.

## 3. Deploy the frontend to Netlify
1. https://app.netlify.com > Add new site > Import an existing project > GitHub > pick the frontend repo.
2. Build settings are read from netlify.toml (build: npm run build, publish: dist, NITRO_PRESET=netlify). Leave them as shown.
3. Site configuration > Environment variables (add these, then deploy):
   - VITE_API_URL = https://aurix-backend-m2j9.onrender.com/api
   - SUPABASE_URL = https://wpcrpcnkjyxoqonrxuio.supabase.co
   - SUPABASE_PUBLISHABLE_KEY = sb_publishable_8lvNk568RHHz71lc-i0DkQ_oKKLnpdl
   (Your committed .env already has VITE_API_URL, so it works even if you skip this, but setting it is safer.)
4. Deploy. Note your URL, e.g. https://aurix-ai.netlify.app (Site configuration > Change site name to choose a nice one).

## 4. Tell Supabase about the Netlify URL  (most common cause of broken Google login)
Authentication > URL Configuration:
- Site URL: https://YOUR-SITE.netlify.app
- Redirect URLs: add https://YOUR-SITE.netlify.app/**  (and http://localhost:8080/** for local dev)

## 5. Tell the backend (Render) about the Netlify URL
Render dashboard > your backend service > Environment > ALLOWED_ORIGINS:
  https://YOUR-SITE.netlify.app
Keep any existing origins, comma-separated, NO trailing slash, NO path:
  https://YOUR-SITE.netlify.app,http://localhost:8080
Save. Render redeploys itself.

## 6. Test
1. Open the Netlify URL, hard refresh (Ctrl+Shift+R).
2. Click Continue with Google, pick an account, you land on the chat and greeting uses your first name.
3. Send a message. If it fails with a network/CORS error, step 5 is wrong (origin must match exactly, https, no trailing slash).
4. Refresh the page: you stay signed in.

## Troubleshooting
- "redirect_uri_mismatch" from Google: step 1.5 URI is not exactly the Supabase callback above.
- "provider is not enabled": step 2 not saved.
- Lands on /login again or on localhost after Google: Site URL / Redirect URLs in step 4 are missing.
- Page 404 on refresh of /login: make sure the build used netlify.toml (deploy log should show "preset: netlify").
- First request after idle is slow: Render free tier cold start (~30-60 s).
