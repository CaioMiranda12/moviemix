import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { FavoriteButton } from "./FavoriteButton";
import { RatingControl } from "./RatingControl";

function renderWithRouter(component: ReactNode, initialPath = "/") {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[initialPath]}>{component}</MemoryRouter>,
  );
}

describe("componentes do frontend — renderização inicial", () => {
  it("mostra os campos obrigatórios e botão de login", () => {
    const html = renderWithRouter(<LoginForm onLogin={() => {}} />);
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).toMatch(/autocomplete="email"/i);
    expect(html).toContain("Entre na sua conta");
    expect(html).toContain("Entrar");
  });

  it("mostra confirmação de cadastro após redirecionamento", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter
        initialEntries={[{ pathname: "/login", state: { registered: true } }]}
      >
        <LoginForm onLogin={() => {}} />
      </MemoryRouter>,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain("Conta criada com sucesso!");
  });

  it("exibe os campos de cadastro e exige senha de 12 caracteres", () => {
    const html = renderWithRouter(<RegisterForm />);
    expect(html).toContain("Crie sua conta");
    expect(html).toContain('type="email"');
    expect(html).toMatch(/minlength="12"/i);
    expect(html).toContain("Confirmar senha");
  });

  it("mantém o botão de favoritos desabilitado enquanto consulta", () => {
    const html = renderToStaticMarkup(
      <FavoriteButton mediaType="movie" id={42} />,
    );
    expect(html).toContain("Consultando favoritos...");
    expect(html).toContain("disabled");
    expect(html).toContain('aria-pressed="false"');
  });

  it("mostra cinco botões acessíveis de avaliação", () => {
    const html = renderToStaticMarkup(<RatingControl mediaType="tv" id={17} />);
    for (let score = 1; score <= 5; score++) {
      expect(html).toContain(
        `aria-label="Avaliar com ${score} ${score === 1 ? "estrela" : "estrelas"}"`,
      );
    }
    expect(html).toContain("Sem avaliação");
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(5);
  });
});
