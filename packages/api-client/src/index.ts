import type {
  AuthSessionDto,
  ErrorEnvelope,
  HealthResponse,
  LoginInput,
  ProjectCreateInput,
  ProjectDto,
  ProjectQuery,
  ProjectUpdateInput,
  RefreshTokenBody,
  RegisterInput,
  SuccessEnvelope,
  DashboardDto,
  TaskCreateInput,
  TaskDto,
  TaskQuery,
  TaskUpdateInput,
  UserDto,
} from "@orbit/shared";

export class OrbitApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorEnvelope["error"]["code"],
    message: string,
    public readonly fields?: Record<string, string[]>
  ) {
    super(message);
  }
}

export type OrbitClientOptions = {
  baseUrl: string;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  onAccessToken?: (token: string | undefined) => void | Promise<void>;
};

export type OrbitClient = ReturnType<typeof createOrbitClient>;
export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
};

export type ListResponse<TData> = {
  items: TData[];
  meta: PageMeta;
};

async function parseResponse<TData>(response: Response): Promise<TData> {
  const body = (await response.json()) as SuccessEnvelope<TData> | ErrorEnvelope;

  if (!response.ok || !body.success) {
    const error = body as ErrorEnvelope;
    throw new OrbitApiError(
      response.status,
      error.error.code,
      error.error.message,
      error.error.fields
    );
  }

  return body.data;
}

async function parseEnvelope<TData, TMeta>(
  response: Response
): Promise<SuccessEnvelope<TData, TMeta>> {
  const body = (await response.json()) as SuccessEnvelope<TData, TMeta> | ErrorEnvelope;

  if (!response.ok || !body.success) {
    const error = body as ErrorEnvelope;
    throw new OrbitApiError(
      response.status,
      error.error.code,
      error.error.message,
      error.error.fields
    );
  }

  return body;
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function queryString(query: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }

  const value = params.toString();
  return value ? `?${value}` : "";
}

export function createOrbitClient(options: OrbitClientOptions) {
  async function request<TData>(path: string, init: RequestInit = {}): Promise<TData> {
    const token = await options.getAccessToken?.();
    const headers = new Headers(init.headers);

    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    const response = await fetch(joinUrl(options.baseUrl, path), {
      ...init,
      credentials: "include",
      headers,
    });

    return parseResponse<TData>(response);
  }

  async function requestEnvelope<TData, TMeta>(
    path: string,
    init: RequestInit = {}
  ): Promise<SuccessEnvelope<TData, TMeta>> {
    const token = await options.getAccessToken?.();
    const headers = new Headers(init.headers);

    if (init.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    const response = await fetch(joinUrl(options.baseUrl, path), {
      ...init,
      credentials: "include",
      headers,
    });

    return parseEnvelope<TData, TMeta>(response);
  }

  async function authRequest(path: string, body: unknown): Promise<AuthSessionDto> {
    const session = await request<AuthSessionDto>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
    await options.onAccessToken?.(session.tokens.accessToken);
    return session;
  }

  return {
    health: () => request<HealthResponse["data"]>("/health"),
    register: (input: RegisterInput) => authRequest("/api/auth/register", input),
    login: (input: LoginInput) => authRequest("/api/auth/login", input),
    refresh: (input: RefreshTokenBody = {}) => authRequest("/api/auth/refresh", input),
    logout: async (input: RefreshTokenBody = {}) => {
      await request<{ loggedOut: true }>("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify(input),
      });
      await options.onAccessToken?.(undefined);
    },
    me: () => request<UserDto>("/api/auth/me"),
    dashboard: () => request<DashboardDto>("/api/dashboard"),
    listProjects: async (query: Partial<ProjectQuery> = {}) => {
      const path = `/api/projects${queryString(query)}`;
      const envelope = await requestEnvelope<ProjectDto[], PageMeta>(path);
      return { items: envelope.data, meta: envelope.meta };
    },
    createProject: (input: ProjectCreateInput) =>
      request<ProjectDto>("/api/projects", { method: "POST", body: JSON.stringify(input) }),
    updateProject: (id: string, input: ProjectUpdateInput) =>
      request<ProjectDto>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    deleteProject: (id: string) =>
      request<{ deleted: true }>(`/api/projects/${id}`, { method: "DELETE" }),
    listTasks: async (query: Partial<TaskQuery> = {}) => {
      const path = `/api/tasks${queryString(query)}`;
      const envelope = await requestEnvelope<TaskDto[], PageMeta>(path);
      return { items: envelope.data, meta: envelope.meta };
    },
    listProjectTasks: async (
      projectId: string,
      query: Partial<Omit<TaskQuery, "projectId">> = {}
    ) => {
      const path = `/api/projects/${projectId}/tasks${queryString(query)}`;
      const envelope = await requestEnvelope<TaskDto[], PageMeta>(path);
      return { items: envelope.data, meta: envelope.meta };
    },
    createTask: (input: TaskCreateInput) =>
      request<TaskDto>("/api/tasks", { method: "POST", body: JSON.stringify(input) }),
    updateTask: (id: string, input: TaskUpdateInput) =>
      request<TaskDto>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    completeTask: (id: string) =>
      request<TaskDto>(`/api/tasks/${id}/complete`, { method: "POST", body: JSON.stringify({}) }),
    deleteTask: (id: string) =>
      request<{ deleted: true }>(`/api/tasks/${id}`, { method: "DELETE" }),
  };
}

export async function getHealth(baseUrl: string): Promise<HealthResponse> {
  const data = await createOrbitClient({ baseUrl }).health();

  return {
    success: true,
    data,
  };
}
