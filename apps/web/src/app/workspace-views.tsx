"use client";

import type { ProjectDto, ProjectStatus, TaskDto, TaskPriority, TaskStatus } from "@orbit/shared";
import type { FormEvent } from "react";

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

type ProjectFormProps = {
  form: ProjectForm;
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (form: ProjectForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

type TaskFormProps = {
  disabled: boolean;
  form: TaskForm;
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (form: TaskForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ProjectFormView({
  form,
  isEditing,
  isSaving,
  onCancel,
  onChange,
  onSubmit,
}: ProjectFormProps) {
  return (
    <form className="resource-form" onSubmit={onSubmit}>
      <input
        maxLength={120}
        onChange={(event) => onChange({ ...form, name: event.target.value })}
        placeholder="Project name"
        required
        value={form.name}
      />
      <textarea
        maxLength={1000}
        onChange={(event) => onChange({ ...form, description: event.target.value })}
        placeholder="Description"
        value={form.description}
      />
      <div className="form-row">
        <select
          value={form.status}
          onChange={(event) => onChange({ ...form, status: event.target.value as ProjectStatus })}
        >
          <option value="NOT_STARTED">Not started</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <input
          onChange={(event) => onChange({ ...form, startDate: event.target.value })}
          type="date"
          value={form.startDate}
        />
        <input
          onChange={(event) => onChange({ ...form, endDate: event.target.value })}
          type="date"
          value={form.endDate}
        />
      </div>
      <div className="action-row">
        <button className="button primary compact" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : isEditing ? "Update project" : "Create project"}
        </button>
        {isEditing ? (
          <button className="button ghost compact" onClick={onCancel} type="button">
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function TaskFormView({
  disabled,
  form,
  isEditing,
  isSaving,
  onCancel,
  onChange,
  onSubmit,
}: TaskFormProps) {
  return (
    <form className="resource-form" onSubmit={onSubmit}>
      <input
        disabled={disabled}
        maxLength={160}
        onChange={(event) => onChange({ ...form, name: event.target.value })}
        placeholder={disabled ? "Select a project first" : "Task name"}
        required
        value={form.name}
      />
      <textarea
        disabled={disabled}
        maxLength={1000}
        onChange={(event) => onChange({ ...form, description: event.target.value })}
        placeholder="Description"
        value={form.description}
      />
      <div className="form-row">
        <select
          disabled={disabled}
          value={form.status}
          onChange={(event) => onChange({ ...form, status: event.target.value as TaskStatus })}
        >
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <select
          disabled={disabled}
          value={form.priority}
          onChange={(event) => onChange({ ...form, priority: event.target.value as TaskPriority })}
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
        <input
          disabled={disabled}
          onChange={(event) => onChange({ ...form, dueDate: event.target.value })}
          type="date"
          value={form.dueDate}
        />
      </div>
      <div className="action-row">
        <button className="button primary compact" disabled={disabled || isSaving} type="submit">
          {isSaving ? "Saving..." : isEditing ? "Update task" : "Create task"}
        </button>
        {isEditing ? (
          <button className="button ghost compact" onClick={onCancel} type="button">
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function ProjectList({
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
    return <div className="empty-state">Loading projects...</div>;
  }
  if (projects.length === 0) {
    return <div className="empty-state">No projects yet.</div>;
  }

  return (
    <div className="resource-list">
      {projects.map((project) => (
        <article
          className={project.id === activeId ? "resource active" : "resource"}
          key={project.id}
        >
          <button className="resource-main" onClick={() => onSelect(project.id)} type="button">
            <strong>{project.name}</strong>
            <span>{project.status.replace("_", " ").toLowerCase()}</span>
            <small>{project.progressPercent ?? 0}% complete</small>
          </button>
          <div className="item-actions">
            <button className="text-button" onClick={() => onEdit(project)} type="button">
              Edit
            </button>
            <button
              className="text-button danger-text"
              onClick={() => onDelete(project.id)}
              type="button"
            >
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

export function TaskList({
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
    return <div className="empty-state">Loading tasks...</div>;
  }
  if (tasks.length === 0) {
    return <div className="empty-state">No tasks match this view.</div>;
  }

  return (
    <div className="resource-list">
      {tasks.map((task) => (
        <article className="resource" key={task.id}>
          <div className="resource-main static">
            <strong>{task.name}</strong>
            <span>
              {task.status.replace("_", " ").toLowerCase()} / {task.priority.toLowerCase()}
            </span>
            <small>{task.dueDate ? `Due ${task.dueDate}` : "No due date"}</small>
          </div>
          <div className="item-actions">
            {task.status !== "COMPLETED" ? (
              <button className="text-button" onClick={() => onComplete(task.id)} type="button">
                Complete
              </button>
            ) : null}
            <button className="text-button" onClick={() => onEdit(task)} type="button">
              Edit
            </button>
            <button
              className="text-button danger-text"
              onClick={() => onDelete(task.id)}
              type="button"
            >
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
