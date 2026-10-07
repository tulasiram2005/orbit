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
import { useMemo, useState } from "react";
import {
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

import { dashboardStyles as styles } from "./dashboard-styles";

type Props = {
  client: OrbitClient;
  isOffline: boolean;
  onLogout: () => void;
  signingOut: boolean;
  user: UserDto;
};

type Tab = "dashboard" | "projects" | "tasks";
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
type DateTarget = "projectStart" | "projectEnd" | "taskDue";
type DatePickerState = {
  target: DateTarget;
  value: Date;
};

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
const tabBarHeight = 72;
const scrollBottomPadding = tabBarHeight + 16;
const topInset = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

function label(value: string): string {
  return value.replace("_", " ").toLowerCase();
}

function optional(value: string) {
  return value.trim() || undefined;
}

function percent(value: number | null | undefined) {
  return `${value ?? 0}%`;
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isRealDate(value: string) {
  if (!isDateOnly(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value;
}

function dateFromValue(value: string) {
  return isRealDate(value) ? new Date(`${value}T00:00:00.000Z`) : new Date();
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function apiMessage(error: unknown, fallback: string) {
  if (error instanceof OrbitApiError) {
    return error.message;
  }

  return fallback;
}

function validateProjectForm(form: ProjectForm) {
  const startDate = form.startDate.trim();
  const endDate = form.endDate.trim();

  if (!form.name.trim()) {
    return "Project name is required.";
  }
  if (startDate && !isRealDate(startDate)) {
    return "Start date must be a real YYYY-MM-DD date.";
  }
  if (endDate && !isRealDate(endDate)) {
    return "End date must be a real YYYY-MM-DD date.";
  }
  if (startDate && endDate && endDate < startDate) {
    return "End date cannot be before the start date.";
  }

  return undefined;
}

function validateTaskForm(form: TaskForm, hasProject: boolean) {
  const dueDate = form.dueDate.trim();

  if (!hasProject) {
    return "Select a project before creating a task.";
  }
  if (!form.name.trim()) {
    return "Task name is required.";
  }
  if (dueDate && !isRealDate(dueDate)) {
    return "Due date must be a real YYYY-MM-DD date.";
  }

  return undefined;
}

export function DashboardScreen({ client, isOffline, onLogout, signingOut, user }: Props) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [projectSearch, setProjectSearch] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [editingProjectId, setEditingProjectId] = useState<string | undefined>();
  const [editingTaskId, setEditingTaskId] = useState<string | undefined>();
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProject);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTask);
  const [projectFormError, setProjectFormError] = useState<string | undefined>();
  const [taskFormError, setTaskFormError] = useState<string | undefined>();
  const [datePicker, setDatePicker] = useState<DatePickerState | undefined>();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: () => client.dashboard() });
  const projectQuery = useQuery({
    queryKey: ["projects", projectSearch],
    queryFn: () => client.listProjects({ page: 1, pageSize: 50, search: optional(projectSearch) }),
  });

  const projects = projectQuery.data?.items ?? [];
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const dashboardTasksQuery = useQuery({
    queryKey: ["tasks", "dashboard"],
    queryFn: () => client.listTasks({ page: 1, pageSize: 50 }),
  });

  const taskQuery = useQuery({
    enabled: Boolean(selectedProject?.id),
    queryKey: ["tasks", selectedProject?.id, taskSearch],
    queryFn: () =>
      client.listProjectTasks(selectedProject?.id ?? "", {
        page: 1,
        pageSize: 50,
        search: optional(taskSearch),
      }),
  });

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextCollapsed = event.nativeEvent.contentOffset.y > 28;
    if (nextCollapsed !== headerCollapsed) {
      setHeaderCollapsed(nextCollapsed);
    }
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

  function refreshAll() {
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
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
      setEditingProjectId(undefined);
      setProjectForm(emptyProject);
      setProjectFormError(undefined);
      setSelectedProjectId(project.id);
      setTab("tasks");
      refreshAll();
    },
  });

  const deleteProject = useMutation({
    mutationFn: (projectId: string) => client.deleteProject(projectId),
    onSuccess: () => {
      setSelectedProjectId(undefined);
      refreshAll();
    },
  });

  const saveTask = useMutation({
    mutationFn: () => {
      if (!selectedProject) {
        throw new Error("Select a project first.");
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
        : client.createTask({ ...payload, projectId: selectedProject.id });
    },
    onSuccess: () => {
      setEditingTaskId(undefined);
      setTaskForm(emptyTask);
      setTaskFormError(undefined);
      refreshAll();
    },
  });

  const completeTask = useMutation({
    mutationFn: (taskId: string) => client.completeTask(taskId),
    onSuccess: refreshAll,
  });

  const deleteTask = useMutation({
    mutationFn: (taskId: string) => client.deleteTask(taskId),
    onSuccess: refreshAll,
  });

  const tasks = taskQuery.data?.items ?? [];
  const dashboardTasks = dashboardTasksQuery.data?.items ?? [];
  const refreshing =
    dashboardQuery.isFetching ||
    dashboardTasksQuery.isFetching ||
    projectQuery.isFetching ||
    taskQuery.isFetching;

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
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}
        >
          {isOffline ? (
            <Notice tone="warning" text="Offline mode. Changes need a connection." />
          ) : null}
          {dashboardQuery.error ? <Notice tone="danger" text="Dashboard failed to load." /> : null}

          {tab === "dashboard" ? (
            <DashboardView
              data={dashboardQuery.data}
              projects={projects}
              tasks={dashboardTasks}
              onOpenProjects={() => setTab("projects")}
              onOpenTasks={() => setTab("tasks")}
            />
          ) : null}

          {tab === "projects" ? (
            <ProjectsView
              activeId={selectedProject?.id}
              editingProjectId={editingProjectId}
              form={projectForm}
              formError={
                projectFormError ??
                (saveProject.error
                  ? apiMessage(saveProject.error, "Project could not be saved.")
                  : undefined)
              }
              isLoading={projectQuery.isLoading}
              isSaving={saveProject.isPending}
              onChangeForm={(form) => {
                setProjectForm(form);
                setProjectFormError(undefined);
              }}
              onClearSearch={() => setProjectSearch("")}
              onDelete={(id) => deleteProject.mutate(id)}
              onEdit={(project) => {
                setEditingProjectId(project.id);
                setProjectForm({
                  description: project.description ?? "",
                  endDate: project.endDate ?? "",
                  name: project.name,
                  startDate: project.startDate ?? "",
                  status: project.status,
                });
              }}
              onResetForm={() => {
                setEditingProjectId(undefined);
                setProjectForm(emptyProject);
                setProjectFormError(undefined);
              }}
              onSave={() => {
                const validationError = validateProjectForm(projectForm);
                if (validationError) {
                  setProjectFormError(validationError);
                  return;
                }
                saveProject.mutate();
              }}
              onSearch={setProjectSearch}
              onSelect={setSelectedProjectId}
              onShowDatePicker={openDatePicker}
              projects={projects}
              search={projectSearch}
              total={projectQuery.data?.meta.total ?? 0}
            />
          ) : null}

          {tab === "tasks" ? (
            <TasksView
              editingTaskId={editingTaskId}
              form={taskForm}
              formError={
                taskFormError ??
                (saveTask.error
                  ? apiMessage(saveTask.error, "Task could not be saved.")
                  : undefined)
              }
              isLoading={taskQuery.isLoading}
              isSaving={saveTask.isPending}
              onChangeForm={(form) => {
                setTaskForm(form);
                setTaskFormError(undefined);
              }}
              onClearSearch={() => setTaskSearch("")}
              onComplete={(id) => completeTask.mutate(id)}
              onDelete={(id) => deleteTask.mutate(id)}
              onEdit={(task) => {
                setEditingTaskId(task.id);
                setTaskForm({
                  description: task.description ?? "",
                  dueDate: task.dueDate ?? "",
                  name: task.name,
                  priority: task.priority,
                  status: task.status,
                });
              }}
              onResetForm={() => {
                setEditingTaskId(undefined);
                setTaskForm(emptyTask);
                setTaskFormError(undefined);
              }}
              onSave={() => {
                const validationError = validateTaskForm(taskForm, Boolean(selectedProject));
                if (validationError) {
                  setTaskFormError(validationError);
                  return;
                }
                saveTask.mutate();
              }}
              onSearch={setTaskSearch}
              onSelectProject={setSelectedProjectId}
              onShowDatePicker={openDatePicker}
              projects={projects}
              selectedProject={selectedProject}
              search={taskSearch}
              tasks={tasks}
            />
          ) : null}
        </ScrollView>
        <BottomNav active={tab} onChange={setTab} />
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
  const initial = email.slice(0, 1).toUpperCase();

  return (
    <View style={[styles.appHeader, collapsed ? styles.appHeaderCollapsed : null]}>
      <View style={styles.headerBrand}>
        <Text style={styles.headerTitle}>Orbit</Text>
        {!collapsed ? <Text style={styles.headerSubtitle}>{email}</Text> : null}
      </View>
      <TouchableOpacity
        accessibilityLabel="Open profile menu"
        onPress={onToggleMenu}
        style={styles.avatarButton}
      >
        <Text style={styles.avatarText}>{initial}</Text>
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
}: {
  data:
    | {
        completedTasks: number;
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
}) {
  const nextTask = tasks.find((task) => task.status !== "COMPLETED") ?? tasks[0];
  const activeProject = projects.find((project) => project.status === "IN_PROGRESS") ?? projects[0];

  return (
    <View style={styles.stack}>
      <View style={styles.metricsGrid}>
        <Metric label="Total Projects" tone="accent" value={data?.totalProjects ?? 0} />
        <Metric label="Total Tasks" tone="primary" value={data?.totalTasks ?? 0} />
        <Metric label="Completed Tasks" tone="success" value={data?.completedTasks ?? 0} />
        <Metric label="Pending Tasks" tone="primary" value={data?.pendingTasks ?? 0} />
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
          <ProjectCard active onSelect={onOpenTasks} project={activeProject} />
        ) : (
          <EmptyState text="Create your first project to see progress here." />
        )}
      </View>
    </View>
  );
}

function ProjectsView(props: {
  activeId: string | undefined;
  editingProjectId: string | undefined;
  form: ProjectForm;
  formError: string | undefined;
  isLoading: boolean;
  isSaving: boolean;
  onChangeForm: (form: ProjectForm) => void;
  onClearSearch: () => void;
  onDelete: (id: string) => void;
  onEdit: (project: ProjectDto) => void;
  onResetForm: () => void;
  onSave: () => void;
  onSearch: (value: string) => void;
  onSelect: (id: string) => void;
  onShowDatePicker: (target: DateTarget) => void;
  projects: ProjectDto[];
  search: string;
  total: number;
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.panel}>
        <SectionTitle meta={`${props.total} total`} title="Projects" />
        <SearchBox onClear={props.onClearSearch} onSearch={props.onSearch} value={props.search} />
        <ProjectFormView
          form={props.form}
          formError={props.formError}
          isEditing={Boolean(props.editingProjectId)}
          isSaving={props.isSaving}
          onCancel={props.onResetForm}
          onChange={props.onChangeForm}
          onShowDatePicker={props.onShowDatePicker}
          onSubmit={props.onSave}
        />
      </View>
      <View style={styles.list}>
        {props.isLoading ? <EmptyState text="Loading projects..." /> : null}
        {!props.isLoading && props.projects.length === 0 ? (
          <EmptyState text="No projects match this view." />
        ) : null}
        {props.projects.map((project) => (
          <ProjectCard
            active={props.activeId === project.id}
            key={project.id}
            onDelete={() => props.onDelete(project.id)}
            onEdit={() => props.onEdit(project)}
            onSelect={() => props.onSelect(project.id)}
            project={project}
          />
        ))}
      </View>
    </View>
  );
}

function TasksView(props: {
  editingTaskId: string | undefined;
  form: TaskForm;
  formError: string | undefined;
  isLoading: boolean;
  isSaving: boolean;
  onChangeForm: (form: TaskForm) => void;
  onClearSearch: () => void;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: TaskDto) => void;
  onResetForm: () => void;
  onSave: () => void;
  onSearch: (value: string) => void;
  onSelectProject: (id: string) => void;
  onShowDatePicker: (target: DateTarget) => void;
  projects: ProjectDto[];
  search: string;
  selectedProject: ProjectDto | undefined;
  tasks: TaskDto[];
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.panel}>
        <SectionTitle
          meta={props.selectedProject ? "Project selected" : "Select project"}
          title="Tasks"
        />
        <ProjectSelector
          onSelect={props.onSelectProject}
          projects={props.projects}
          selectedId={props.selectedProject?.id}
        />
        <SearchBox onClear={props.onClearSearch} onSearch={props.onSearch} value={props.search} />
        <TaskFormView
          disabled={!props.selectedProject}
          form={props.form}
          formError={props.formError}
          isEditing={Boolean(props.editingTaskId)}
          isSaving={props.isSaving}
          onCancel={props.onResetForm}
          onChange={props.onChangeForm}
          onShowDatePicker={props.onShowDatePicker}
          onSubmit={props.onSave}
        />
      </View>
      <View style={styles.list}>
        {props.isLoading ? <EmptyState text="Loading tasks..." /> : null}
        {!props.isLoading && props.tasks.length === 0 ? (
          <EmptyState text="No tasks match this project." />
        ) : null}
        {props.tasks.map((task) => (
          <TaskCard
            key={task.id}
            onComplete={() => props.onComplete(task.id)}
            onDelete={() => props.onDelete(task.id)}
            onEdit={() => props.onEdit(task)}
            task={task}
          />
        ))}
      </View>
    </View>
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

function ProjectSelector({
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
    <View style={styles.projectSelector}>
      {projects.map((project) => (
        <TouchableOpacity
          key={project.id}
          onPress={() => onSelect(project.id)}
          style={[
            styles.projectChoice,
            selectedId === project.id ? styles.projectChoiceActive : null,
          ]}
        >
          <Text
            style={[
              styles.projectChoiceText,
              selectedId === project.id ? styles.projectChoiceTextActive : null,
            ]}
          >
            {project.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
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
        {isEditing ? <ActionButton label="Cancel" onPress={onCancel} secondary /> : null}
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
  onShowDatePicker,
  onSubmit,
}: {
  disabled: boolean;
  form: TaskForm;
  formError: string | undefined;
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (form: TaskForm) => void;
  onShowDatePicker: (target: DateTarget) => void;
  onSubmit: () => void;
}) {
  return (
    <View style={styles.form}>
      <TextInput
        editable={!disabled}
        onChangeText={(name) => onChange({ ...form, name })}
        placeholder={disabled ? "Select a project first" : "Task name"}
        placeholderTextColor="#8A94B2"
        style={styles.input}
        value={form.name}
      />
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
        {isEditing ? <ActionButton label="Cancel" onPress={onCancel} secondary /> : null}
      </View>
    </View>
  );
}

function ProjectCard({
  active,
  onDelete,
  onEdit,
  onSelect,
  project,
}: {
  active?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onSelect: () => void;
  project: ProjectDto;
}) {
  return (
    <TouchableOpacity onPress={onSelect} style={[styles.item, active ? styles.activeItem : null]}>
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
    </TouchableOpacity>
  );
}

function TaskCard({
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
    <View style={[styles.item, complete ? styles.completeItem : null]}>
      <View style={styles.itemTop}>
        <View style={styles.flex}>
          <Text style={styles.itemTitle}>{task.name}</Text>
          <Text style={styles.itemMeta}>
            {label(task.status)} / {label(task.priority)}
          </Text>
        </View>
        <Text style={[styles.badge, task.priority === "HIGH" ? styles.hotBadge : null]}>
          {label(task.priority)}
        </Text>
      </View>
      {task.description ? <Text style={styles.itemBody}>{task.description}</Text> : null}
      {task.dueDate ? <Text style={styles.itemMeta}>Due {task.dueDate}</Text> : null}
      <View style={styles.inlineActions}>
        {!complete ? <InlineButton label="Complete" onPress={onComplete} /> : null}
        <InlineButton label="Edit" onPress={onEdit} />
        <InlineButton danger label="Delete" onPress={onDelete} />
      </View>
    </View>
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

function Notice({ text, tone }: { text: string; tone: "danger" | "warning" }) {
  return <Text style={[styles.notice, styles[tone]]}>{text}</Text>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{text}</Text>
      <Text style={styles.emptyText}>Pull to refresh or create something new.</Text>
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
