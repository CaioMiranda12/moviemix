# S0-07 — PostgreSQL e Docker Compose

## Pré-requisitos

- Docker Desktop com Docker Compose v2
- Node.js 22 e npm 10 para os comandos locais

## Instalação do patch

Aplique os arquivos deste patch sobre a raiz do repositório, preservando `.git` e os demais arquivos.
**Depois execute `npm install` na raiz**, pois as novas dependências `pg` e `@types/pg` precisam ser registradas no `package-lock.json` antes do `docker compose build` (o patch não inclui um lockfile regenerado).

## Executar os serviços

```powershell
docker compose up --build -d
docker compose ps
Invoke-RestMethod http://localhost:3333/health
Invoke-RestMethod http://localhost:3333/health/ready
```

Esperado: `/health` retorna `{ "status": "ok" }` e `/health/ready` retorna `{ "status": "ready", "database": "connected" }`.

```powershell
docker compose logs -f api
docker compose down
```

`docker compose down` preserva o volume. **Não use `docker compose down -v`** sem desejar apagar os dados locais.

## Executar a API no host

Inicie somente o banco:

```powershell
docker compose up -d db
$env:DATABASE_URL = "postgres://moviemix:moviemix_dev@localhost:5432/moviemix"
npm run dev:api
```

A API lê `DATABASE_URL` do ambiente do processo; o arquivo `.env.example` é somente um modelo, **não é carregado automaticamente**. No Docker Compose a variável é fornecida pelo próprio Compose.

## Verificações

```powershell
npm run format
npm run lint
npm run typecheck
npm run test
npm run build
npm audit
```

## Segurança e limites

- A senha padrão é **somente para desenvolvimento**; altere-a para outros ambientes.
- A publicação de portas está restrita ao `127.0.0.1` do host.
- `/health/ready` realiza `SELECT 1`, mas **não valida migrations ou tabelas de domínio**.
- A conexão ao banco é realizada pelo pacote `pg`; o Drizzle ORM e as migrations virão em uma próxima issue.
- Não versionar `.env` ou credenciais.
- Se mudar a senha após a criação do volume, o PostgreSQL não atualiza automaticamente a senha do usuário existente.
