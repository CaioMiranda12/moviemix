// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { FavoriteButton } from "./FavoriteButton";
import { RatingControl } from "./RatingControl";
import { WatchStatusControl } from "./WatchStatusControl";
import { favoritesApi } from "../lib/favorites-api";
import { ratingsApi } from "../lib/ratings-api";
import { watchStatusApi } from "../lib/watch-status-api";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("interações reais dos componentes", () => {
  it("adiciona e remove um favorito e atualiza o botão", async () => {
    vi.spyOn(favoritesApi, "list").mockResolvedValue([]);
    const add = vi.spyOn(favoritesApi, "add").mockResolvedValue();
    const remove = vi.spyOn(favoritesApi, "remove").mockResolvedValue();
    render(<FavoriteButton mediaType="movie" id={42} />);

    const addButton = await screen.findByRole("button", {
      name: /Adicionar à Minha Lista/i,
    });
    fireEvent.click(addButton);
    await waitFor(() => expect(add).toHaveBeenCalledWith("movie", 42));
    const removeButton = await screen.findByRole("button", {
      name: /Remover da Minha Lista/i,
    });
    expect(removeButton.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(removeButton);
    await waitFor(() => expect(remove).toHaveBeenCalledWith("movie", 42));
    await screen.findByRole("button", { name: /Adicionar à Minha Lista/i });
  });

  it("exibe erro ao tentar favoritar e permite nova tentativa", async () => {
    vi.spyOn(favoritesApi, "list").mockResolvedValue([]);
    const add = vi
      .spyOn(favoritesApi, "add")
      .mockRejectedValueOnce(new Error("Falha ao salvar favorito"))
      .mockResolvedValueOnce();
    render(<FavoriteButton mediaType="tv" id={17} />);
    fireEvent.click(
      await screen.findByRole("button", { name: /Adicionar à Minha Lista/i }),
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Falha ao salvar favorito",
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Adicionar à Minha Lista/i }),
    );
    await waitFor(() => expect(add).toHaveBeenCalledTimes(2));
    await screen.findByRole("button", { name: /Remover da Minha Lista/i });
  });

  it("salva, altera e remove avaliação por estrelas", async () => {
    vi.spyOn(ratingsApi, "list").mockResolvedValue([]);
    const set = vi.spyOn(ratingsApi, "set").mockResolvedValue();
    const remove = vi.spyOn(ratingsApi, "remove").mockResolvedValue();
    render(<RatingControl mediaType="movie" id={42} />);

    await waitFor(() =>
      expect(screen.queryByText("Carregando avaliação...")).toBeNull(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Avaliar com 4 estrelas" }),
    );
    await waitFor(() => expect(set).toHaveBeenCalledWith("movie", 42, 4));
    await screen.findByText("4/5");
    fireEvent.click(
      screen.getByRole("button", { name: "Avaliar com 5 estrelas" }),
    );
    await waitFor(() => expect(set).toHaveBeenCalledWith("movie", 42, 5));
    await screen.findByText("5/5");
    fireEvent.click(screen.getByRole("button", { name: "Remover avaliação" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith("movie", 42));
    await screen.findByText("Sem avaliação");
  });

  it("altera o acompanhamento e remove o status", async () => {
    vi.spyOn(watchStatusApi, "list").mockResolvedValue([]);
    const set = vi.spyOn(watchStatusApi, "set").mockResolvedValue();
    const remove = vi.spyOn(watchStatusApi, "remove").mockResolvedValue();
    render(<WatchStatusControl mediaType="tv" id={17} />);

    const select = screen.getByLabelText(
      "Meu acompanhamento",
    ) as HTMLSelectElement;
    await waitFor(() => expect(select.disabled).toBe(false));
    fireEvent.change(select, { target: { value: "WATCHING" } });
    await waitFor(() => expect(set).toHaveBeenCalledWith("tv", 17, "WATCHING"));
    await waitFor(() => expect(select.value).toBe("WATCHING"));
    fireEvent.change(select, { target: { value: "" } });
    await waitFor(() => expect(remove).toHaveBeenCalledWith("tv", 17));
    await waitFor(() => expect(select.value).toBe(""));
  });
});
