// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QuickCreatePlaylist } from "./QuickCreatePlaylist";

const create = vi.hoisted(() => vi.fn());
vi.mock("../lib/playlists-api", () => ({ playlistsApi: { create } }));

afterEach(() => cleanup());

beforeEach(() => {
  create.mockReset();
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

function setup() {
  render(
    <MemoryRouter initialEntries={["/"]}>
      <QuickCreatePlaylist mobile />
      <Routes>
        <Route path="/lists/:id" element={<p>Lista criada</p>} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Abrir menu de criação" }),
  );
  fireEvent.click(screen.getByRole("button", { name: /Nova lista/ }));
}

describe("QuickCreatePlaylist", () => {
  it("cancela sem chamar a API", () => {
    setup();
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(create).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cria uma lista e abre seus detalhes", async () => {
    create.mockResolvedValue({ id: "playlist-123" });
    setup();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Nome da nova lista" }),
      { target: { value: "  Meus filmes  " } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Criar" }));
    await waitFor(() => expect(create).toHaveBeenCalledWith("Meus filmes"));
    expect(await screen.findByText("Lista criada")).toBeTruthy();
  });
});
