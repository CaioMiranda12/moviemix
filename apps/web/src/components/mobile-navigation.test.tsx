// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MobileNavigation } from "./MobileNavigation";

describe("MobileNavigation", () => {
  it("oferece cinco destinos acessíveis e indica a página atual", () => {
    render(
      <MemoryRouter initialEntries={["/ratings"]}>
        <MobileNavigation />
      </MemoryRouter>,
    );
    const nav = screen.getByRole("navigation", {
      name: "Navegação principal mobile",
    });
    expect(nav).toBeTruthy();
    for (const name of [
      "Explorar",
      "Favoritos",
      "Notas",
      "Assistindo",
      "Mais",
    ]) {
      expect(screen.getByRole("link", { name })).toBeTruthy();
    }
    expect(
      screen.getByRole("link", { name: "Notas" }).getAttribute("aria-current"),
    ).toBe("page");
  });
});
