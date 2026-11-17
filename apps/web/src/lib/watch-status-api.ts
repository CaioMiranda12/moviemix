import type { MediaType } from "./catalog-api";

export type WatchStatus = "WANT_TO_WATCH" | "WATCHING" | "WATCHED";

export type WatchStatusItem = {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
  status: WatchStatus;
  updatedAt: string;
};

async function request(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const response = await fetch(`/api/watch-status${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401)
      throw new Error("Sua sessão expirou. Entre novamente.");
    if (response.status === 404) throw new Error("Título não encontrado.");
    throw new Error(
      "Não foi possível atualizar o acompanhamento. Tente novamente.",
    );
  }
  return response;
}

export const watchStatusApi = {
  async list(): Promise<WatchStatusItem[]> {
    const response = await request("");
    const data = (await response.json()) as { results?: WatchStatusItem[] };
    if (!Array.isArray(data.results))
      throw new Error("Resposta inválida do acompanhamento.");
    return data.results;
  },
  async set(
    mediaType: MediaType,
    id: number,
    status: WatchStatus,
  ): Promise<void> {
    await request(`/${mediaType}/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  },
  async remove(mediaType: MediaType, id: number): Promise<void> {
    await request(`/${mediaType}/${id}`, { method: "DELETE" });
  },
};

export const watchStatusLabels: Record<WatchStatus, string> = {
  WANT_TO_WATCH: "Quero assistir",
  WATCHING: "Assistindo",
  WATCHED: "Concluído",
};
