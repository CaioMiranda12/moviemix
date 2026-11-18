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
describe("exploração por gênero", () => {
  it("loads selected movie genre and switches to TV genres", async () => {
    vi.spyOn(catalogApi, "trending").mockResolvedValue([]);
    const discover = vi
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
    fireEvent.click(screen.getByRole("button", { name: /^Ação$/ }));
    await waitFor(() =>
      expect(discover).toHaveBeenCalledWith({ type: "movie", genre: 28 }, 1),
    );
    expect(await screen.findByText("Filmes · Ação")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tipo de conteúdo"), {
      target: { value: "tv" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Crime$/ }));
    await waitFor(() =>
      expect(discover).toHaveBeenCalledWith({ type: "tv", genre: 80 }, 1),
    );
    expect(await screen.findByText("Séries · Crime")).toBeTruthy();
  });
});
