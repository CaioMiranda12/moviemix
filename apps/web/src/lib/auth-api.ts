export type AuthUser = {
  id: string;
  email: string;
};

type AuthResponse = {
  user: AuthUser;
};

export class AuthApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/auth${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new AuthApiError(
      response.status,
      "Não foi possível concluir a solicitação.",
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const authApi = {
  register(email: string, password: string) {
    return request<AuthResponse>("/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  login(email: string, password: string) {
    return request<AuthResponse>("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  me() {
    return request<AuthResponse>("/me");
  },

  logout() {
    return request<void>("/logout", {
      method: "POST",
      body: "{}",
    });
  },
};
