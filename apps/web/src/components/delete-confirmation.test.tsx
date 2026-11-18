// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { FavoriteButton } from "./FavoriteButton";
import { favoritesApi } from "../lib/favorites-api";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("não remove ao cancelar, e remove apenas após confirmar", async () => {
  vi.spyOn(favoritesApi, "list").mockResolvedValue([
    { id: 42, mediaType: "movie", title: "Teste" } as never,
  ]);
  const remove = vi.spyOn(favoritesApi, "remove").mockResolvedValue();
  render(<FavoriteButton mediaType="movie" id={42} />);
  const trigger = await screen.findByRole("button", {
    name: /Remover da Minha Lista/i,
  });
  fireEvent.click(trigger);
  expect(remove).not.toHaveBeenCalled();
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(remove).not.toHaveBeenCalled();
  fireEvent.click(trigger);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(remove).not.toHaveBeenCalled();
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole("button", { name: "Remover favorito" }));
  await waitFor(() => expect(remove).toHaveBeenCalledOnce());
});
