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

export function DashboardScreen({ client, isOffline, onLogout, signingOut, user }: Props) {
  const queryClient = useQueryClient();
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

  const refreshing = dashboardQuery.isFetching || projectQuery.isFetching || taskQuery.isFetching;

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Orbit</Text>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.muted}>{user.email}</Text>
        </View>
        <TouchableOpacity disabled={signingOut} onPress={onLogout} style={styles.secondaryButton}>
          <Text style={styles.buttonText}>{signingOut ? "Signing out..." : "Sign out"}</Text>
        </TouchableOpacity>
      </View>

      {isOffline ? <Text style={[styles.notice, styles.warning]}>You are offline.</Text> : null}
      {dashboardQuery.error ? (
        <Text style={[styles.notice, styles.danger]}>Dashboard failed to load.</Text>
      ) : null}

      <View style={styles.metrics}>
        <Metric label="Projects" value={dashboardQuery.data?.totalProjects ?? 0} />
        <Metric label="Tasks" value={dashboardQuery.data?.totalTasks ?? 0} />
        <Metric label="Done" value={dashboardQuery.data?.completedTasks ?? 0} />
        <Metric label="Overdue" value={dashboardQuery.data?.overdueTasks ?? 0} />
      </View>

      <View style={styles.card}>
        <SectionTitle title="Projects" meta={`${projectQuery.data?.meta.total ?? 0} total`} />
        <TextInput
          onChangeText={setProjectSearch}
          placeholder="Search projects"
          placeholderTextColor="#8A94B2"
          style={styles.input}
          value={projectSearch}
        />
        <ProjectFormView
          form={projectForm}
          isEditing={Boolean(editingProjectId)}
          isSaving={saveProject.isPending}
          onCancel={() => {
            setEditingProjectId(undefined);
            setProjectForm(emptyProject);
          }}
          onChange={setProjectForm}
          onSubmit={() => saveProject.mutate()}
        />
        <ProjectList
          activeId={selectedProject?.id}
          isLoading={projectQuery.isLoading}
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
          onSelect={setSelectedProjectId}
          projects={projects}
        />
      </View>

      <View style={styles.card}>
        <SectionTitle title="Tasks" meta={selectedProject?.name ?? "Select a project"} />
        <TextInput
          onChangeText={setTaskSearch}
          placeholder="Search tasks"
          placeholderTextColor="#8A94B2"
          style={styles.input}
          value={taskSearch}
        />
        <TaskFormView
          disabled={!selectedProject}
          form={taskForm}
          isEditing={Boolean(editingTaskId)}
          isSaving={saveTask.isPending}
          onCancel={() => {
            setEditingTaskId(undefined);
            setTaskForm(emptyTask);
          }}
          onChange={setTaskForm}
          onSubmit={() => saveTask.mutate()}
        />
        <TaskList
          isLoading={taskQuery.isLoading}
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
          tasks={taskQuery.data?.items ?? []}
        />
      </View>
    </ScrollView>
  );
}

function Metric({ label: metricLabel, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
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
        placeholder="Project name"
        placeholderTextColor="#8A94B2"
        style={styles.input}
        value={form.name}
        onChangeText={(name) => onChange({ ...form, name })}
      />
      <TextInput
        placeholder="Description"
        placeholderTextColor="#8A94B2"
        style={styles.input}
        value={form.description}
        onChangeText={(description) => onChange({ ...form, description })}
      />
      <Segment
        options={projectStatuses}
        value={form.status}
        onChange={(status) => onChange({ ...form, status })}
      />
      <View style={styles.row}>
        <TextInput
          placeholder="Start YYYY-MM-DD"
          placeholderTextColor="#8A94B2"
          style={[styles.input, styles.flex]}
          value={form.startDate}
          onChangeText={(startDate) => onChange({ ...form, startDate })}
        />
        <TextInput
          placeholder="End YYYY-MM-DD"
          placeholderTextColor="#8A94B2"
          style={[styles.input, styles.flex]}
          value={form.endDate}
          onChangeText={(endDate) => onChange({ ...form, endDate })}
        />
      </View>
      <View style={styles.row}>
        <ActionButton
          disabled={isSaving || !form.name.trim()}
          label={isSaving ? "Saving..." : isEditing ? "Update project" : "Create project"}
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
        onChangeText={(description) => onChange({ ...form, description })}
        placeholder="Description"
        placeholderTextColor="#8A94B2"
        style={styles.input}
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
          label={isSaving ? "Saving..." : isEditing ? "Update task" : "Create task"}
          onPress={onSubmit}
        />
        {isEditing ? <ActionButton label="Cancel" onPress={onCancel} secondary /> : null}
      </View>
    </View>
  );
}

function ProjectList({
  activeId,
  isLoading,
  onDelete,
  onEdit,
  onSelect,
  projects,
}: {
  activeId: string | undefined;
  isLoading: boolean;
  onDelete: (id: string) => void;
  onEdit: (project: ProjectDto) => void;
  onSelect: (id: string) => void;
  projects: ProjectDto[];
}) {
  if (isLoading) {
    return <Text style={styles.empty}>Loading projects...</Text>;
  }
  if (projects.length === 0) {
    return <Text style={styles.empty}>No projects yet.</Text>;
  }

  return (
    <View style={styles.list}>
      {projects.map((project) => (
        <View
          style={[styles.item, activeId === project.id ? styles.activeItem : null]}
          key={project.id}
        >
          <TouchableOpacity onPress={() => onSelect(project.id)} style={styles.itemMain}>
            <Text style={styles.itemTitle}>{project.name}</Text>
            <Text style={styles.itemMeta}>
              {label(project.status)} / {project.progressPercent ?? 0}% complete
            </Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <InlineButton label="Edit" onPress={() => onEdit(project)} />
            <InlineButton danger label="Delete" onPress={() => onDelete(project.id)} />
          </View>
        </View>
      ))}
    </View>
  );
}

function TaskList({
  isLoading,
  onComplete,
  onDelete,
  onEdit,
  tasks,
}: {
  isLoading: boolean;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: TaskDto) => void;
  tasks: TaskDto[];
}) {
  if (isLoading) {
    return <Text style={styles.empty}>Loading tasks...</Text>;
  }
  if (tasks.length === 0) {
    return <Text style={styles.empty}>No tasks match this view.</Text>;
  }

  return (
    <View style={styles.list}>
      {tasks.map((task) => (
        <View style={styles.item} key={task.id}>
          <View style={styles.itemMain}>
            <Text style={styles.itemTitle}>{task.name}</Text>
            <Text style={styles.itemMeta}>
              {label(task.status)} / {label(task.priority)}{" "}
              {task.dueDate ? `/ due ${task.dueDate}` : ""}
            </Text>
          </View>
          <View style={styles.row}>
            {task.status !== "COMPLETED" ? (
              <InlineButton label="Complete" onPress={() => onComplete(task.id)} />
            ) : null}
            <InlineButton label="Edit" onPress={() => onEdit(task)} />
            <InlineButton danger label="Delete" onPress={() => onDelete(task.id)} />
          </View>
        </View>
      ))}
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
      style={[styles.actionButton, secondary ? styles.secondaryAction : styles.primaryAction]}
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
