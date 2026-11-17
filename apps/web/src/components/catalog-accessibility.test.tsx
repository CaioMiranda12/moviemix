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

describe("acessibilidade e recuperação do catálogo", () => {
  it("oferece atalho para o conteúdo e navegação identificada", async () => {
    vi.spyOn(catalogApi, "trending").mockResolvedValue([]);
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
    const skip = screen.getByRole("link", { name: "Pular para o conteúdo" });
    expect(skip.getAttribute("href")).toBe("#catalog-content");
    expect(document.getElementById("catalog-content")).not.toBeNull();
    expect(
      screen.getByRole("navigation", { name: "Navegação da conta" }),
    ).toBeTruthy();
    await screen.findByText("Nenhum resultado encontrado.");
  });

  it("permite repetir a busca do catálogo após uma falha", async () => {
    const trending = vi
      .spyOn(catalogApi, "trending")
      .mockRejectedValueOnce(new Error("Indisponível"))
      .mockResolvedValueOnce([]);
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
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(trending).toHaveBeenCalledTimes(2));
    await screen.findByText("Nenhum resultado encontrado.");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
