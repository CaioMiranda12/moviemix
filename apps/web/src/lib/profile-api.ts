export type ProfileStats = {
  favorites: number;
  wantToWatch: number;
  watching: number;
  watched: number;
  ratings: number;
  averageRating: number | null;
};

export const profileApi = {
  async stats(): Promise<ProfileStats> {
    const response = await fetch("/api/profile/stats", {
      credentials: "same-origin",
    });
    if (response.status === 401) {
      throw new Error("Sua sessão expirou. Entre novamente.");
    }
    if (!response.ok) {
      throw new Error("Não foi possível carregar suas estatísticas.");
    }
    const data: unknown = await response.json();
    if (!isProfileStats(data)) {
      throw new Error("Resposta inválida das estatísticas.");
    }
    return data;
  },
};

function isProfileStats(value: unknown): value is ProfileStats {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    ["favorites", "wantToWatch", "watching", "watched", "ratings"].every(
      (key) =>
        typeof item[key] === "number" &&
        Number.isInteger(item[key]) &&
        (item[key] as number) >= 0,
    ) &&
    (item.averageRating === null ||
      (typeof item.averageRating === "number" &&
        Number.isFinite(item.averageRating) &&
        item.averageRating >= 1 &&
        item.averageRating <= 5))
  );
}
