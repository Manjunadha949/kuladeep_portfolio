# Dr. Kuladeep Lankipalli — Netlify + Turso

Complete standalone Next.js project, migrated from ChatGPT Sites/Cloudflare.
Includes the portfolio, public Owner Studio demo, protected live Owner Studio,
photo management, collections, and server-side Groq chatbot.

## Requirements
Node.js 22.13 or later, a Turso database, and a Netlify account.

## Environment variables
Copy `.env.example` to `.env.local` for local development. Set the same variables
in Netlify under Project configuration > Environment variables for build and
function/runtime use. Never use a `NEXT_PUBLIC_` prefix for these secrets.

- TURSO_DATABASE_URL — your supplied database URL
- TURSO_AUTH_TOKEN — a Turso database token with read/write permissions
- GROQ_API_KEY — your server-side Groq key
- OWNER_USERNAME — owner username (defaults to kuladeep)
- OWNER_INITIAL_PASSWORD_HASH — PBKDF2 hash generated with `node scripts/hash-password.mjs`; set OWNER_SETUP_PASSWORD locally for that one command and remove it afterward. Store only the resulting hash in Netlify secrets.

Credentials are intentionally excluded from this ZIP. Use a newly issued Turso
token for production if the original token was shared in a conversation.

## Local setup
```
npm install
npm run db:init
npm run dev
```
Open http://localhost:3000. Sign in at `/login`. Manage the live portfolio at
`/admin`. Share `/studio-demo` with friends: its edits are session-only.

`npm run db:init` creates the tables and imports missing records from
`data-migration.json`. It is idempotent and never overwrites existing Turso rows.
The snapshot includes current published content and full saved website settings
exported from the original site on 7 October 2026. Existing bundled photos are
included in `public/`; no R2 uploaded-photo references were present in this export.

## Deploy to Netlify
This is a server-rendered app: do not deploy only a static folder or drag the
source ZIP into the static-file uploader.

1. Extract the ZIP and push this folder to your own GitHub/GitLab repository.
2. In Netlify, choose Add new project > Import an existing project, then select
   the repository.
3. Set the five environment variables above before deploying.
4. The included netlify.toml uses `npm run db:init && npm run build` and `.next`.
   Netlify detects Next.js and applies its adapter automatically.
5. Deploy and open the returned `https://<site-name>.netlify.app` URL.
6. Portfolio: `/`; owner login: `/login`; Owner Studio: `/admin`; public demo:
   `/studio-demo`. A custom domain can be configured later in Netlify.

Alternatively, after authenticating the Netlify CLI, run:
```
npx netlify-cli login
npx netlify-cli deploy --build --prod
```
Set project environment variables first. A Netlify account or an authenticated
Netlify session is required to publish; this ZIP alone does not create hosting.

## Persistence and uploads
Turso stores settings, blog/story/testimonial/video/photo records, chat rate-limit
counters, and image bytes in an `images` table. This version does not require
Cloudflare D1/R2 or ChatGPT identity headers. Future uploads are resized to at
most 1600 px and compressed to WebP in the browser where supported. The server
accepts validated JPEG/PNG/WebP up to 3 MB after compression to keep Netlify
function requests small. Photos consume database storage; object storage is a
better option if the photo collection grows substantially.

Chat history is not stored. Messages are sent to Groq for responses; only rate
counters are persisted. The model and clinic knowledge are in the app source.

## Owner security
Password login issues an opaque, HttpOnly, SameSite=Strict cookie, with Secure
cookies in production. Owner APIs enforce cookie authentication and same-origin
write requests. Login attempts are rate limited in Turso. The public studio demo
cannot modify live content. Owner Studio → Account lets the owner change the password. Password changes revoke previous sessions. Password hashes and session records use separate private tables, never the public settings API.

## Checks
```
npm test
npx tsc --noEmit
npm run build
```

## Verified migration status
The supplied Turso database was initialized and verified: 6 settings rows and
1 content row. The original ChatGPT Sites deployment is unchanged and still
uses its original D1/R2 storage until you publish this replacement on Netlify.

## Official deployment references
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/
- https://docs.turso.tech/sdk/http/reference

Verified live HTTP checks against Turso: portfolio 200, public content API 200,
public demo 200, anonymous owner API/write requests 401, owner login 303,
and authenticated owner API 200. Five automated transport/security tests and
the Next.js production build passed. Netlify deployment has not been completed. Configure the environment variables
and deploy this project from your Netlify account.
