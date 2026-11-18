// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FavoritesPage } from "./FavoritesPage";
import { RatingsPage } from "./RatingsPage";
import { WatchStatusPage } from "./WatchStatusPage";
import { sortListItems } from "./list-sort-utils";
import { favoritesApi } from "../lib/favorites-api";
import { ratingsApi } from "../lib/ratings-api";
import { watchStatusApi } from "../lib/watch-status-api";

const makeItem = (id: number, title: string, releaseDate = "2025-01-01") => ({
  id,
  mediaType: "movie" as const,
  title,
  overview: "",
  posterPath: null,
  releaseDate,
  createdAt: `2025-01-0${id}`,
});

function titlesInCards() {
  return screen
    .getAllByRole("article")
    .map((card) => within(card).getByRole("heading", { level: 2 }).textContent);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ordenação das listas pessoais", () => {
  it("não altera o array original, ignora acentos e mantém datas ausentes por último", () => {
    const items = [
      makeItem(1, "Zorro", ""),
      makeItem(2, "Árvore", "2024-01-01"),
    ];
    expect(sortListItems(items, "title-asc").map((item) => item.title)).toEqual(
      ["Árvore", "Zorro"],
    );
    expect(
      sortListItems(items, "release-newest").map((item) => item.title),
    ).toEqual(["Árvore", "Zorro"]);
    expect(items[0].title).toBe("Zorro");
  });

  it("ordena favoritos por título e nota pessoal, preservando a busca", async () => {
    vi.spyOn(favoritesApi, "list").mockResolvedValue([
      makeItem(1, "Zorro"),
      makeItem(2, "Avatar"),
      makeItem(3, "Matrix"),
    ]);
    vi.spyOn(ratingsApi, "list").mockResolvedValue([
      { ...makeItem(1, "Zorro"), score: 5, updatedAt: "2025-01-01" },
      { ...makeItem(2, "Avatar"), score: 2, updatedAt: "2025-01-01" },
    ]);
    render(
      <MemoryRouter>
        <FavoritesPage />
      </MemoryRouter>,
    );
    await screen.findByText("Matrix");
    fireEvent.change(screen.getByRole("combobox", { name: "Ordenar por" }), {
      target: { value: "title-asc" },
    });
    expect(titlesInCards()).toEqual(["Avatar", "Matrix", "Zorro"]);
    fireEvent.change(screen.getByRole("combobox", { name: "Ordenar por" }), {
      target: { value: "score-highest" },
    });
    expect(titlesInCards()).toEqual(["Zorro", "Avatar", "Matrix"]);
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar na lista" }),
      { target: { value: "avatar" } },
    );
    expect(titlesInCards()).toEqual(["Avatar"]);
  });

  it("ordena avaliações por nota", async () => {
    vi.spyOn(ratingsApi, "list").mockResolvedValue([
      { ...makeItem(1, "Zorro"), score: 2, updatedAt: "2025-01-01" },
      { ...makeItem(2, "Avatar"), score: 5, updatedAt: "2025-01-02" },
    ]);
    render(
      <MemoryRouter>
        <RatingsPage />
      </MemoryRouter>,
    );
    await screen.findByText("Zorro");
    fireEvent.change(screen.getByRole("combobox", { name: "Ordenar por" }), {
      target: { value: "score-highest" },
    });
    expect(titlesInCards()).toEqual(["Avatar", "Zorro"]);
  });

  it("combina ordenação, busca e filtro no acompanhamento", async () => {
    vi.spyOn(watchStatusApi, "list").mockResolvedValue([
      { ...makeItem(1, "Zorro"), status: "WATCHING", updatedAt: "2025-01-01" },
      { ...makeItem(2, "Avatar"), status: "WATCHING", updatedAt: "2025-01-02" },
      { ...makeItem(3, "Matrix"), status: "WATCHED", updatedAt: "2025-01-03" },
    ]);
    render(
      <MemoryRouter>
        <WatchStatusPage />
      </MemoryRouter>,
    );
    await screen.findByText("Matrix");
    fireEvent.click(screen.getByRole("button", { name: "Assistindo" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Ordenar por" }), {
      target: { value: "title-desc" },
    });
    expect(titlesInCards()).toEqual(["Zorro", "Avatar"]);
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar na lista" }),
      { target: { value: "avatar" } },
    );
    expect(titlesInCards()).toEqual(["Avatar"]);
  });
});
