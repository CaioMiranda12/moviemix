# Patch S1-02 — Login e sessões

1. `git switch main; git pull --ff-only origin main; git switch -c feat/s1-02-user-login`
2. Extraia o patch na raiz, preservando `.git` e `.env`.
3. `npm install @fastify/rate-limit@^10 --workspace @moviemix/api` (atualiza `package-lock.json`).
4. `npm run format; npm run format:check; npm run lint; npm run typecheck; npm run test; npm run build`.
5. `docker compose --profile test up -d test-db` e configure `TEST_DATABASE_URL` conforme `docs/development/user-login.md`.
6. `npm run test:integration`.
7. `docker compose up --build -d` e teste `POST /auth/login` conforme a documentação.
8. `npm audit` (as quatro vulnerabilidades moderadas já conhecidas foram deliberadamente adiadas), `git diff --check`, revisão e PR.

O patch não altera o schema nem requer migration nova. O limitador de tentativas é por processo e precisa de backend compartilhado em produção. O middleware para autenticar cookies e logout são tarefas posteriores.
