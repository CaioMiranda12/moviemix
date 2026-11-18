export type PlaylistItem = {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  overview: string;
  posterPath: string | null;
  releaseDate: string;
  addedAt: string;
};

export type PlaylistDetails = { playlist: Playlist; items: PlaylistItem[] };

export type Playlist = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`/api/playlists${path}`, {
    credentials: "same-origin",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (response.status === 401)
    throw new Error("Sua sessão expirou. Entre novamente.");
  if (response.status === 409) throw new Error("Este título já está na lista.");
  if (response.status === 404) throw new Error("Lista não encontrada.");
  if (!response.ok)
    throw new Error("Não foi possível concluir a operação. Tente novamente.");
  return response.status === 204 ? null : response.json();
}

function isPlaylist(value: unknown): value is Playlist {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    (item.description === null || typeof item.description === "string") &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string"
  );
}

export const playlistsApi = {
  async get(id: string): Promise<PlaylistDetails> {
    const result = (await request(
      `/${encodeURIComponent(id)}`,
    )) as PlaylistDetails;
    if (!result || !isPlaylist(result.playlist) || !Array.isArray(result.items))
      throw new Error("Resposta inválida da lista.");
    return result;
  },
  async addItem(
    id: string,
    mediaType: "movie" | "tv",
    mediaId: number,
  ): Promise<void> {
    await request(`/${encodeURIComponent(id)}/items`, {
      method: "POST",
      body: JSON.stringify({ mediaType, id: mediaId }),
    });
  },
  async removeItem(
    id: string,
    mediaType: "movie" | "tv",
    mediaId: number,
  ): Promise<void> {
    await request(`/${encodeURIComponent(id)}/items/${mediaType}/${mediaId}`, {
      method: "DELETE",
    });
  },
  async list(): Promise<Playlist[]> {
    const result = await request("");
    if (
      !result ||
      typeof result !== "object" ||
      !("results" in result) ||
      !Array.isArray(result.results) ||
      !result.results.every(isPlaylist)
    )
      throw new Error("Resposta inválida das listas.");
    return result.results;
  },
  async create(name: string): Promise<Playlist> {
    const result = await request("", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    if (!isPlaylist(result)) throw new Error("Resposta inválida da lista.");
    return result;
  },
  async rename(id: string, name: string): Promise<Playlist> {
    const result = await request(`/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
    if (!isPlaylist(result)) throw new Error("Resposta inválida da lista.");
    return result;
  },
  async remove(id: string): Promise<void> {
    await request(`/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
