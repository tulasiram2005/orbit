# Orbit Database ER Diagram

Generated from `apps/api/prisma/schema.prisma` and the initial SQL migration.

```mermaid
erDiagram
  User {
    uuid id PK
    citext email UK
    varchar name
    text password_hash
    timestamptz created_at
    timestamptz updated_at
  }

  Project {
    uuid id PK "part of composite PK"
    uuid user_id PK, FK "part of composite PK"
    varchar name
    varchar description
    ProjectStatus status
    date start_date
    date end_date
    timestamptz created_at
    timestamptz updated_at
  }

  Task {
    uuid id PK
    uuid user_id FK
    uuid project_id FK
    varchar name
    varchar description
    TaskPriority priority
    TaskStatus status
    date due_date
    timestamptz completed_at
    timestamptz created_at
    timestamptz updated_at
  }

  RefreshToken {
    uuid id PK
    uuid user_id FK
    text token_hash UK
    uuid family_id
    timestamptz revoked_at
    timestamptz expires_at
    timestamptz created_at
  }

  AuditLog {
    uuid id PK
    uuid user_id FK
    varchar entity_type
    uuid entity_id
    AuditAction action
    jsonb diff
    timestamptz created_at
  }

  User ||--o{ Project : owns
  User ||--o{ Task : owns
  User ||--o{ RefreshToken : has
  User ||--o{ AuditLog : writes
  Project ||--o{ Task : contains
```

## Notes

- `users.email` uses `citext` for case-insensitive uniqueness.
- `projects` has a composite primary key on `(id, user_id)`.
- `tasks(project_id, user_id)` references `projects(id, user_id)` so tasks cannot cross account boundaries.
- `projects.end_date >= projects.start_date` is enforced by the initial SQL migration.
- Project and task names use `pg_trgm` GIN indexes for server-side search.
- `refresh_tokens.token_hash` stores only a hash of the opaque refresh token.
- Dashboard counts are derived from `projects` and `tasks` scoped by `user_id`.
- Overdue tasks are computed in the API using the request timezone and the rule `status != COMPLETED AND due_date < local today`.
