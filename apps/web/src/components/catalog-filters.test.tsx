// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CatalogPage } from "./CatalogPage";
import { catalogApi } from "../lib/catalog-api";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("advanced catalog filters", () => {
  it("combines text, genre, year and rating", async () => {
    vi.spyOn(catalogApi, "trending").mockResolvedValue([]);
    const filter = vi
      .spyOn(catalogApi, "filterPage")
      .mockResolvedValue({ results: [], page: 1, hasMore: false });
    render(
      <MemoryRouter>
        <CatalogPage
          email="teste@example.com"
          onLogout={vi.fn()}
          loggingOut={false}
          logoutError=""
        />
      </MemoryRouter>,
    );
    await screen.findByText("Nenhum resultado encontrado.");
    fireEvent.change(screen.getByLabelText("Buscar título"), {
      target: { value: "Batman" },
    });
    fireEvent.change(screen.getByLabelText("Ano"), {
      target: { value: "2022" },
    });
    fireEvent.change(screen.getByLabelText("Nota mínima TMDB"), {
      target: { value: "7" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Ação$/ }));
    await waitFor(() =>
      expect(filter).toHaveBeenCalledWith(
        {
          type: "movie",
          query: "Batman",
          genre: 28,
          year: 2022,
          minRating: 7,
        },
        1,
      ),
    );
  });
});

describe("clear advanced filters", () => {
  it("keeps the text and media type while removing genre, year and rating", async () => {
    vi.spyOn(catalogApi, "trending").mockResolvedValue([]);
    vi.spyOn(catalogApi, "discover").mockResolvedValue([]);
    const filter = vi
      .spyOn(catalogApi, "filterPage")
      .mockResolvedValue({ results: [], page: 1, hasMore: false });

    render(
      <MemoryRouter>
        <CatalogPage
          email="teste@example.com"
          onLogout={vi.fn()}
          loggingOut={false}
          logoutError=""
        />
      </MemoryRouter>,
    );
    await screen.findByText("Nenhum resultado encontrado.");

    fireEvent.change(screen.getByLabelText("Buscar título"), {
      target: { value: "Batman" },
    });
    fireEvent.change(screen.getByLabelText("Tipo de conteúdo"), {
      target: { value: "tv" },
    });
    fireEvent.change(screen.getByLabelText("Ano"), {
      target: { value: "2022" },
    });
    fireEvent.change(screen.getByLabelText("Nota mínima TMDB"), {
      target: { value: "7" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Crime$/ }));

    await waitFor(() =>
      expect(filter).toHaveBeenCalledWith(
        {
          type: "tv",
          query: "Batman",
          genre: 80,
          year: 2022,
          minRating: 7,
        },
        1,
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));

    expect(screen.getByLabelText("Buscar título")).toHaveProperty(
      "value",
      "Batman",
    );
    expect(screen.getByLabelText("Tipo de conteúdo")).toHaveProperty(
      "value",
      "tv",
    );
    expect(screen.getByLabelText("Ano")).toHaveProperty("value", "");
    expect(screen.getByLabelText("Nota mínima TMDB")).toHaveProperty(
      "value",
      "",
    );
    expect(
      screen
        .getByRole("button", { name: /^Crime$/ })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    expect(screen.queryByRole("button", { name: "Limpar filtros" })).toBeNull();
    await waitFor(() =>
      expect(filter).toHaveBeenLastCalledWith(
        { type: "tv", query: "Batman" },
        1,
      ),
    );
  });
});
