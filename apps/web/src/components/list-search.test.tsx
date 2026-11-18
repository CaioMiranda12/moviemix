// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FavoritesPage } from "./FavoritesPage";
import { RatingsPage } from "./RatingsPage";
import { WatchStatusPage } from "./WatchStatusPage";
import { favoritesApi } from "../lib/favorites-api";
import { ratingsApi } from "../lib/ratings-api";
import { watchStatusApi } from "../lib/watch-status-api";
import { matchesListSearch } from "./list-search-utils";

const item = (id: number, title: string) => ({
  id,
  mediaType: "movie" as const,
  title,
  overview: "",
  posterPath: null,
  releaseDate: "2025-01-01",
  createdAt: "2025-01-01",
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("busca nas listas pessoais", () => {
  it("ignora acentos, maiúsculas e espaços nas extremidades", () => {
    expect(matchesListSearch("Coração Valente", " CORACAO ")).toBe(true);
    expect(matchesListSearch("Matrix", "avatar")).toBe(false);
  });

  it("filtra favoritos e restaura todos ao limpar a busca", async () => {
    vi.spyOn(favoritesApi, "list").mockResolvedValue([
      item(1, "Matrix"),
      item(2, "Avatar"),
    ]);
    vi.spyOn(ratingsApi, "list").mockResolvedValue([]);
    render(
      <MemoryRouter>
        <FavoritesPage />
      </MemoryRouter>,
    );
    await screen.findByText("Matrix");
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar na lista" }),
      { target: { value: "avatar" } },
    );
    expect(screen.queryByText("Matrix")).toBeNull();
    expect(screen.getByText("Avatar")).toBeTruthy();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar na lista" }),
      { target: { value: "" } },
    );
    expect(screen.getByText("Matrix")).toBeTruthy();
  });

  it("busca nas avaliações", async () => {
    vi.spyOn(ratingsApi, "list").mockResolvedValue([
      { ...item(1, "Matrix"), score: 4, updatedAt: "2025-01-01" },
      { ...item(2, "Avatar"), score: 5, updatedAt: "2025-01-01" },
    ]);
    render(
      <MemoryRouter>
        <RatingsPage />
      </MemoryRouter>,
    );
    await screen.findByText("Matrix");
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar na lista" }),
      { target: { value: "inexistente" } },
    );
    expect(
      screen.getByText("Nenhum título encontrado para sua busca."),
    ).toBeTruthy();
  });

  it("combina busca por título e filtro de status", async () => {
    vi.spyOn(watchStatusApi, "list").mockResolvedValue([
      {
        ...item(1, "Matrix"),
        status: "WATCHED" as const,
        updatedAt: "2025-01-01",
      },
      {
        ...item(2, "Avatar"),
        status: "WATCHING" as const,
        updatedAt: "2025-01-01",
      },
    ]);
    render(
      <MemoryRouter>
        <WatchStatusPage />
      </MemoryRouter>,
    );
    await screen.findByText("Matrix");
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar na lista" }),
      { target: { value: "matrix" } },
    );
    expect(screen.getByText("Matrix")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Assistindo" }));
    expect(
      screen.getByText("Nenhum título encontrado para sua busca."),
    ).toBeTruthy();
  });
});
