# Orbit

Orbit is a project management system with a shared API, web app, Android app, and PostgreSQL database.

## Local Development

Use the bundled workspace scripts from the repository root:

```bash
pnpm install
docker compose up -d db
pnpm typecheck
pnpm lint
```

The local Postgres container is exposed on host port `55432` to avoid conflicts with other local databases.

Use this local development database URL:

```text
DATABASE_URL=postgresql://orbit:orbit@localhost:55432/orbit?schema=public
```

CI uses its own PostgreSQL service and sets its own `DATABASE_URL` pointing at `localhost:5432`.

## Seed Data

Phase 1 seeds two test users:

- `demo@orbit.test` / `StrongTestPassword123!`
- `other@orbit.test` / `StrongTestPassword123!`

The seed creates 3 projects and 15 varied tasks, including overdue and completed items.
