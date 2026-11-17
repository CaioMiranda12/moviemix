import { afterEach, describe, expect, it, vi } from "vitest";
import { favoritesApi } from "./favorites-api";
import { ratingsApi } from "./ratings-api";
import { watchStatusApi } from "./watch-status-api";

function mockResponse(status = 200, body: unknown = { results: [] }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ações do usuário — favoritos", () => {
  it("adiciona um filme com POST e credenciais da sessão", async () => {
    const fetchMock = mockResponse();
    await favoritesApi.add("movie", 42);
    expect(fetchMock).toHaveBeenCalledWith("/api/favorites", {
      method: "POST",
      credentials: "same-origin",
      body: JSON.stringify({ mediaType: "movie", id: 42 }),
      headers: { "Content-Type": "application/json" },
    });
  });

  it("remove uma série com DELETE", async () => {
    const fetchMock = mockResponse();
    await favoritesApi.remove("tv", 17);
    expect(fetchMock).toHaveBeenCalledWith("/api/favorites/tv/17", {
      method: "DELETE",
      credentials: "same-origin",
      headers: {},
    });
  });

  it("rejeita uma lista com resposta inválida", async () => {
    mockResponse(200, { results: null });
    await expect(favoritesApi.list()).rejects.toThrow(
      "Resposta inválida da lista.",
    );
  });
});

describe("ações do usuário — avaliações", () => {
  it("salva uma nota de cinco estrelas usando PUT", async () => {
    const fetchMock = mockResponse();
    await ratingsApi.set("movie", 42, 5);
    expect(fetchMock).toHaveBeenCalledWith("/api/ratings/movie/42", {
      method: "PUT",
      credentials: "same-origin",
      body: JSON.stringify({ score: 5 }),
      headers: { "Content-Type": "application/json" },
    });
  });

  it("remove a nota de uma série", async () => {
    const fetchMock = mockResponse();
    await ratingsApi.remove("tv", 17);
    expect(fetchMock).toHaveBeenCalledWith("/api/ratings/tv/17", {
      method: "DELETE",
      credentials: "same-origin",
      headers: {},
    });
  });

  it("informa sessão expirada ao receber HTTP 401", async () => {
    mockResponse(401);
    await expect(ratingsApi.set("movie", 42, 4)).rejects.toThrow(
      "Sua sessão expirou. Entre novamente.",
    );
  });

  it("informa título inexistente ao receber HTTP 404", async () => {
    mockResponse(404);
    await expect(ratingsApi.remove("tv", 999)).rejects.toThrow(
      "Título não encontrado.",
    );
  });
});

describe("ações do usuário — acompanhamento", () => {
  it.each(["WANT_TO_WATCH", "WATCHING", "WATCHED"] as const)(
    "envia o status %s para a API",
    async (status) => {
      const fetchMock = mockResponse();
      await watchStatusApi.set("tv", 17, status);
      expect(fetchMock).toHaveBeenCalledWith("/api/watch-status/tv/17", {
        method: "PUT",
        credentials: "same-origin",
        body: JSON.stringify({ status }),
        headers: { "Content-Type": "application/json" },
      });
    },
  );

  it("remove um acompanhamento com DELETE", async () => {
    const fetchMock = mockResponse();
    await watchStatusApi.remove("movie", 42);
    expect(fetchMock).toHaveBeenCalledWith("/api/watch-status/movie/42", {
      method: "DELETE",
      credentials: "same-origin",
      headers: {},
    });
  });

  it("rejeita uma resposta de listagem inválida", async () => {
    mockResponse(200, { results: {} });
    await expect(watchStatusApi.list()).rejects.toThrow(
      "Resposta inválida do acompanhamento.",
    );
  });
});
