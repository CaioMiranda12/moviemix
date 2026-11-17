# Desenvolvimento local — PostgreSQL e Docker Compose

## Pré-requisitos

- Docker Desktop com Docker Compose v2
- Node.js 22 e npm 10
- Arquivo `.env` local (opcional para o banco; necessário para o catálogo TMDB)

## Configuração de ambiente

Copie `.env.example` para `.env` na raiz do projeto e preencha `TMDB_READ_ACCESS_TOKEN` com seu token de leitura da TMDB. **Nunca versione o `.env`.** A senha `moviemix_dev` é somente para desenvolvimento local.

As conexões são diferentes conforme o processo:

| Processo                           | Endereço do PostgreSQL |
| ---------------------------------- | ---------------------- |
| API e Drizzle no Windows           | `localhost:5433`       |
| API no Docker Compose              | `db:5432`              |
| Banco isolado de testes no Windows | `localhost:5434`       |

O Compose fornece `DATABASE_URL` diretamente ao container da API, apontando para `db:5432`. A variável `DATABASE_URL` no `.env.example` serve para comandos executados **no Windows**; ela não substitui a configuração da API dentro do Compose.

## Iniciar o projeto

Na raiz do repositório:

```powershell
npm ci
docker compose up -d --build db api
docker compose ps
```

Aplicar as migrações versionadas no banco local:

```powershell
$env:DATABASE_URL="postgres://moviemix:moviemix_dev@localhost:5433/moviemix"
npm run db:migrate -w @moviemix/api
Remove-Item Env:DATABASE_URL
```

Se alterou `POSTGRES_PASSWORD`, use a mesma senha na URL acima. Não execute `db:generate` ao apenas instalar o projeto: as migrações SQL já estão versionadas.

Em outro terminal:

```powershell
npm run dev:web
```

- Frontend: http://localhost:5173
- API: http://localhost:3333/health
- Banco pronto: http://localhost:3333/health/ready

## Banco isolado de testes

```powershell
docker compose --profile test up -d test-db
$env:DATABASE_URL="postgres://moviemix_test:moviemix_test_local@localhost:5434/moviemix_test"
npm run db:migrate -w @moviemix/api
Remove-Item Env:DATABASE_URL
$env:TEST_DATABASE_URL="postgres://moviemix_test:moviemix_test_local@localhost:5434/moviemix_test"
npm run test:integration
Remove-Item Env:TEST_DATABASE_URL
```

O banco de testes usa armazenamento temporário; não o confunda com o banco de desenvolvimento.

## Diagnóstico e cuidados

```powershell
docker compose ps
docker compose logs --tail=100 api
Invoke-RestMethod http://localhost:3333/health
Invoke-RestMethod http://localhost:3333/health/ready
```

- `docker compose down` mantém o volume de desenvolvimento. **`docker compose down -v` apaga os dados do volume**.
- Alterar `POSTGRES_PASSWORD` depois da criação do volume **não altera automaticamente** a senha do usuário já existente no PostgreSQL.
- As portas da API e dos bancos estão vinculadas a `127.0.0.1` no host. Isso não constitui uma configuração de produção.
- `/health/ready` verifica a conexão ao banco, não se todas as migrações estão aplicadas.
- Não publique tokens, senhas, cookies ou conteúdo do `.env` em commits, capturas de tela ou logs compartilhados.
- A implantação em produção exige configuração própria de secrets, banco, HTTPS, CORS/origens e migrações; este guia cobre somente desenvolvimento local.
