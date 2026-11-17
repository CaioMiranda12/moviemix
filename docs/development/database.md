# Banco de dados local — S0-12

## Pré-requisitos

- Docker Desktop iniciado e S0-07 integrada.
- PostgreSQL no Compose disponível na porta externa **5433** do Windows.
- Dependências `drizzle-orm`, `drizzle-kit` e `dotenv` instaladas no workspace da API.

## Configuração

No diretório raiz do repositório, copie `.env.example` para `apps/api/.env` **somente se** o arquivo de exemplo tiver os valores corretos para a sua máquina. Caso contrário, crie `apps/api/.env` com:

```dotenv
DATABASE_URL=postgres://moviemix:moviemix_dev@127.0.0.1:5433/moviemix
```

O valor `moviemix_dev` é o padrão do Compose da S0-07. Se você definiu `POSTGRES_PASSWORD`, use sua senha real. **Não versione o arquivo `.env`.**

## Criar e aplicar migrations

A partir da raiz:

```powershell
npm run db:generate --workspace @moviemix/api
npm run db:migrate --workspace @moviemix/api
```

A migration gerada será salva em `apps/api/drizzle/`. **Revise o SQL antes de aplicá-lo.** Não use `drizzle-kit push` como substituto de migrations versionadas.

## Conferir tabelas

```powershell
docker compose exec db psql -U moviemix -d moviemix -c "\\dt"
```

O banco deverá mostrar as sete tabelas de domínio e a estrutura interna de controle de migrations do Drizzle.

## Rebuild da API

```powershell
docker compose up --build -d
```

A API continua utilizando `db:5432` internamente. O mapeamento `5433:5432` serve apenas para ferramentas executadas no Windows.

## Observações de segurança e modelagem

- A constraint de email utiliza `lower(email)`; a aplicação ainda deve normalizar e validar email antes de inserir.
- A tabela `playlist_accesses` não garante por FK que a playlist pertence ao usuário. O serviço deverá verificar propriedade antes de gravar acessos para a seção de recentes.
- A API ainda não possui rotas CRUD ou autenticação; esta entrega implementa somente schema e migrations.
- `updated_at` deve ser atualizado explicitamente pelas futuras operações de escrita.
- A política de exclusão de contas permanece pendente; `playlists.owner_id` usa `RESTRICT` para evitar perda acidental de playlists.
