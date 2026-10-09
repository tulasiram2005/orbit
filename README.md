# Orbit

Orbit is a project management system with one Express API, one PostgreSQL database, a Next.js web app, and an Expo Android app. Web and mobile use the same typed API client and the same account data.

## Architecture

```mermaid
flowchart LR
  Mobile[Expo mobile app] --> Client[packages/api-client]
  Web[Next.js web app] --> Client
  Client --> API[Express REST API]
  API --> Prisma[Prisma]
  Prisma --> DB[(PostgreSQL)]
  Shared[packages/shared Zod schemas + DTOs] --> API
  Shared --> Client
  Shared --> Web
  Shared --> Mobile
```

## Apps

| App        | Path                  | Purpose                                           |
| ---------- | --------------------- | ------------------------------------------------- |
| API        | `apps/api`            | Express, Prisma, auth, dashboard, projects, tasks |
| Web        | `apps/web`            | Next.js app for browser use                       |
| Mobile     | `apps/mobile`         | Expo React Native Android app                     |
| Shared     | `packages/shared`     | DTO types, Zod schemas, enums                     |
| API client | `packages/api-client` | Typed fetch client used by web and mobile         |

## Environment Variables

| Variable                         | App        | Required      | Notes                                                                |
| -------------------------------- | ---------- | ------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`                   | API        | yes           | PostgreSQL connection string                                         |
| `API_PORT`                       | API        | no            | Defaults to `4000`                                                   |
| `API_CORS_ORIGINS`               | API        | yes           | Comma-separated allow-list, never `*`                                |
| `JWT_ACCESS_SECRET`              | API        | yes           | At least 32 characters                                               |
| `JWT_REFRESH_SECRET`             | API        | yes           | At least 32 characters                                               |
| `NODE_ENV`                       | API        | no            | `development`, `test`, or `production`                               |
| `ORBIT_ALLOW_PRODUCTION_SEED`    | API        | seed only     | Must be `true` for production demo seed                              |
| `ORBIT_PRODUCTION_SEED_PASSWORD` | API        | seed only     | Password for fake production demo account                            |
| `API_URL`                        | Web        | yes in deploy | Server rewrite target for `/api/*`; browser calls same-origin `/api` |
| `WEB_API_URL`                    | Web deploy | no            | Backward-compatible alias for `API_URL`                              |
| `EXPO_PUBLIC_API_URL`            | Mobile     | yes           | API base URL baked into Expo builds                                  |

## Local Setup

```bash
pnpm install
docker compose up -d db
pnpm --filter api prisma generate
pnpm --filter api prisma migrate deploy
pnpm --filter api prisma db seed
```

Before starting locally, copy `.env.example` to `.env` at the repository root and `apps/api/.env.example` to `apps/api/.env` if you run the API from that directory. Set strong local JWT secrets and keep these files untracked.

Run the API:

```bash
pnpm --filter api dev
```

Run the web app:

```bash
pnpm --filter web dev
```

Run the mobile app against your local API:

```bash
EXPO_PUBLIC_API_URL="http://$(ipconfig getifaddr en0):4000" pnpm --filter mobile dev -- --clear
```

Demo users after local seed:

| Email              | Password                 |
| ------------------ | ------------------------ |
| `demo@orbit.test`  | `StrongTestPassword123!` |
| `other@orbit.test` | `StrongTestPassword123!` |

## Database

Local Postgres runs on host port `55432`.

```bash
docker compose up -d db
pnpm --filter api prisma migrate deploy
pnpm --filter api prisma db seed
```

For tests, use a separate database so demo data is not wiped:

```bash
docker compose exec -T db sh -lc 'createdb -U orbit orbit_test 2>/dev/null || true'
DATABASE_URL='postgresql://orbit:orbit@localhost:55432/orbit_test?schema=public' pnpm --filter api prisma migrate deploy
DATABASE_URL='postgresql://orbit:orbit@localhost:55432/orbit_test?schema=public' pnpm test
```

## Dashboard Definitions

- `Total Projects`: all projects owned by the user.
- `Total Tasks`: all tasks owned by the user.
- `Completed Tasks`: tasks where `status = COMPLETED`.
- `Pending Tasks`: tasks where `status = PENDING`.
- `In Progress Tasks`: tasks where `status = IN_PROGRESS`.
- `Projects In Progress`: projects where `status = IN_PROGRESS`.
- `Overdue`: tasks where `status != COMPLETED` and `dueDate < today` in the user's IANA timezone.

Web and mobile send `Intl.DateTimeFormat().resolvedOptions().timeZone` to dashboard and task-list requests. The API validates the timezone with Zod and falls back to UTC if it is missing or invalid. Dates are computed with Luxon.

## Mobile APK

The committed `apps/mobile/eas.json` already points at the deployed API URL. Build the preview APK with:

```bash
cd apps/mobile
npx --yes eas-cli build --profile preview --platform android
```

The `preview` profile produces an APK. Because this is an EAS preview/release-style build, the Expo Go developer overlay button is not part of the app.

## Deployment Notes

API deployment is prepared with `apps/api/Dockerfile` and `render.yaml`. The Docker command runs `prisma migrate deploy` before `node dist/server.js`.

The Render blueprint also defines the Next.js web service `orbit-web`. After syncing the blueprint, set the API service's `API_CORS_ORIGINS` to the exact generated web URL, for example `https://orbit-web.onrender.com`, then redeploy the API. The web service uses:

```text
API_URL=https://orbit-api-i42f.onrender.com
NEXT_PUBLIC_API_URL=https://orbit-api-i42f.onrender.com
```

For Vercel web deployment instead, create a project from this repository with the root directory at the repository root, set the framework to Next.js, and add:

```text
API_URL=https://your-api.example.com
```

The Next.js rewrite proxies `/api/*` to `API_URL`.

The web submission URL is the generated Render or Vercel URL; the repository intentionally does not hard-code a provider-generated hostname.

Free-tier hosts may cold start. The first request after inactivity can be slow; `/health` is cheap and `/ready` confirms database connectivity.

## Security Decisions

- Passwords are hashed with bcrypt.
- Refresh tokens are opaque and hashed in the database.
- Access tokens expire after 15 minutes.
- Auth endpoints are rate-limited.
- CORS uses an environment allow-list.
- Pino redacts `authorization`, `cookie`, `password`, refresh tokens, and set-cookie headers.
- All protected repository access is scoped by `userId`.
- Tasks include `user_id` and a composite foreign key to prevent cross-user project assignment.
- DTO mappers prevent returning raw database rows.

## Test Commands

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

For deployment smoke data only, run the guarded production seed after setting a fake account password:

```bash
ORBIT_ALLOW_PRODUCTION_SEED=true \
ORBIT_PRODUCTION_SEED_PASSWORD='replace-with-safe-demo-password' \
pnpm --filter api seed:production
```
