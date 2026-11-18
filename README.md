# MovieMix 🎬

**Descubra filmes e séries e organize o que você quer assistir.** Aplicação web em português, com catálogo integrado à TMDB, conta pessoal, favoritos, acompanhamento de consumo, avaliações e um painel de estatísticas.

> **Estado do projeto:** MVP funcional, publicado e validado em produção. O desenvolvimento continua conforme o planejamento das próximas sprints.
>
> **Demonstração online:** https://moviemix.vercel.app
>
> **API:** https://moviemix-api-j6u4.onrender.com

## Funcionalidades

- Cadastro, login e logout, com sessões persistidas no PostgreSQL.
- Descoberta de títulos em destaque, busca por filmes e séries e páginas de detalhes, com dados da **TMDB**.
- **Minha Lista:** adicionar e remover filmes e séries favoritos.
- **Meu acompanhamento:** classificar títulos como _Quero assistir_, _Assistindo_ ou _Concluído_.
- **Minhas avaliações:** atribuir, alterar e remover notas pessoais de 1 a 5 estrelas.
- **Meu perfil:** consultar totais de favoritos, títulos por status, avaliações e média das notas.
- Interface responsiva com navegação por teclado, estados de carregamento e tratamento de erros.

## Tecnologias

| Camada       | Tecnologias                                                                   |
| ------------ | ----------------------------------------------------------------------------- |
| Frontend     | React 19, TypeScript, Vite 6, Tailwind CSS 4, React Router                    |
| API          | Node.js 22, Fastify 5, TypeScript, Zod                                        |
| Dados        | PostgreSQL 17, Drizzle ORM e migrações SQL versionadas                        |
| Autenticação | Argon2id, sessões e cookies HttpOnly                                          |
| Testes       | Vitest, Fastify `inject()`, React Testing Library, jsdom e PostgreSQL isolado |
| Ferramentas  | npm workspaces, Docker Compose, ESLint e Prettier                             |

## Hospedagem

O MovieMix está publicado utilizando serviços com planos gratuitos:

| Serviço        | Plataforma   | Responsabilidade     |
| -------------- | ------------ | -------------------- |
| Frontend       | Vercel Hobby | Aplicação React/Vite |
| Backend        | Render Free  | API Fastify          |
| Banco de dados | Neon Free    | PostgreSQL           |

O frontend utiliza o proxy `/api` da Vercel para encaminhar requisições ao backend no Render.

As credenciais do banco e da TMDB permanecem exclusivamente nas variáveis de ambiente da API.

**Observação:** por utilizar o plano gratuito do Render, a API pode demorar alguns segundos para responder após um período de inatividade.

Para detalhes de configuração, consulte `docs/deployment/`.

## Estrutura do repositório

```text
apps/
  api/            API Fastify, módulos, schema Drizzle e testes
  web/            Aplicação React, páginas, componentes e testes
docs/
  architecture/   Visão geral da arquitetura
  development/    Guias técnicos e de desenvolvimento
  product/        Documentação de produto
  sprints/        Planejamento das sprints
compose.yaml      PostgreSQL, banco de testes e API em Docker
```

## Como executar localmente (Windows / PowerShell)

### Pré-requisitos

- Node.js **22** e npm **10** ou superior.
- Docker Desktop com Docker Compose.
- Um **TMDB API Read Access Token** para utilizar o catálogo.

### 1. Instalar as dependências

Na raiz do repositório:

```powershell
npm ci
```

### 2. Configurar o token da TMDB

Crie um arquivo `.env` **na raiz** do projeto, sem versioná-lo:

```dotenv
TMDB_READ_ACCESS_TOKEN=SEU_TOKEN_AQUI
```

O Compose lê esse valor ao iniciar a API. O banco de desenvolvimento usa por padrão a senha local `moviemix_dev`; para alterá-la, defina `POSTGRES_PASSWORD` no mesmo `.env` **antes da primeira criação do volume**. Nunca use essas credenciais de exemplo em produção.

> **Atenção às portas:** no Windows, o PostgreSQL de desenvolvimento está em `localhost:5433`. Dentro do Docker, a API acessa o banco por `db:5432`. O `.env.example` existente ainda contém uma URL com `localhost:5432`; não a copie sem corrigir a porta para seu ambiente.

### 3. Subir o banco e a API

```powershell
docker compose up -d --build db api
```

### 4. Aplicar as migrações no banco de desenvolvimento

```powershell
$env:DATABASE_URL="postgres://moviemix:moviemix_dev@localhost:5433/moviemix"
npm run db:migrate -w @moviemix/api
Remove-Item Env:DATABASE_URL
```

Se você alterou `POSTGRES_PASSWORD`, substitua a senha na URL acima. As migrações já estão versionadas: **não é necessário executar `db:generate`** para iniciar o projeto.

### 5. Iniciar o frontend

Em outro terminal PowerShell:

```powershell
npm run dev:web
```

- **Aplicação:** http://localhost:5173
- **API (liveness):** http://localhost:3333/health
- **API (banco pronto):** http://localhost:3333/health/ready

O Vite encaminha as chamadas `/api/*` para a API local na porta `3333`. Crie uma conta pela interface para começar.

## Testes e qualidade

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

### Testes de integração com PostgreSQL

Os testes de integração usam um banco **separado** (`localhost:5434`), nunca o banco de desenvolvimento:

```powershell
docker compose --profile test up -d test-db
$env:TEST_DATABASE_URL="postgres://moviemix_test:moviemix_test_local@localhost:5434/moviemix_test"
$env:DATABASE_URL=$env:TEST_DATABASE_URL
npm run db:migrate -w @moviemix/api
Remove-Item Env:DATABASE_URL
npm run test:integration
Remove-Item Env:TEST_DATABASE_URL
```

Mais detalhes em [testes de integração](docs/development/database-integration-tests.md).

## API — principais rotas

| Método                  | Rota                               | Descrição                  |
| ----------------------- | ---------------------------------- | -------------------------- |
| `POST`                  | `/auth/register`                   | Criar conta                |
| `POST`                  | `/auth/login`                      | Entrar                     |
| `GET`                   | `/auth/me`                         | Consultar sessão           |
| `POST`                  | `/auth/logout`                     | Sair                       |
| `GET`                   | `/catalog/trending`                | Títulos em destaque        |
| `GET`                   | `/catalog/search`                  | Buscar por título          |
| `GET`                   | `/catalog/:mediaType/:id`          | Detalhes de filme ou série |
| `GET`, `POST`, `DELETE` | `/favorites` e rotas de remoção    | Gerenciar favoritos        |
| `GET`, `PUT`, `DELETE`  | `/watch-status` e rotas por título | Gerenciar acompanhamento   |
| `GET`, `PUT`, `DELETE`  | `/ratings` e rotas por título      | Gerenciar avaliações       |
| `GET`                   | `/profile/stats`                   | Estatísticas pessoais      |

As rotas de dados pessoais exigem autenticação. Consulte os arquivos `*.routes.ts` em `apps/api/src/modules/` para os parâmetros e contratos exatos.

## Segurança e configuração

- Não versione `.env`, senhas ou tokens da TMDB.
- A API utiliza cookies de sessão `HttpOnly` e verifica a origem em operações que modificam dados.
- Consulte `npm audit` periodicamente para acompanhar vulnerabilidades nas dependências.
- O Docker Compose é utilizado apenas no ambiente de desenvolvimento local.
- Em produção, o frontend utiliza HTTPS na Vercel, a API é hospedada no Render e o PostgreSQL é gerenciado pelo Neon.
- A API valida a origem das requisições que modificam dados utilizando `PUBLIC_APP_ORIGIN`.
- As credenciais de produção são armazenadas nas variáveis de ambiente dos serviços, nunca no repositório.

## Capturas de tela

As imagens de demonstração serão adicionadas depois da validação visual. Sugestões: catálogo, detalhes de um título, Minha Lista, Meu acompanhamento, Minhas avaliações e Meu perfil. Não inclua dados reais de usuários nas capturas.

## Créditos

Os metadados e imagens de filmes e séries são fornecidos pela **TMDB (The Movie Database)**. Este projeto usa a API da TMDB, mas não é endossado nem certificado pela TMDB.

## Próximos passos

- Continuar o desenvolvimento conforme o roadmap documentado em `docs/sprints/`.
- Adicionar capturas de tela da aplicação publicada.
- Evoluir a experiência de uso e implementar as funcionalidades previstas nas próximas sprints.
- Manter os testes automatizados e a documentação atualizados a cada entrega.
