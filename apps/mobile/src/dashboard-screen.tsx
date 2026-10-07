import { OrbitApiError, type OrbitClient } from "@orbit/api-client";
import type {
  ProjectDto,
  ProjectStatus,
  TaskDto,
  TaskPriority,
  TaskStatus,
  UserDto,
} from "@orbit/shared";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import {
  Alert,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { pickNextTask, todayDateOnly, userTimeZone } from "./dashboard-logic";
import { dashboardStyles as styles } from "./dashboard-styles";

type Props = {
  client: OrbitClient;
  isOffline: boolean;
  onLogout: () => void;
  signingOut: boolean;
  user: UserDto;
};
type Tab = "dashboard" | "projects" | "tasks";
type Sheet = "project" | "task";
type DateTarget = "projectStart" | "projectEnd" | "taskDue";
type ProjectForm = {
  description: string;
  endDate: string;
  name: string;
  startDate: string;
  status: ProjectStatus;
};
type TaskForm = {
  description: string;
  dueDate: string;
  name: string;
  priority: TaskPriority;
  status: TaskStatus;
};
type DatePickerState = { target: DateTarget; value: Date };

const emptyProject: ProjectForm = {
  description: "",
  endDate: "",
  name: "",
  startDate: "",
  status: "NOT_STARTED",
};
const emptyTask: TaskForm = {
  description: "",
  dueDate: "",
  name: "",
  priority: "MEDIUM",
  status: "PENDING",
};
const projectStatuses: ProjectStatus[] = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];
const taskStatuses: TaskStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];
const priorities: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];
const topInset = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
const scrollBottomPadding = 176;
const taskPageSize = 10;

function label(value: string): string {
  return value.replace("_", " ").toLowerCase();
}

function optional(value: string) {
  return value.trim() || undefined;
}

function percent(value: number | null | undefined) {
  return `${value ?? 0}%`;
}

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function dateFromValue(value: string) {
  return isRealDate(value) ? new Date(`${value}T00:00:00.000Z`) : new Date();
}

function apiMessage(error: unknown, fallback: string) {
  if (error instanceof OrbitApiError) {
    return error.message;
  }
  return fallback;
}

function validateProjectForm(form: ProjectForm) {
  if (!form.name.trim()) {
    return "Project name is required.";
  }
  if (form.startDate && !isRealDate(form.startDate)) {
    return "Start date must be valid.";
  }
  if (form.endDate && !isRealDate(form.endDate)) {
    return "End date must be valid.";
  }
  if (form.startDate && form.endDate && form.endDate < form.startDate) {
    return "End date cannot be before start date.";
  }
  return undefined;
}

function validateTaskForm(form: TaskForm, projectId: string | undefined) {
  if (!projectId) {
    return "Select a project before creating a task.";
  }
  if (!form.name.trim()) {
    return "Task name is required.";
  }
  if (form.dueDate && !isRealDate(form.dueDate)) {
    return "Due date must be valid.";
  }
  return undefined;
}

export function DashboardScreen({ client, isOffline, onLogout, signingOut, user }: Props) {
  const queryClient = useQueryClient();
  const timezone = userTimeZone();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [sheet, setSheet] = useState<Sheet | undefined>();
  const [projectSearch, setProjectSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus | "">("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority | "">("");
  const [taskPage, setTaskPage] = useState(1);
  const [detailSearch, setDetailSearch] = useState("");
  const [detailStatus, setDetailStatus] = useState<TaskStatus | "">("");
  const [detailPriority, setDetailPriority] = useState<TaskPriority | "">("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [detailProjectId, setDetailProjectId] = useState<string | undefined>();
  const [taskFormProjectId, setTaskFormProjectId] = useState<string | undefined>();
  const [editingProjectId, setEditingProjectId] = useState<string | undefined>();
  const [editingTaskId, setEditingTaskId] = useState<string | undefined>();
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProject);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTask);
  const [projectFormError, setProjectFormError] = useState<string | undefined>();
  const [taskFormError, setTaskFormError] = useState<string | undefined>();
  const [datePicker, setDatePicker] = useState<DatePickerState | undefined>();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", timezone],
    queryFn: () => client.dashboard({ timezone }),
  });
  const projectQuery = useQuery({
    queryKey: ["projects", projectSearch],
    queryFn: () => client.listProjects({ page: 1, pageSize: 50, search: optional(projectSearch) }),
  });

  const projects = projectQuery.data?.items ?? [];

  const dashboardTasksQuery = useQuery({
    queryKey: ["tasks", "dashboard", timezone],
    queryFn: () => client.listTasks({ page: 1, pageSize: 50, timezone }),
  });

  const taskQuery = useQuery({
    queryKey: [
      "tasks",
      selectedProjectId,
      taskSearch,
      taskStatus,
      taskPriority,
      taskPage,
      timezone,
    ],
    queryFn: () =>
      client.listTasks({
        page: taskPage,
        pageSize: taskPageSize,
        priority: taskPriority || undefined,
        projectId: selectedProjectId,
        search: optional(taskSearch),
        status: taskStatus || undefined,
        timezone,
      }),
  });

  const projectDetailTasksQuery = useQuery({
    enabled: Boolean(detailProjectId),
    queryKey: [
      "projectDetailTasks",
      detailProjectId,
      detailSearch,
      detailStatus,
      detailPriority,
      timezone,
    ],
    queryFn: () =>
      client.listTasks({
        order: "asc",
        page: 1,
        pageSize: 100,
        priority: detailPriority || undefined,
        projectId: detailProjectId,
        search: optional(detailSearch),
        sort: "dueDate",
        status: detailStatus || undefined,
        timezone,
      }),
  });

  const tasks = taskQuery.data?.items ?? [];
  const dashboardTasks = dashboardTasksQuery.data?.items ?? [];
  const refreshing =
    dashboardQuery.isFetching ||
    dashboardTasksQuery.isFetching ||
    projectQuery.isFetching ||
    projectDetailTasksQuery.isFetching ||
    taskQuery.isFetching;

  function refreshAll() {
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["projectDetailTasks"] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }

  function updateTaskSearch(value: string) {
    setTaskSearch(value);
    setTaskPage(1);
  }

  function updateTaskStatus(value: TaskStatus | "") {
    setTaskStatus(value);
    setTaskPage(1);
  }

  function updateTaskPriority(value: TaskPriority | "") {
    setTaskPriority(value);
    setTaskPage(1);
  }

  function updateTaskProject(id: string | undefined) {
    setSelectedProjectId(id);
    setTaskPage(1);
  }

  function openProjectDetail(projectId: string) {
    setDetailProjectId(projectId);
    setDetailSearch("");
    setDetailStatus("");
    setDetailPriority("");
  }

  function openProjectSheet() {
    setProjectForm(emptyProject);
    setEditingProjectId(undefined);
    setSheet("project");
  }

  function openTaskSheet() {
    setEditingTaskId(undefined);
    setTaskForm(emptyTask);
    setTaskFormProjectId(undefined);
    setTaskFormError(undefined);
    setSheet("task");
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextCollapsed = event.nativeEvent.contentOffset.y > 28;
    if (nextCollapsed !== headerCollapsed) {
      setHeaderCollapsed(nextCollapsed);
    }
  }

  function resetProjectSheet() {
    setEditingProjectId(undefined);
    setProjectForm(emptyProject);
    setProjectFormError(undefined);
    setSheet(undefined);
  }

  function resetTaskSheet() {
    setEditingTaskId(undefined);
    setTaskForm(emptyTask);
    setTaskFormProjectId(undefined);
    setTaskFormError(undefined);
    setSheet(undefined);
  }

  function openDatePicker(target: DateTarget) {
    const currentValue =
      target === "projectStart"
        ? projectForm.startDate
        : target === "projectEnd"
          ? projectForm.endDate
          : taskForm.dueDate;
    setDatePicker({ target, value: dateFromValue(currentValue) });
  }

  function handleDateChange(event: DateTimePickerEvent, value?: Date) {
    if (event.type === "dismissed" || !value || !datePicker) {
      setDatePicker(undefined);
      return;
    }
    const nextValue = formatDate(value);
    if (datePicker.target === "projectStart") {
      setProjectForm({ ...projectForm, startDate: nextValue });
      setProjectFormError(undefined);
    }
    if (datePicker.target === "projectEnd") {
      setProjectForm({ ...projectForm, endDate: nextValue });
      setProjectFormError(undefined);
    }
    if (datePicker.target === "taskDue") {
      setTaskForm({ ...taskForm, dueDate: nextValue });
      setTaskFormError(undefined);
    }
    setDatePicker(undefined);
  }

  const saveProject = useMutation({
    mutationFn: () => {
      const payload = {
        description: optional(projectForm.description),
        endDate: optional(projectForm.endDate),
        name: projectForm.name,
        startDate: optional(projectForm.startDate),
        status: projectForm.status,
      };
      return editingProjectId
        ? client.updateProject(editingProjectId, payload)
        : client.createProject(payload);
    },
    onSuccess: (project) => {
      setDetailProjectId(project.id);
      resetProjectSheet();
      refreshAll();
    },
  });

  const deleteProject = useMutation({
    mutationFn: (projectId: string) => client.deleteProject(projectId),
    onSuccess: () => {
      setDetailProjectId(undefined);
      refreshAll();
    },
  });

  const saveTask = useMutation({
    mutationFn: () => {
      const validationError = validateTaskForm(taskForm, taskFormProjectId);
      if (validationError) {
        throw new Error(validationError);
      }
      const payload = {
        description: optional(taskForm.description),
        dueDate: optional(taskForm.dueDate),
        name: taskForm.name,
        priority: taskForm.priority,
        status: taskForm.status,
      };
      return editingTaskId
        ? client.updateTask(editingTaskId, payload)
        : client.createTask({ ...payload, projectId: taskFormProjectId ?? "" });
    },
    onError: (error) => setTaskFormError(apiMessage(error, "Task could not be saved.")),
    onSuccess: () => {
      resetTaskSheet();
      refreshAll();
    },
  });

  const completeTask = useMutation({
    mutationFn: (task: TaskDto) =>
      task.status === "COMPLETED"
        ? client.updateTask(task.id, {
            description: task.description ?? undefined,
            status: "PENDING",
          })
        : client.completeTask(task.id),
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const keys = [
        ["tasks", selectedProjectId, taskSearch, taskStatus, taskPriority, taskPage],
        ["tasks", "dashboard"],
        ["projectDetailTasks", detailProjectId],
      ] as const;
      const previous = keys.map((key) => ({
        data: queryClient.getQueryData<{ items: TaskDto[]; meta: unknown }>(key),
        key,
      }));
      for (const item of previous) {
        if (!item.data) {
          continue;
        }
        queryClient.setQueryData(item.key, {
          ...item.data,
          items: item.data.items.map((existing) =>
            existing.id === task.id
              ? {
                  ...existing,
                  completedAt: task.status === "COMPLETED" ? undefined : new Date().toISOString(),
                  status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED",
                }
              : existing
          ),
        });
      }
      return { previous };
    },
    onError: (_error, _task, context) => {
      for (const item of context?.previous ?? []) {
        queryClient.setQueryData(item.key, item.data);
      }
    },
    onSettled: refreshAll,
  });

  const deleteTask = useMutation({
    mutationFn: (taskId: string) => client.deleteTask(taskId),
    onSuccess: refreshAll,
  });

  function submitProject() {
    const validationError = validateProjectForm(projectForm);
    if (validationError) {
      setProjectFormError(validationError);
      return;
    }
    saveProject.mutate();
  }

  function submitTask() {
    const validationError = validateTaskForm(taskForm, taskFormProjectId);
    if (validationError) {
      setTaskFormError(validationError);
      return;
    }
    saveTask.mutate();
  }

  function editProject(project: ProjectDto) {
    setEditingProjectId(project.id);
    setProjectForm({
      description: project.description ?? "",
      endDate: project.endDate ?? "",
      name: project.name,
      startDate: project.startDate ?? "",
      status: project.status,
    });
    setProjectFormError(undefined);
    setSheet("project");
  }

  function editTask(task: TaskDto) {
    setEditingTaskId(task.id);
    setTaskFormProjectId(task.projectId);
    setTaskForm({
      description: task.description ?? "",
      dueDate: task.dueDate ?? "",
      name: task.name,
      priority: task.priority,
      status: task.status,
    });
    setTaskFormError(undefined);
    setSheet("task");
  }

  function confirmProjectDelete(project: ProjectDto) {
    Alert.alert("Delete project?", `Delete "${project.name}" and its tasks?`, [
      { style: "cancel", text: "Cancel" },
      { onPress: () => deleteProject.mutate(project.id), style: "destructive", text: "Delete" },
    ]);
  }

  function confirmTaskDelete(task: TaskDto) {
    Alert.alert("Delete task?", `Delete "${task.name}"?`, [
      { style: "cancel", text: "Cancel" },
      { onPress: () => deleteTask.mutate(task.id), style: "destructive", text: "Delete" },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeRoot}>
      <View style={[styles.root, { paddingTop: topInset }]}>
        <CompactHeader
          collapsed={headerCollapsed}
          email={user.email}
          menuOpen={profileMenuOpen}
          onLogout={onLogout}
          onToggleMenu={() => setProfileMenuOpen((open) => !open)}
          signingOut={signingOut}
        />
        <ScrollView
          contentContainerStyle={[styles.screen, { paddingBottom: scrollBottomPadding }]}
          onScroll={handleScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}
          scrollEventThrottle={16}
        >
          {isOffline ? <Notice tone="warning" text="You are offline." /> : null}
          {dashboardQuery.error ? (
            <RetryNotice text="Dashboard failed to load." onRetry={refreshAll} />
          ) : null}
          {tab === "dashboard" ? (
            <DashboardView
              data={dashboardQuery.data}
              projects={projects}
              tasks={dashboardTasks}
              onOpenProjects={() => setTab("projects")}
              onOpenTasks={() => setTab("tasks")}
              timezone={timezone}
            />
          ) : null}
          {tab === "projects" ? (
            detailProjectId ? (
              <ProjectDetailView
                hasError={Boolean(projectDetailTasksQuery.error)}
                isLoading={projectDetailTasksQuery.isLoading}
                onBack={() => setDetailProjectId(undefined)}
                onComplete={(task) => completeTask.mutate(task)}
                onDelete={confirmTaskDelete}
                onEdit={editTask}
                onPriority={setDetailPriority}
                onRetry={refreshAll}
                onSearch={setDetailSearch}
                onStatus={setDetailStatus}
                priority={detailPriority}
                project={projects.find((project) => project.id === detailProjectId)}
                search={detailSearch}
                status={detailStatus}
                tasks={projectDetailTasksQuery.data?.items ?? []}
              />
            ) : (
              <ProjectsView
                isLoading={projectQuery.isLoading}
                onDelete={confirmProjectDelete}
                onEdit={editProject}
                onOpen={(project) => openProjectDetail(project.id)}
                onSearch={setProjectSearch}
                projects={projects}
                search={projectSearch}
                total={projectQuery.data?.meta.total ?? 0}
              />
            )
          ) : null}
          {tab === "tasks" ? (
            <TasksView
              hasError={Boolean(taskQuery.error)}
              isLoading={taskQuery.isLoading}
              onComplete={(task) => completeTask.mutate(task)}
              onDelete={confirmTaskDelete}
              onEdit={editTask}
              onNextPage={() => setTaskPage((page) => page + 1)}
              onPrevPage={() => setTaskPage((page) => Math.max(1, page - 1))}
              onPriority={updateTaskPriority}
              onProject={updateTaskProject}
              onRetry={refreshAll}
              onSearch={updateTaskSearch}
              onStatus={updateTaskStatus}
              page={taskPage}
              pageSize={taskPageSize}
              priority={taskPriority}
              projects={projects}
              projectId={selectedProjectId}
              search={taskSearch}
              status={taskStatus}
              tasks={tasks}
              total={taskQuery.data?.meta.total ?? 0}
            />
          ) : null}
        </ScrollView>
        <BottomNav active={tab} onChange={setTab} />
        {!sheet && tab === "projects" && !detailProjectId ? (
          <FloatingButton onPress={openProjectSheet} />
        ) : null}
        {!sheet && tab === "tasks" ? <FloatingButton onPress={openTaskSheet} /> : null}
        {sheet ? (
          <BottomSheet onClose={sheet === "project" ? resetProjectSheet : resetTaskSheet}>
            {sheet === "project" ? (
              <ProjectFormView
                form={projectForm}
                formError={
                  projectFormError ??
                  (saveProject.error
                    ? apiMessage(saveProject.error, "Project could not be saved.")
                    : undefined)
                }
                isEditing={Boolean(editingProjectId)}
                isSaving={saveProject.isPending}
                onCancel={resetProjectSheet}
                onChange={(form) => {
                  setProjectForm(form);
                  setProjectFormError(undefined);
                }}
                onShowDatePicker={openDatePicker}
                onSubmit={submitProject}
              />
            ) : (
              <TaskFormView
                disabled={!taskFormProjectId}
                form={taskForm}
                formError={taskFormError}
                isEditing={Boolean(editingTaskId)}
                isSaving={saveTask.isPending}
                onCancel={resetTaskSheet}
                onChange={(form) => {
                  setTaskForm(form);
                  setTaskFormError(undefined);
                }}
                onShowDatePicker={openDatePicker}
                onSubmit={submitTask}
                projects={projects}
                selectedProjectId={taskFormProjectId}
                onSelectProject={setTaskFormProjectId}
              />
            )}
          </BottomSheet>
        ) : null}
        {datePicker ? (
          <DateTimePicker
            display="default"
            mode="date"
            onChange={handleDateChange}
            value={datePicker.value}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function CompactHeader({
  collapsed,
  email,
  menuOpen,
  onLogout,
  onToggleMenu,
  signingOut,
}: {
  collapsed: boolean;
  email: string;
  menuOpen: boolean;
  onLogout: () => void;
  onToggleMenu: () => void;
  signingOut: boolean;
}) {
  return (
    <View style={[styles.appHeader, collapsed ? styles.appHeaderCollapsed : null]}>
      <View style={styles.headerBrand}>
        <Text style={styles.headerTitle}>Orbit</Text>
        {!collapsed ? <Text style={styles.headerSubtitle}>{email}</Text> : null}
      </View>
      <TouchableOpacity onPress={onToggleMenu} style={styles.avatarButton}>
        <Text style={styles.avatarText}>{email.slice(0, 1).toUpperCase()}</Text>
      </TouchableOpacity>
      {menuOpen ? (
        <View style={styles.profileMenu}>
          <View style={styles.profileMenuHeader}>
            <Text style={styles.profileMenuTitle}>Profile</Text>
            <Text style={styles.profileMenuEmail}>{email}</Text>
          </View>
          <TouchableOpacity style={styles.profileMenuItem}>
            <Text style={styles.profileMenuItemText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={signingOut} onPress={onLogout} style={styles.profileMenuItem}>
            <Text style={styles.profileMenuDanger}>
              {signingOut ? "Signing out..." : "Sign out"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function DashboardView({
  data,
  onOpenProjects,
  onOpenTasks,
  projects,
  tasks,
  timezone,
}: {
  data:
    | {
        completedTasks: number;
        inProgressTasks: number;
        overdueTasks: number;
        pendingTasks: number;
        projectsInProgress: number;
        totalProjects: number;
        totalTasks: number;
      }
    | undefined;
  onOpenProjects: () => void;
  onOpenTasks: () => void;
  projects: ProjectDto[];
  tasks: TaskDto[];
  timezone: string;
}) {
  const nextTask = pickNextTask(tasks, todayDateOnly(timezone));
  const activeProject = projects.find((project) => project.status === "IN_PROGRESS") ?? projects[0];

  return (
    <View style={styles.stack}>
      <View style={styles.metricsGrid}>
        <Metric label="Total Projects" tone="accent" value={data?.totalProjects ?? 0} />
        <Metric label="Total Tasks" tone="primary" value={data?.totalTasks ?? 0} />
        <Metric label="Completed Tasks" tone="success" value={data?.completedTasks ?? 0} />
        <Metric label="Pending Tasks" tone="primary" value={data?.pendingTasks ?? 0} />
        <Metric label="In Progress Tasks" tone="accent" value={data?.inProgressTasks ?? 0} />
        <Metric label="Projects In Progress" tone="accent" value={data?.projectsInProgress ?? 0} />
        <Metric label="Overdue" tone="warning" value={data?.overdueTasks ?? 0} />
      </View>
      <View style={styles.panel}>
        <SectionTitle meta={`${data?.pendingTasks ?? 0} pending`} title="Today" />
        <View style={styles.focusCard}>
          <Text style={styles.focusLabel}>Next task</Text>
          <Text style={styles.focusTitle}>{nextTask?.name ?? "No task selected"}</Text>
          <Text style={styles.focusMeta}>
            {nextTask ? `${label(nextTask.priority)} priority` : "Create a task to begin."}
          </Text>
        </View>
        <View style={styles.quickActions}>
          <ActionButton label="Projects" onPress={onOpenProjects} secondary />
          <ActionButton label="Tasks" onPress={onOpenTasks} />
        </View>
      </View>
      <View style={styles.panel}>
        <SectionTitle
          meta={`${data?.projectsInProgress ?? 0} in progress`}
          title="Active project"
        />
        {activeProject ? (
          <ProjectCard project={activeProject} />
        ) : (
          <EmptyState text="No projects yet" />
        )}
      </View>
    </View>
  );
}

function ProjectsView({
  isLoading,
  onDelete,
  onEdit,
  onOpen,
  onSearch,
  projects,
  search,
  total,
}: {
  isLoading: boolean;
  onDelete: (project: ProjectDto) => void;
  onEdit: (project: ProjectDto) => void;
  onOpen: (project: ProjectDto) => void;
  onSearch: (value: string) => void;
  projects: ProjectDto[];
  search: string;
  total: number;
}) {
  return (
    <View style={styles.stack}>
      <SectionTitle meta={`${total} total`} title="Projects" />
      <SearchBox onClear={() => onSearch("")} onSearch={onSearch} value={search} />
      <View style={styles.list}>
        {isLoading ? <EmptyState text="Loading projects..." /> : null}
        {!isLoading && projects.length === 0 ? <EmptyState text="No projects yet" /> : null}
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            onDelete={() => onDelete(project)}
            onEdit={() => onEdit(project)}
            onSelect={() => onOpen(project)}
            project={project}
          />
        ))}
      </View>
    </View>
  );
}

function ProjectDetailView({
  hasError,
  isLoading,
  onBack,
  onComplete,
  onDelete,
  onEdit,
  onPriority,
  onRetry,
  onSearch,
  onStatus,
  priority,
  project,
  search,
  status,
  tasks,
}: {
  hasError: boolean;
  isLoading: boolean;
  onBack: () => void;
  onComplete: (task: TaskDto) => void;
  onDelete: (task: TaskDto) => void;
  onEdit: (task: TaskDto) => void;
  onPriority: (priority: TaskPriority | "") => void;
  onRetry: () => void;
  onSearch: (value: string) => void;
  onStatus: (status: TaskStatus | "") => void;
  priority: TaskPriority | "";
  project: ProjectDto | undefined;
  search: string;
  status: TaskStatus | "";
  tasks: TaskDto[];
}) {
  const filtered = Boolean(search || status || priority);
  return (
    <View style={styles.stack}>
      <View style={styles.sectionTitle}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.muted}>{tasks.length} tasks</Text>
      </View>
      {project ? <ProjectCard project={project} /> : <EmptyState text="Project not found" />}
      <SectionTitle meta="Project tasks" title="Tasks" />
      <SearchBox onClear={() => onSearch("")} onSearch={onSearch} value={search} />
      <FilterBar
        onPriority={onPriority}
        onProject={() => undefined}
        onStatus={onStatus}
        priority={priority}
        projects={[]}
        projectId={project?.id}
        showProjectFilter={false}
        status={status}
      />
      <View style={styles.list}>
        {isLoading ? <EmptyState text="Loading tasks..." /> : null}
        {hasError ? (
          <RetryState text="Could not load this project's tasks." onRetry={onRetry} />
        ) : null}
        {!isLoading && !hasError && tasks.length === 0 ? (
          <EmptyState text={filtered ? "No tasks match your filters" : "No tasks yet"} />
        ) : null}
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            onComplete={() => onComplete(task)}
            onDelete={() => onDelete(task)}
            onEdit={() => onEdit(task)}
            task={task}
          />
        ))}
      </View>
    </View>
  );
}

function TasksView({
  hasError,
  isLoading,
  onComplete,
  onDelete,
  onEdit,
  onNextPage,
  onPrevPage,
  onPriority,
  onProject,
  onRetry,
  onSearch,
  onStatus,
  page,
  pageSize,
  priority,
  projects,
  projectId,
  search,
  status,
  tasks,
  total,
}: {
  hasError: boolean;
  isLoading: boolean;
  onComplete: (task: TaskDto) => void;
  onDelete: (task: TaskDto) => void;
  onEdit: (task: TaskDto) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onPriority: (priority: TaskPriority | "") => void;
  onProject: (id: string | undefined) => void;
  onRetry: () => void;
  onSearch: (value: string) => void;
  onStatus: (status: TaskStatus | "") => void;
  page: number;
  pageSize: number;
  priority: TaskPriority | "";
  projects: ProjectDto[];
  projectId: string | undefined;
  search: string;
  status: TaskStatus | "";
  tasks: TaskDto[];
  total: number;
}) {
  const filtered = Boolean(search || status || priority || projectId);
  const hasNextPage = page * pageSize < total;

  return (
    <View style={styles.stack}>
      <SectionTitle meta={`${total} total`} title="Tasks" />
      <SearchBox onClear={() => onSearch("")} onSearch={onSearch} value={search} />
      <FilterBar
        onPriority={onPriority}
        onProject={onProject}
        onStatus={onStatus}
        priority={priority}
        projects={projects}
        projectId={projectId}
        status={status}
      />
      <View style={styles.list}>
        {isLoading ? <EmptyState text="Loading tasks..." /> : null}
        {hasError ? <RetryState text="Could not load tasks." onRetry={onRetry} /> : null}
        {!isLoading && !hasError && tasks.length === 0 ? (
          <EmptyState text={filtered ? "No tasks match your filters" : "No tasks yet"} />
        ) : null}
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            onComplete={() => onComplete(task)}
            onDelete={() => onDelete(task)}
            onEdit={() => onEdit(task)}
            task={task}
          />
        ))}
      </View>
      {total > pageSize ? (
        <View style={styles.pagination}>
          <TouchableOpacity
            disabled={page === 1}
            onPress={onPrevPage}
            style={[styles.pageButton, page === 1 ? styles.disabledAction : null]}
          >
            <Text style={styles.pageButtonText}>Previous</Text>
          </TouchableOpacity>
          <Text style={styles.pageText}>Page {page}</Text>
          <TouchableOpacity
            disabled={!hasNextPage}
            onPress={onNextPage}
            style={[styles.pageButton, !hasNextPage ? styles.disabledAction : null]}
          >
            <Text style={styles.pageButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

function FilterBar({
  onPriority,
  onProject,
  onStatus,
  priority,
  projects,
  projectId,
  showProjectFilter = true,
  status,
}: {
  onPriority: (priority: TaskPriority | "") => void;
  onProject: (id: string | undefined) => void;
  onStatus: (status: TaskStatus | "") => void;
  priority: TaskPriority | "";
  projects: ProjectDto[];
  projectId: string | undefined;
  showProjectFilter?: boolean;
  status: TaskStatus | "";
}) {
  return (
    <View style={styles.filterPanel}>
      <ChipRow
        items={[
          { label: "All", value: "" },
          ...taskStatuses.map((item) => ({ label: label(item), value: item })),
        ]}
        onChange={onStatus}
        value={status}
      />
      <ChipRow
        items={[
          { label: "All", value: "" },
          ...priorities.map((item) => ({ label: label(item), value: item })),
        ]}
        onChange={onPriority}
        value={priority}
      />
      {showProjectFilter ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          <Chip active={!projectId} label="All projects" onPress={() => onProject(undefined)} />
          {projects.map((project) => (
            <Chip
              active={projectId === project.id}
              key={project.id}
              label={project.name}
              onPress={() => onProject(project.id)}
            />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function ChipRow<T extends string>({
  items,
  onChange,
  value,
}: {
  items: { label: string; value: T }[];
  onChange: (value: T) => void;
  value: T;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {items.map((item) => (
        <Chip
          active={value === item.value}
          key={item.value || "all"}
          label={item.label}
          onPress={() => onChange(item.value)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({
  active,
  label: chipLabel,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.projectChoice, active ? styles.projectChoiceActive : null]}
    >
      <Text style={[styles.projectChoiceText, active ? styles.projectChoiceTextActive : null]}>
        {chipLabel}
      </Text>
    </TouchableOpacity>
  );
}

function Metric({
  label: metricLabel,
  tone,
  value,
}: {
  label: string;
  tone: "accent" | "primary" | "success" | "warning";
  value: number;
}) {
  return (
    <View style={[styles.metric, styles[`${tone}Metric`]]}>
      <Text style={styles.metricLabel}>{metricLabel}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function SectionTitle({ meta, title }: { meta: string; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.sectionHeading}>{title}</Text>
      <Text style={styles.muted}>{meta}</Text>
    </View>
  );
}

function SearchBox({
  onClear,
  onSearch,
  value,
}: {
  onClear: () => void;
  onSearch: (value: string) => void;
  value: string;
}) {
  return (
    <View style={styles.searchRow}>
      <TextInput
        onChangeText={onSearch}
        placeholder="Search"
        placeholderTextColor="#8A94B2"
        style={[styles.input, styles.flex]}
        value={value}
      />
      <TouchableOpacity onPress={onClear} style={styles.clearButton}>
        <Text style={styles.clearText}>Clear</Text>
      </TouchableOpacity>
    </View>
  );
}

function Segment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segments}>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          onPress={() => onChange(option)}
          style={[styles.segment, value === option ? styles.segmentActive : null]}
        >
          <Text style={[styles.segmentText, value === option ? styles.segmentTextActive : null]}>
            {label(option)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ProjectPicker({
  onSelect,
  projects,
  selectedId,
}: {
  onSelect: (id: string) => void;
  projects: ProjectDto[];
  selectedId: string | undefined;
}) {
  if (projects.length === 0) {
    return <EmptyState text="Create a project before adding tasks." />;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
    >
      {projects.map((project) => (
        <Chip
          active={selectedId === project.id}
          key={project.id}
          label={project.name}
          onPress={() => onSelect(project.id)}
        />
      ))}
    </ScrollView>
  );
}

function DateButton({
  disabled,
  label: buttonLabel,
  onClear,
  onPress,
  value,
}: {
  disabled?: boolean;
  label: string;
  onClear: () => void;
  onPress: () => void;
  value: string;
}) {
  return (
    <View style={styles.dateField}>
      <TouchableOpacity disabled={disabled} onPress={onPress} style={styles.dateButton}>
        <Text style={styles.dateLabel}>{buttonLabel}</Text>
        <Text style={value ? styles.dateValue : styles.datePlaceholder}>
          {value || "Choose date"}
        </Text>
      </TouchableOpacity>
      {value ? (
        <TouchableOpacity disabled={disabled} onPress={onClear} style={styles.dateClear}>
          <Text style={styles.dateClearText}>Clear</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ProjectFormView({
  form,
  formError,
  isEditing,
  isSaving,
  onCancel,
  onChange,
  onShowDatePicker,
  onSubmit,
}: {
  form: ProjectForm;
  formError: string | undefined;
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (form: ProjectForm) => void;
  onShowDatePicker: (target: DateTarget) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.form}>
      <SectionTitle meta={isEditing ? "Edit project" : "New project"} title="Project" />
      <TextInput
        onChangeText={(name) => onChange({ ...form, name })}
        placeholder="Project name"
        placeholderTextColor="#8A94B2"
        style={styles.input}
        value={form.name}
      />
      <TextInput
        multiline
        onChangeText={(description) => onChange({ ...form, description })}
        placeholder="Description"
        placeholderTextColor="#8A94B2"
        style={[styles.input, styles.textArea]}
        value={form.description}
      />
      <Segment
        options={projectStatuses}
        value={form.status}
        onChange={(status) => onChange({ ...form, status })}
      />
      <View style={styles.dateStack}>
        <DateButton
          label="Start date"
          onClear={() => onChange({ ...form, startDate: "" })}
          onPress={() => onShowDatePicker("projectStart")}
          value={form.startDate}
        />
        <DateButton
          label="End date"
          onClear={() => onChange({ ...form, endDate: "" })}
          onPress={() => onShowDatePicker("projectEnd")}
          value={form.endDate}
        />
      </View>
      {formError ? <Text style={styles.fieldError}>{formError}</Text> : null}
      <View style={styles.row}>
        <ActionButton
          disabled={isSaving || !form.name.trim()}
          label={isSaving ? "Saving..." : isEditing ? "Update" : "Create"}
          onPress={onSubmit}
        />
        <ActionButton label="Cancel" onPress={onCancel} secondary />
      </View>
    </View>
  );
}

function TaskFormView({
  disabled,
  form,
  formError,
  isEditing,
  isSaving,
  onCancel,
  onChange,
  onSelectProject,
  onShowDatePicker,
  onSubmit,
  projects,
  selectedProjectId,
}: {
  disabled: boolean;
  form: TaskForm;
  formError: string | undefined;
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (form: TaskForm) => void;
  onSelectProject: (id: string) => void;
  onShowDatePicker: (target: DateTarget) => void;
  onSubmit: () => void;
  projects: ProjectDto[];
  selectedProjectId: string | undefined;
}) {
  return (
    <View style={styles.form}>
      <SectionTitle meta={isEditing ? "Edit task" : "New task"} title="Task" />
      <Text style={styles.formLabel}>Project</Text>
      <ProjectPicker
        onSelect={onSelectProject}
        projects={projects}
        selectedId={selectedProjectId}
      />
      <TextInput
        editable={!disabled}
        onChangeText={(name) => onChange({ ...form, name })}
        placeholder="Task name"
        placeholderTextColor="#8A94B2"
        style={[styles.input, disabled ? styles.inputDisabled : null]}
        value={form.name}
      />
      <Text style={[styles.formHint, !disabled ? styles.formHintHidden : null]}>
        Choose a project to enable the task name field.
      </Text>
      <TextInput
        editable={!disabled}
        multiline
        onChangeText={(description) => onChange({ ...form, description })}
        placeholder="Description"
        placeholderTextColor="#8A94B2"
        style={[styles.input, styles.textArea]}
        value={form.description}
      />
      <Segment
        options={taskStatuses}
        value={form.status}
        onChange={(status) => onChange({ ...form, status })}
      />
      <Segment
        options={priorities}
        value={form.priority}
        onChange={(priority) => onChange({ ...form, priority })}
      />
      <DateButton
        disabled={disabled}
        label="Due date"
        onClear={() => onChange({ ...form, dueDate: "" })}
        onPress={() => onShowDatePicker("taskDue")}
        value={form.dueDate}
      />
      {formError ? <Text style={styles.fieldError}>{formError}</Text> : null}
      <View style={styles.row}>
        <ActionButton
          disabled={disabled || isSaving || !form.name.trim()}
          label={isSaving ? "Saving..." : isEditing ? "Update" : "Create"}
          onPress={onSubmit}
        />
        <ActionButton label="Cancel" onPress={onCancel} secondary />
      </View>
    </View>
  );
}

function ProjectCard({
  onDelete,
  onEdit,
  onSelect,
  project,
}: {
  onDelete?: () => void;
  onEdit?: () => void;
  onSelect?: () => void;
  project: ProjectDto;
}) {
  const content = (
    <View style={styles.item}>
      <View style={styles.itemTop}>
        <View style={styles.flex}>
          <Text style={styles.itemTitle}>{project.name}</Text>
          <Text style={styles.itemMeta}>{label(project.status)}</Text>
        </View>
        <Text style={styles.progressText}>{percent(project.progressPercent)}</Text>
      </View>
      {project.description ? <Text style={styles.itemBody}>{project.description}</Text> : null}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(project.progressPercent ?? 0, 100)}%` },
          ]}
        />
      </View>
      {onEdit && onDelete ? (
        <View style={styles.inlineActions}>
          <InlineButton label="Edit" onPress={onEdit} />
          <InlineButton danger label="Delete" onPress={onDelete} />
        </View>
      ) : null}
    </View>
  );

  return onSelect ? <TouchableOpacity onPress={onSelect}>{content}</TouchableOpacity> : content;
}

function TaskRow({
  onComplete,
  onDelete,
  onEdit,
  task,
}: {
  onComplete: () => void;
  onDelete: () => void;
  onEdit: () => void;
  task: TaskDto;
}) {
  const complete = task.status === "COMPLETED";
  return (
    <TouchableOpacity onPress={onEdit} style={[styles.item, complete ? styles.completeItem : null]}>
      <View style={styles.itemTop}>
        <TouchableOpacity onPress={onComplete} style={styles.checkbox}>
          <Text style={styles.checkboxText}>{complete ? "✓" : ""}</Text>
        </TouchableOpacity>
        <View style={styles.flex}>
          <Text style={styles.itemTitle}>{task.name}</Text>
          <Text style={styles.itemMeta}>{label(task.status)}</Text>
          {task.dueDate ? <Text style={styles.itemMeta}>Due {task.dueDate}</Text> : null}
        </View>
        <Text style={[styles.badge, task.priority === "HIGH" ? styles.hotBadge : null]}>
          {label(task.priority)}
        </Text>
      </View>
      {task.description ? <Text style={styles.itemBody}>{task.description}</Text> : null}
      <View style={styles.inlineActions}>
        <InlineButton label="Details" onPress={onEdit} />
        <InlineButton danger label="Delete" onPress={onDelete} />
      </View>
    </TouchableOpacity>
  );
}

function ActionButton({
  disabled,
  label: buttonLabel,
  onPress,
  secondary,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        secondary ? styles.secondaryAction : styles.primaryAction,
        disabled ? styles.disabledAction : null,
      ]}
    >
      <Text style={styles.actionText}>{buttonLabel}</Text>
    </TouchableOpacity>
  );
}

function InlineButton({
  danger,
  label: buttonLabel,
  onPress,
}: {
  danger?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.inlineButton}>
      <Text style={[styles.inlineText, danger ? styles.inlineDanger : null]}>{buttonLabel}</Text>
    </TouchableOpacity>
  );
}

function FloatingButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.fab}>
      <Text style={styles.fabText}>+</Text>
    </TouchableOpacity>
  );
}

function BottomSheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <View style={styles.sheetBackdrop}>
      <TouchableOpacity onPress={onClose} style={styles.sheetScrim} />
      <View style={styles.sheet}>{children}</View>
    </View>
  );
}

function Notice({ text, tone }: { text: string; tone: "danger" | "warning" }) {
  return <Text style={[styles.notice, styles[tone]]}>{text}</Text>;
}

function RetryNotice({ onRetry, text }: { onRetry: () => void; text: string }) {
  return (
    <View style={[styles.noticeBox, styles.dangerBox]}>
      <Text style={styles.noticeTitle}>{text}</Text>
      <ActionButton label="Retry" onPress={onRetry} secondary />
    </View>
  );
}

function RetryState({ onRetry, text }: { onRetry: () => void; text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{text}</Text>
      <Text style={styles.emptyText}>Check your connection and try again.</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{text}</Text>
      <Text style={styles.emptyText}>Pull to refresh or adjust your filters.</Text>
    </View>
  );
}

function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const tabs: { label: string; value: Tab }[] = [
    { label: "Dashboard", value: "dashboard" },
    { label: "Projects", value: "projects" },
    { label: "Tasks", value: "tasks" },
  ];

  return (
    <View style={styles.bottomNav}>
      {tabs.map((item) => (
        <TouchableOpacity
          key={item.value}
          onPress={() => onChange(item.value)}
          style={[styles.navItem, active === item.value ? styles.navItemActive : null]}
        >
          <Text style={[styles.navText, active === item.value ? styles.navTextActive : null]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
