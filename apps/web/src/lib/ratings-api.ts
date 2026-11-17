import type { MediaType } from "./catalog-api";

export type RatingItem = {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
  score: number;
  updatedAt: string;
};

async function request(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const response = await fetch(`/api/ratings${path}`, {
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
      "Não foi possível atualizar sua avaliação. Tente novamente.",
    );
  }
  return response;
}

export const ratingsApi = {
  async list(): Promise<RatingItem[]> {
    const response = await request("");
    const data = (await response.json()) as { results?: RatingItem[] };
    if (!Array.isArray(data.results))
      throw new Error("Resposta inválida das avaliações.");
    return data.results;
  },
  async set(mediaType: MediaType, id: number, score: number): Promise<void> {
    await request(`/${mediaType}/${id}`, {
      method: "PUT",
      body: JSON.stringify({ score }),
    });
  },
  async remove(mediaType: MediaType, id: number): Promise<void> {
    await request(`/${mediaType}/${id}`, { method: "DELETE" });
  },
};
