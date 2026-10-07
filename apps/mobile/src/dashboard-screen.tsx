import type { OrbitClient } from "@orbit/api-client";
import type {
  ProjectDto,
  ProjectStatus,
  TaskDto,
  TaskPriority,
  TaskStatus,
  UserDto,
} from "@orbit/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

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

function label(value: string): string {
  return value.replace("_", " ").toLowerCase();
}

function optional(value: string) {
  return value.trim() || undefined;
}

function percent(value: number | null | undefined) {
  return `${value ?? 0}%`;
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

  const dashboardQuery = useQuery({ queryKey: ["dashboard"], queryFn: () => client.dashboard() });
  const projectQuery = useQuery({
    queryKey: ["projects", projectSearch],
    queryFn: () => client.listProjects({ page: 1, pageSize: 50, search: optional(projectSearch) }),
  });

  const projects = projectQuery.data?.items ?? [];
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0],
    [projects, selectedProjectId]
  );

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
  const refreshing = dashboardQuery.isFetching || projectQuery.isFetching || taskQuery.isFetching;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.screen}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}
      >
        <HeroHeader email={user.email} onLogout={onLogout} signingOut={signingOut} />
        {isOffline ? (
          <Notice tone="warning" text="Offline mode. Changes need a connection." />
        ) : null}
        {dashboardQuery.error ? <Notice tone="danger" text="Dashboard failed to load." /> : null}

        {tab === "dashboard" ? (
          <DashboardView
            data={dashboardQuery.data}
            projects={projects}
            tasks={tasks}
            onOpenProjects={() => setTab("projects")}
            onOpenTasks={() => setTab("tasks")}
          />
        ) : null}

        {tab === "projects" ? (
          <ProjectsView
            activeId={selectedProject?.id}
            editingProjectId={editingProjectId}
            form={projectForm}
            isLoading={projectQuery.isLoading}
            isSaving={saveProject.isPending}
            onChangeForm={setProjectForm}
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
            }}
            onSave={() => saveProject.mutate()}
            onSearch={setProjectSearch}
            onSelect={setSelectedProjectId}
            projects={projects}
            search={projectSearch}
            total={projectQuery.data?.meta.total ?? 0}
          />
        ) : null}

        {tab === "tasks" ? (
          <TasksView
            editingTaskId={editingTaskId}
            form={taskForm}
            isLoading={taskQuery.isLoading}
            isSaving={saveTask.isPending}
            onChangeForm={setTaskForm}
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
            }}
            onSave={() => saveTask.mutate()}
            onSearch={setTaskSearch}
            selectedProject={selectedProject}
            search={taskSearch}
            tasks={tasks}
          />
        ) : null}
      </ScrollView>
      <BottomNav active={tab} onChange={setTab} />
    </View>
  );
}

function HeroHeader({
  email,
  onLogout,
  signingOut,
}: {
  email: string;
  onLogout: () => void;
  signingOut: boolean;
}) {
  return (
    <View style={styles.hero}>
      <View style={styles.heroTop}>
        <View style={styles.heroIdentity}>
          <Text style={styles.eyebrow}>Orbit</Text>
          <Text style={styles.title}>Command center</Text>
        </View>
      </View>
      <View style={styles.heroMetaRow}>
        <View style={styles.heroIdentity}>
          <Text style={styles.heroCopy}>{email}</Text>
          <Text style={styles.heroSubcopy}>
            Plan the work, track the motion, keep the day calm.
          </Text>
        </View>
        <TouchableOpacity disabled={signingOut} onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>{signingOut ? "Leaving..." : "Sign out"}</Text>
        </TouchableOpacity>
      </View>
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
        <Metric label="Projects" tone="accent" value={data?.totalProjects ?? 0} />
        <Metric label="Tasks" tone="primary" value={data?.totalTasks ?? 0} />
        <Metric label="Done" tone="success" value={data?.completedTasks ?? 0} />
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
          isEditing={Boolean(props.editingProjectId)}
          isSaving={props.isSaving}
          onCancel={props.onResetForm}
          onChange={props.onChangeForm}
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
  search: string;
  selectedProject: ProjectDto | undefined;
  tasks: TaskDto[];
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.panel}>
        <SectionTitle meta={props.selectedProject?.name ?? "Select a project"} title="Tasks" />
        <SearchBox onClear={props.onClearSearch} onSearch={props.onSearch} value={props.search} />
        <TaskFormView
          disabled={!props.selectedProject}
          form={props.form}
          isEditing={Boolean(props.editingTaskId)}
          isSaving={props.isSaving}
          onCancel={props.onResetForm}
          onChange={props.onChangeForm}
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

function ProjectFormView({
  form,
  isEditing,
  isSaving,
  onCancel,
  onChange,
  onSubmit,
}: {
  form: ProjectForm;
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (form: ProjectForm) => void;
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
        <TextInput
          onChangeText={(startDate) => onChange({ ...form, startDate })}
          placeholder="Start YYYY-MM-DD"
          placeholderTextColor="#8A94B2"
          style={styles.input}
          value={form.startDate}
        />
        <TextInput
          onChangeText={(endDate) => onChange({ ...form, endDate })}
          placeholder="End YYYY-MM-DD"
          placeholderTextColor="#8A94B2"
          style={styles.input}
          value={form.endDate}
        />
      </View>
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
  isEditing,
  isSaving,
  onCancel,
  onChange,
  onSubmit,
}: {
  disabled: boolean;
  form: TaskForm;
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (form: TaskForm) => void;
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
      <TextInput
        editable={!disabled}
        onChangeText={(dueDate) => onChange({ ...form, dueDate })}
        placeholder="Due YYYY-MM-DD"
        placeholderTextColor="#8A94B2"
        style={styles.input}
        value={form.dueDate}
      />
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
