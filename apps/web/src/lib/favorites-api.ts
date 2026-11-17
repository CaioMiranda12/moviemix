import type { MediaType } from "./catalog-api";

export type FavoriteItem = {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
  createdAt: string;
};

async function request(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const response = await fetch(`/api/favorites${path}`, {
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
    throw new Error("Não foi possível atualizar sua lista. Tente novamente.");
  }
  return response;
}

export const favoritesApi = {
  async list(): Promise<FavoriteItem[]> {
    const response = await request("");
    const data = (await response.json()) as { results?: FavoriteItem[] };
    if (!Array.isArray(data.results))
      throw new Error("Resposta inválida da lista.");
    return data.results;
  },
  async add(mediaType: MediaType, id: number): Promise<void> {
    await request("", {
      method: "POST",
      body: JSON.stringify({ mediaType, id }),
    });
  },
  async remove(mediaType: MediaType, id: number): Promise<void> {
    await request(`/${mediaType}/${id}`, { method: "DELETE" });
  },
};
