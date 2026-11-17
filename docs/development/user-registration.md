# S1-01 — Cadastro de usuários

## Contrato

`POST /auth/register` recebe `{ "email": "user@example.com", "password": "senha-com-12-ou-mais" }`.

- `201`: `{ id, email, createdAt }`.
- `400`: entrada inválida; e-mail válido com até 254 caracteres; senha entre 12 e 128 caracteres.
- `409`: e-mail já existente (índice único case-insensitive do PostgreSQL).
- `500`: erro interno genérico, sem detalhes sensíveis.

O e-mail é normalizado com `trim()` e `toLowerCase()`. A senha não é modificada; é armazenada como hash Argon2id. Não há login automático nesta issue.

## Executar

1. `npm install argon2 zod --workspace @moviemix/api` (atualiza `package-lock.json`).
2. `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`.
3. Subir `docker compose --profile test up -d test-db`, aplicar as migrations ao banco de testes se necessário, configurar `TEST_DATABASE_URL` e executar `npm run test:integration`.
4. `npm run format`, `npm run format:check`, `npm audit`.
5. Reconstruir API: `docker compose up --build -d` e enviar requisição de cadastro. Não reutilizar e-mail entre execuções.

**Segurança:** `POST /auth/register` só fica habilitado quando a API tem conexão configurada. Os testes de integração usam transação e rollback. Não registre senhas nem tokens em logs. Para produção, adicionar rate limiting e revisão de política de senhas antes de expor o endpoint publicamente.
