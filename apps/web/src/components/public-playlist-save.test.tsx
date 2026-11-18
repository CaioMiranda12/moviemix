import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { PublicPlaylistPage } from "./PublicPlaylistPage";

describe("F3-05: coleção compartilhada", () => {
  it("mantém a página pública disponível para visitantes anônimos", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/shared/lists/example"]}>
        <PublicPlaylistPage isAuthenticated={false} />
      </MemoryRouter>,
    );
    expect(html).toContain("Carregando coleção");
    expect(html).toContain("MovieMix");
  });

  it("mantém a página pública disponível para visitantes autenticados", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/shared/lists/example"]}>
        <PublicPlaylistPage isAuthenticated />
      </MemoryRouter>,
    );
    expect(html).toContain("Carregando coleção");
  });
});
