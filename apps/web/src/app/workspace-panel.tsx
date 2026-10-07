"use client";

import type { OrbitClient } from "@orbit/api-client";
import type { ProjectDto, ProjectStatus, TaskDto, TaskPriority, TaskStatus } from "@orbit/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";

import { ProjectFormView, ProjectList, TaskFormView, TaskList } from "./workspace-views";

type WorkspacePanelProps = {
  client: OrbitClient;
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

function optional(value: string) {
  return value.trim() || undefined;
}

export function WorkspacePanel({ client }: WorkspacePanelProps) {
  const queryClient = useQueryClient();
  const [projectSearch, setProjectSearch] = useState("");
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | "">("");
  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus | "">("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [editingProjectId, setEditingProjectId] = useState<string | undefined>();
  const [editingTaskId, setEditingTaskId] = useState<string | undefined>();
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProject);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTask);

  const projectQuery = useQuery({
    queryKey: ["projects", projectSearch, projectStatus],
    queryFn: () =>
      client.listProjects({
        page: 1,
        pageSize: 50,
        search: optional(projectSearch),
        status: projectStatus || undefined,
      }),
  });

  const projects = projectQuery.data?.items ?? [];
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0],
    [projects, selectedProjectId]
  );

  const taskQuery = useQuery({
    enabled: Boolean(selectedProject?.id),
    queryKey: ["tasks", selectedProject?.id, taskSearch, taskStatus],
    queryFn: () =>
      client.listProjectTasks(selectedProject?.id ?? "", {
        page: 1,
        pageSize: 50,
        search: optional(taskSearch),
        status: taskStatus || undefined,
      }),
  });

  function refreshWorkspace() {
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
      setProjectForm(emptyProject);
      setEditingProjectId(undefined);
      setSelectedProjectId(project.id);
      refreshWorkspace();
    },
  });

  const deleteProject = useMutation({
    mutationFn: (projectId: string) => client.deleteProject(projectId),
    onSuccess: () => {
      setSelectedProjectId(undefined);
      refreshWorkspace();
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
      setTaskForm(emptyTask);
      setEditingTaskId(undefined);
      refreshWorkspace();
    },
  });

  const completeTask = useMutation({
    mutationFn: (taskId: string) => client.completeTask(taskId),
    onSuccess: refreshWorkspace,
  });

  const deleteTask = useMutation({
    mutationFn: (taskId: string) => client.deleteTask(taskId),
    onSuccess: refreshWorkspace,
  });

  function submitProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveProject.mutate();
  }

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
  }

  function editTask(task: TaskDto) {
    setEditingTaskId(task.id);
    setTaskForm({
      description: task.description ?? "",
      dueDate: task.dueDate ?? "",
      name: task.name,
      priority: task.priority,
      status: task.status,
    });
  }

  return (
    <section className="workspace">
      <div className="pane">
        <div className="pane-header">
          <h2>Projects</h2>
          <span>{projectQuery.data?.meta.total ?? 0} total</span>
        </div>
        <div className="filters">
          <input
            placeholder="Search projects"
            value={projectSearch}
            onChange={(event) => setProjectSearch(event.target.value)}
          />
          <select
            value={projectStatus}
            onChange={(event) => setProjectStatus(event.target.value as ProjectStatus | "")}
          >
            <option value="">All statuses</option>
            <option value="NOT_STARTED">Not started</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
        <ProjectFormView
          form={projectForm}
          isEditing={Boolean(editingProjectId)}
          isSaving={saveProject.isPending}
          onChange={setProjectForm}
          onCancel={() => {
            setEditingProjectId(undefined);
            setProjectForm(emptyProject);
          }}
          onSubmit={submitProject}
        />
        <ProjectList
          activeId={selectedProject?.id}
          isLoading={projectQuery.isLoading}
          onDelete={(id) => deleteProject.mutate(id)}
          onEdit={editProject}
          onSelect={setSelectedProjectId}
          projects={projects}
        />
      </div>

      <div className="pane">
        <div className="pane-header">
          <h2>Tasks</h2>
          <span>{selectedProject?.name ?? "Select a project"}</span>
        </div>
        <div className="filters">
          <input
            placeholder="Search tasks"
            value={taskSearch}
            onChange={(event) => setTaskSearch(event.target.value)}
          />
          <select
            value={taskStatus}
            onChange={(event) => setTaskStatus(event.target.value as TaskStatus | "")}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
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
          onSubmit={submitTask}
        />
        <TaskList
          isLoading={taskQuery.isLoading}
          onComplete={(id) => completeTask.mutate(id)}
          onDelete={(id) => deleteTask.mutate(id)}
          onEdit={editTask}
          tasks={taskQuery.data?.items ?? []}
        />
      </div>
    </section>
  );
}
