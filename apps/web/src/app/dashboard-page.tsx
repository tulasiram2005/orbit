"use client";

import type { OrbitClient } from "@orbit/api-client";
import type { UserDto } from "@orbit/shared";
import { useQuery } from "@tanstack/react-query";

import { WorkspacePanel } from "./workspace-panel";

type DashboardPageProps = {
  client: OrbitClient;
  onLogout: () => void;
  user: UserDto;
  signingOut: boolean;
};

const dashboardCards = [
  ["totalProjects", "Projects"],
  ["totalTasks", "Tasks"],
  ["completedTasks", "Completed"],
  ["pendingTasks", "Pending"],
  ["inProgressTasks", "In progress"],
  ["projectsInProgress", "Projects in progress"],
  ["overdueTasks", "Overdue"],
] as const;

function userTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function DashboardPage({ client, onLogout, signingOut, user }: DashboardPageProps) {
  const timezone = userTimeZone();
  const dashboardQuery = useQuery({
    queryKey: ["dashboard", timezone],
    queryFn: () => client.dashboard({ timezone }),
  });

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Orbit</p>
          <h1>Dashboard</h1>
          <p className="muted">Signed in as {user.email}</p>
        </div>
        <button
          className="button secondary compact"
          disabled={signingOut}
          onClick={onLogout}
          type="button"
        >
          {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </header>

      {dashboardQuery.isLoading ? <div className="status neutral">Loading dashboard...</div> : null}
      {dashboardQuery.error ? <div className="status danger">Dashboard could not load.</div> : null}

      <section className="metric-grid" aria-label="Dashboard metrics">
        {dashboardCards.map(([key, label]) => (
          <article className="metric" key={key}>
            <span>{label}</span>
            <strong>{dashboardQuery.data?.[key] ?? 0}</strong>
          </article>
        ))}
      </section>

      <WorkspacePanel client={client} timezone={timezone} />
    </main>
  );
}
