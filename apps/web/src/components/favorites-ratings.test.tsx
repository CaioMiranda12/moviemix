// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FavoritesPage } from "./FavoritesPage";
import { favoritesApi } from "../lib/favorites-api";
import { ratingsApi } from "../lib/ratings-api";

const favorites = [
  {
    id: 42,
    mediaType: "movie" as const,
    title: "Filme A",
    overview: "",
    posterPath: null,
    releaseDate: "2025-01-01",
    createdAt: "2025-01-01",
  },
  {
    id: 42,
    mediaType: "tv" as const,
    title: "Série B",
    overview: "",
    posterPath: null,
    releaseDate: "2025-01-01",
    createdAt: "2025-01-01",
  },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("notas pessoais nos cards dos favoritos", () => {
  it("mostra a nota correta por tipo e ID com uma única consulta de avaliações", async () => {
    vi.spyOn(favoritesApi, "list").mockResolvedValue(favorites);
    const listRatings = vi.spyOn(ratingsApi, "list").mockResolvedValue([
      {
        id: 42,
        mediaType: "movie",
        title: "Filme A",
        overview: "",
        posterPath: null,
        releaseDate: "2025-01-01",
        score: 4,
        updatedAt: "2025-01-01",
      },
    ]);
    render(
      <MemoryRouter>
        <FavoritesPage />
      </MemoryRouter>,
    );
    expect(
      await screen.findByLabelText("Sua avaliação: 4 de 5 estrelas"),
    ).toHaveProperty("textContent", "★ 4/5");
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(
      screen.queryByLabelText("Sua avaliação: 5 de 5 estrelas"),
    ).toBeNull();
    expect(screen.getAllByLabelText(/Sua avaliação:/)).toHaveLength(1);
    expect(listRatings).toHaveBeenCalledTimes(1);
  });

  it("mantém os favoritos visíveis quando a consulta de avaliações falha", async () => {
    vi.spyOn(favoritesApi, "list").mockResolvedValue(favorites);
    vi.spyOn(ratingsApi, "list").mockRejectedValue(
      new Error("Falha nas notas"),
    );
    render(
      <MemoryRouter>
        <FavoritesPage />
      </MemoryRouter>,
    );
    await screen.findByText("Filme A");
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(2));
    expect(screen.queryByLabelText(/Sua avaliação:/)).toBeNull();
  });
});
