# Patch S0-07 para o MovieMix

Este ZIP contém **somente arquivos novos ou modificados**, não um repositório completo. Extraia o conteúdo na **raiz do seu projeto**, aceitando substituir `README.md`, `apps/api/package.json`, `apps/api/src/app.ts` e `apps/api/src/server.ts`. Não sobrescreva `.git`.

1. `git switch -c feat/s0-07-postgres-docker`
2. Copie os arquivos do patch para a raiz do repositório.
3. `npm install` (gera o lockfile atualizado para `pg` e `@types/pg`).
4. `npm run format` e execute lint, typecheck, test e build.
5. `docker compose up --build -d` e verifique `/health/ready`.
6. Revise `git diff` e registre o commit.

O pacote **não inclui** `node_modules`, `.git`, segredos nem `package-lock.json` regenerado.
