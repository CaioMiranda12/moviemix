# MovieMix 🎬

Aplicação web mobile-first para descoberta e organização de filmes e séries em playlists. **Status: Sprint 0 — fundação técnica.**

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS v4
- Backend: Node.js, TypeScript, Fastify
- Monorepo: npm workspaces
- Testes iniciais: Vitest e Fastify `inject()`
- Banco de dados planejado: PostgreSQL + Drizzle ORM (ainda não configurados)

## Pré-requisitos

- Node.js 22 ou superior
- npm 10 ou superior

## Instalação

```bash
npm install
```

Após a instalação, execute **em dois terminais**:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

- Web: http://localhost:5173
- API health: http://localhost:3333/health

## Verificações

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Para corrigir formatação automaticamente:

```bash
npm run format
```

## Estrutura

```text
apps/
  web/        React + Vite + Tailwind
  api/        Fastify + testes HTTP
docs/
  architecture/
  development/
  product/
  sprints/
```

## Próximos passos

- S0-07: Docker Compose e PostgreSQL
- S0-09: GitHub Actions
- Sprint 1: catálogo e integração TMDB

**Nota:** Este pacote é um scaffold inicial. Ainda não implementa autenticação, catálogo, playlists, persistência ou painel administrativo.

## PostgreSQL + Docker Compose (S0-07)

Veja [o guia Docker](docs/development/docker.md). Após aplicar o patch, execute `npm install` para atualizar o lockfile, depois `docker compose up --build -d`.

- Liveness: `http://localhost:3333/health`
- Readiness (PostgreSQL): `http://localhost:3333/health/ready`
