# Cirkle — staging deploy (Cloudflare Pages + D1)

## 1. Environment variables

Set these as **Pages project → Settings → Variables and Secrets** (Preview/staging
environment) — they are read server-side in `functions/api/[[path]].ts` via `src/server/ai.ts`:

| Name | Purpose |
| --- | --- |
| `GROQ_API_KEY` | primary chat/orchestration provider |
| `GEMINI_API_KEY` | Gemini fallback + web-grounded answers |
| `HF_API_KEY` | embeddings + image captioning |
| `OPENAI_API_KEY` | optional third fallback |
| `OPENREGISTRY_PAT`, `ORIZON_VISA_API_KEY` | optional identity/payment integrations |

Locally, copy `.dev.vars.example` to `.dev.vars` (git-ignored) or export the same
names in your shell — the Vite dev API plugin picks them up automatically.

## 2. Database

`wrangler.jsonc` binds D1 as `DB`. For a staging database:

```bash
npx wrangler d1 create cirkle-staging          # copy the returned database_id into wrangler.jsonc
npx wrangler d1 migrations apply cirkle-staging
npx wrangler d1 execute cirkle-staging --file=./seed.sql
npx wrangler d1 execute cirkle-staging --file=./seed_v12.sql
```

## 3. Build and deploy

```bash
npm run build                                   # vite build -> ./dist
npx wrangler pages deploy dist --project-name cirkle-staging
```

Requires `CLOUDFLARE_API_TOKEN` (Pages + D1 edit) and `CLOUDFLARE_ACCOUNT_ID` in the
shell running the deploy. Local end-to-end run of the real Workers runtime:

```bash
npm run build && npm run pages:dev              # wrangler pages dev dist on :3000
```

## 4. Post-deploy verification

```bash
SMOKE_BASE_URL=https://<staging-url> npm run test:e2e
```

The smoke test asserts AI provider health, Circle Brain answers, Wasl room list,
message persistence, privacy persistence, auth register/OTP, all 38 routes, chat
list, composer send, and the privacy drawer.