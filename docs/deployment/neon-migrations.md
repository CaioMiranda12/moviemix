# S1-13 — Etapa 5: Neon Free e migrações Drizzle

## Estado atual

Preparação **sem criação de serviço, cobrança ou migração executada**. O banco local do Docker permanece independente do banco de produção.

O projeto usa `pg` + Drizzle ORM e `DATABASE_URL` no backend. As migrações existentes estão em `apps/api/drizzle` e são executadas com `npm run db:migrate -w @moviemix/api` (a configuração Drizzle lê `DATABASE_URL`).

Migrações versionadas, na ordem do journal:

1. `0000_motionless_masked_marvel.sql`
2. `0001_amused_adam_warlock.sql`
3. `0002_slippery_scarlet_spider.sql`

**Não executar `db:generate` para o deploy**: gerar SQL novo não é necessário para aplicar migrações já existentes. **Não usar `db:push`** em produção.

## Antes de criar o banco

- Confirmar no painel do Neon que o projeto escolhido é **Free** e que não há opção paga ou upgrade automático habilitado.
- Criar um projeto PostgreSQL separado do Docker local. Guardar o nome do projeto e a região escolhida; não registrar senhas no repositório.
- Copiar a **connection string** PostgreSQL oferecida pelo Neon, preferindo a conexão direta para a execução das migrações. Para a API, usar a string recomendada pelo Neon para conexões de aplicação; conferir no painel se o endpoint é direto ou pooled.
- Confirmar que a URL contém o banco correto e TLS/SSL habilitado conforme as instruções do provedor (em geral `sslmode=require`). Não publicar a URL completa em logs, issues ou mensagens.
- Não criar um segundo banco pago por engano.

## Procedimento futuro de migração — Windows PowerShell

**Executar somente quando o banco Neon Free estiver criado e a URL correta tiver sido conferida.**

Abra um terminal PowerShell na raiz do monorepo. O comando abaixo solicita a URL sem ecoar os caracteres digitados e a mantém apenas na sessão atual. Atenção: depois da conversão, a string ficará em texto simples na variável de ambiente do processo, como exigido pelo Drizzle; não compartilhe dumps do ambiente.

```powershell
$secureUrl = Read-Host 'Cole a DATABASE_URL do Neon (entrada oculta)' -AsSecureString
$env:DATABASE_URL = [System.Net.NetworkCredential]::new('', $secureUrl).Password
Remove-Variable secureUrl

# Confirma o hostname sem imprimir usuario, senha ou parametros da URL.
$databaseHost = ([uri]$env:DATABASE_URL).Host
Write-Host "Host do banco:" $databaseHost
if ($databaseHost -notlike '*.neon.tech') {
  throw 'O host nao parece ser do Neon. Migração interrompida.'
}

npm run db:check -w @moviemix/api
# APENAS depois de revisar a URL e confirmar que este e o banco de producao:
npm run db:migrate -w @moviemix/api

# Limpa a credencial desta sessao do PowerShell apos o comando.
Remove-Item Env:DATABASE_URL
Remove-Variable databaseHost
```

**Observações:** `db:check` verifica a consistência dos arquivos de migração; não confirma que o banco remoto está vazio ou é o banco pretendido. O comando `db:migrate` modifica o banco indicado por `DATABASE_URL`. Nunca executá-lo com uma URL incerta. Se houver erro, **não** repetir comandos às cegas; guardar somente a mensagem sem credenciais e investigar.

Se interromper o processo antes da limpeza, execute `Remove-Item Env:DATABASE_URL` manualmente. O histórico de comandos acima não contém a URL, mas evite executar `Get-ChildItem Env:` e publicar o resultado.

## Configuração posterior do Render

- Definir `DATABASE_URL` no painel do Render como segredo, usando a string de conexão Neon adequada para a aplicação.
- Definir `TMDB_READ_ACCESS_TOKEN` como segredo; `NODE_ENV=production` e `PUBLIC_APP_ORIGIN` como origem HTTPS exata do frontend.
- Não incluir credenciais em `render.yaml`, `vercel.json` ou `.env.example`.
- Verificar `GET /health/ready` após iniciar a API: `200` indica que a checagem de conexão ao banco respondeu; `503` requer investigação.
- A criação de tabelas **não** ocorre automaticamente no start da API; migrar antes do primeiro deploy funcional.

## Validação local sem tocar no Neon

```powershell
npm run db:check -w @moviemix/api
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
git status --short
```

`db:check` deve funcionar sem conexão com banco, mas `drizzle.config.ts` exige que `DATABASE_URL` exista. Use a URL local **já configurada no seu `.env`**, sem mudar para Neon nesta etapa. Se não houver `.env`, não crie uma URL fictícia de produção: faça apenas os demais checks e avise.
