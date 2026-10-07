# Orbit API

All success responses use:

```json
{ "success": true, "data": {} }
```

List responses add `meta`:

```json
{ "success": true, "data": [], "meta": { "page": 1, "pageSize": 20, "total": 0 } }
```

Errors use:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body is invalid",
    "requestId": "req-id"
  }
}
```

Common error codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `TOKEN_EXPIRED`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL`.

## Health

### `GET /health`

Auth: no.

Response:

```json
{ "success": true, "data": { "status": "ok", "service": "api" } }
```

### `GET /ready`

Auth: no. Checks database connectivity.

Response:

```json
{ "success": true, "data": { "status": "ready", "service": "api" } }
```

## Auth

### `POST /api/auth/register`

Auth: no.

Request:

```json
{ "email": "demo@orbit.test", "name": "Demo User", "password": "StrongTestPassword123!" }
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "demo@orbit.test",
      "name": "Demo User",
      "createdAt": "2026-10-08T00:00:00.000Z"
    },
    "tokens": { "accessToken": "jwt", "refreshToken": "opaque", "expiresInSeconds": 900 }
  }
}
```

### `POST /api/auth/login`

Auth: no.

Request:

```json
{ "email": "demo@orbit.test", "password": "StrongTestPassword123!" }
```

Response: same as register.

### `POST /api/auth/refresh`

Auth: refresh token body or cookie.

Request:

```json
{ "refreshToken": "opaque" }
```

Response: same as register.

### `POST /api/auth/logout`

Auth: optional refresh token body or cookie.

Request:

```json
{ "refreshToken": "opaque" }
```

Response:

```json
{ "success": true, "data": { "loggedOut": true } }
```

### `GET /api/auth/me`

Auth: bearer token.

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "demo@orbit.test",
    "name": "Demo User",
    "createdAt": "2026-10-08T00:00:00.000Z"
  }
}
```

## Dashboard

### `GET /api/dashboard?timezone=Asia/Kolkata`

Auth: bearer token.

Response:

```json
{
  "success": true,
  "data": {
    "totalProjects": 2,
    "totalTasks": 10,
    "completedTasks": 2,
    "pendingTasks": 6,
    "inProgressTasks": 2,
    "overdueTasks": 2,
    "projectsInProgress": 1
  }
}
```

## Projects

### `GET /api/projects`

Auth: bearer token.

Query: `search`, `status`, `sort`, `order`, `page`, `pageSize`.

### `POST /api/projects`

Auth: bearer token.

Request:

```json
{
  "name": "Web Launch",
  "description": "Ship the web app.",
  "status": "IN_PROGRESS",
  "startDate": "2026-10-01",
  "endDate": "2026-10-31"
}
```

### `GET /api/projects/:id`

Auth: bearer token. Returns 404 for projects owned by another user.

### `PATCH /api/projects/:id`

Auth: bearer token.

Request:

```json
{ "name": "Updated name", "status": "COMPLETED" }
```

### `DELETE /api/projects/:id`

Auth: bearer token. Deletes the project and cascades its tasks.

Response:

```json
{ "success": true, "data": { "deleted": true } }
```

## Tasks

### `GET /api/tasks`

Auth: bearer token.

Query: `projectId`, `search`, `status`, `priority`, `dueBefore`, `overdue`, `timezone`, `sort`, `order`, `page`, `pageSize`.

### `GET /api/projects/:projectId/tasks`

Auth: bearer token. Lists tasks in one project.

### `POST /api/tasks`

Auth: bearer token.

Request:

```json
{
  "projectId": "uuid",
  "name": "Design offline banner",
  "description": "Friendly offline state.",
  "priority": "HIGH",
  "status": "IN_PROGRESS",
  "dueDate": "2026-10-07"
}
```

### `GET /api/tasks/:id`

Auth: bearer token. Returns 404 for tasks owned by another user.

### `PUT /api/tasks/:id`

Auth: bearer token.

Request:

```json
{
  "name": "Design offline banner",
  "description": "Friendly offline state.",
  "priority": "HIGH",
  "status": "COMPLETED",
  "dueDate": "2026-10-07"
}
```

### `PATCH /api/tasks/:id`

Auth: bearer token. Compatibility alias for task updates.

### `POST /api/tasks/:id/complete`

Auth: bearer token.

Response: updated task DTO.

### `DELETE /api/tasks/:id`

Auth: bearer token.

Response:

```json
{ "success": true, "data": { "deleted": true } }
```
