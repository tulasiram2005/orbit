import type {
  AuthSessionDto,
  ErrorEnvelope,
  HealthResponse,
  LoginInput,
  RefreshTokenBody,
  RegisterInput,
  SuccessEnvelope,
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

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
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
  };
}

export async function getHealth(baseUrl: string): Promise<HealthResponse> {
  const data = await createOrbitClient({ baseUrl }).health();

  return {
    success: true,
    data,
  };
}
