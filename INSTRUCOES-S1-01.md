# Aplicação do patch S1-01

1. `git switch main; git pull --ff-only origin main; git switch -c feat/s1-01-user-registration`
2. Extrair o ZIP na raiz do repositório, preservando a estrutura e sobrescrevendo os arquivos `apps/api/src/app.ts` e `apps/api/src/server.ts`.
3. `npm install argon2 zod --workspace @moviemix/api` — **obrigatório**, pois o patch não contém `package-lock.json` gerado.
4. `npm run format; npm run format:check; npm run lint; npm run typecheck; npm run test; npm run build`
5. `$env:TEST_DATABASE_URL = "postgres://moviemix_test:moviemix_test_local@127.0.0.1:5434/moviemix_test"`
6. `docker compose --profile test up -d test-db`; se o banco foi reiniciado e está vazio, aplicar migrations usando `DATABASE_URL=$env:TEST_DATABASE_URL` no PowerShell; depois remover `DATABASE_URL`.
7. `npm run test:integration`
8. `npm audit`; resolver/revisar pendências antes do PR.
9. `docker compose up --build -d`; testar com `Invoke-RestMethod -Method Post -Uri http://localhost:3333/auth/register -ContentType application/json -Body '{"email":"teste-unico@example.com","password":"senha-forte-123456"}'`.
10. Conferir `git diff --check`, arquivos staged, commit e PR.

Nota: não executamos npm install/testes neste ambiente porque a dependência `argon2` não está em cache e o registro npm não estava acessível. Os testes precisam ser validados na sua máquina.
