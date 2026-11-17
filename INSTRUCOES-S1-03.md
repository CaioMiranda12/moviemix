# S1-03 — Sessão autenticada e logout

## Instalação

1. Parta da `main` após o merge da S1-02, em `feat/s1-03-authenticated-session`.
2. Extraia os arquivos deste patch na raiz do repositório.
3. Não é necessário instalar dependências ou gerar migrations novas.
4. Rode `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
5. Suba o banco de testes: `docker compose --profile test up -d test-db`.
6. Defina `$env:TEST_DATABASE_URL = "postgres://moviemix_test:moviemix_test_local@127.0.0.1:5434/moviemix_test"` e rode `npm run test:integration`.
7. Rode `docker compose up --build -d`.

## API

- `GET /auth/me`: cookie válido -> 200 `{ "user": { "id": "...", "email": "..." } }`; ausente/inválido/expirado/revogado -> 401.
- `POST /auth/logout`: exige cookie válido e header `Origin` com a mesma origem da API; sucesso -> 204, revoga token no banco e limpa cookie. Origin ausente ou diferente -> 403. Sessão inválida -> 401.
- Para PowerShell local: `-Headers @{ Origin = "http://localhost:3333" } -WebSession $movieSession -UseBasicParsing` no logout.

## Segurança e limites

O logout requer Origin de mesma origem como defesa CSRF. A infraestrutura de produção deve validar Host e aplicar HTTPS. Cookies são HttpOnly, SameSite=Lax e Secure em produção. A proteção de rotas privadas futuras pode reutilizar `makeRequireAuth`. O token não é retornado no JSON e só o hash SHA-256 é consultado no banco. Rate limiting distribuído, limpeza periódica de sessões expiradas e quatro alertas moderados transitivos do Drizzle Kit permanecem pendentes.
