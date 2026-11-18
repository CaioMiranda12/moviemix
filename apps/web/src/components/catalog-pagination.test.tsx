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

const item = (id: number) => ({
  id,
  mediaType: "movie" as const,
  title: `Filme ${id}`,
  overview: "",
  posterPath: null,
  releaseDate: "2020-01-01",
  voteAverage: 7,
});

describe("paginação do catálogo", () => {
  it("appends results without duplicates and hides the button on the last page", async () => {
    vi.spyOn(catalogApi, "trending").mockResolvedValue([]);
    const filterPage = vi
      .spyOn(catalogApi, "filterPage")
      .mockResolvedValueOnce({
        results: [item(1), item(2)],
        page: 1,
        hasMore: true,
      })
      .mockResolvedValueOnce({
        results: [item(2), item(3)],
        page: 2,
        hasMore: false,
      });
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
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await screen.findByText("Filme 1");
    fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
    await screen.findByText("Filme 3");
    expect(screen.getAllByText("Filme 2")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Carregar mais" })).toBeNull();
    expect(filterPage).toHaveBeenCalledWith(
      {
        type: "movie",
        query: "Batman",
        genre: undefined,
        year: undefined,
        minRating: undefined,
      },
      2,
    );
  });

  it("preserves earlier results after a failed next page and retries", async () => {
    vi.spyOn(catalogApi, "trending").mockResolvedValue([]);
    vi.spyOn(catalogApi, "filterPage")
      .mockResolvedValueOnce({ results: [item(1)], page: 1, hasMore: true })
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ results: [item(2)], page: 2, hasMore: false });
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
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    await screen.findByText("Filme 1");
    fireEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
    await screen.findByRole("alert");
    expect(screen.getByText("Filme 1")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Tentar carregar novamente" }),
    );
    await waitFor(() => expect(screen.getByText("Filme 2")).toBeTruthy());
  });
});
