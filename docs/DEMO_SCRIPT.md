# Orbit 5-Minute Demo Script

## 0:00-0:30 Sign In

Open the deployed web URL and the installed Android APK. Sign in with:

- Email: `demo@orbit.test`
- Password: `StrongTestPassword123!`

Point out that the same account works on web and mobile because both use the same API and PostgreSQL database.

## 0:30-1:15 Dashboard

Show the dashboard cards:

- Total Projects
- Total Tasks
- Completed Tasks
- Pending Tasks
- In Progress Tasks
- Projects In Progress
- Overdue

Explain that pending means `status = PENDING`, and overdue means unfinished tasks with a due date before today in the user's timezone.

## 1:15-2:00 Projects

On the web, open Projects and search for a project. On mobile, tap the project card to open its detail screen and show its tasks.

Create a new project with a name, description, status, start date and end date. Edit it, then cancel a delete confirmation to show it is safe.

## 2:00-3:00 Tasks

Create a task on the web. Open Tasks on mobile, pull to refresh, and show the new task. Use search, status, priority and project filters.

Create a task from the bottom sheet. Pick a project, enter name and description, set status, priority and due date. Save it.

Open Details for an existing task. Edit name, description, status, priority and due date. Save it.

## 3:00-3:45 Completion and Delete

Tap the checkbox on a task to mark it completed. Explain the optimistic UI update and rollback behavior.

Tap Delete on a task and cancel the confirmation. Then delete a throwaway task and show the list refresh.

## 3:45-4:30 Offline and Session Handling

Turn on airplane mode. Pull to refresh and show the persistent "You are offline" banner plus Retry state.

Turn network back on and retry.

To show expired-session behavior, delete the stored token or wait for expiry, then reopen the app. The app returns to login and shows "Session expired. Please sign in again."

## 4:30-5:00 Security and Deployment

Mention:

- CORS is allow-listed.
- Passwords and refresh tokens are hashed.
- API routes are scoped by user ID.
- The preview APK uses `EXPO_PUBLIC_API_URL` and does not include the Expo Go developer overlay.
- Render runs `prisma migrate deploy` on API startup.
