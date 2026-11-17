# MovieMix — plano de deploy gratuito (S1-13)

> **Estado:** configuração inicial para revisão. Nenhum serviço foi criado ou publicado por este patch.

## Arquitetura planejada

- **Vercel Hobby:** frontend estático React/Vite, com fallback para rotas da SPA e rewrite de `/api/*` para a API.
- **Render Free:** API Fastify (Node.js 22), usando o `render.yaml` na raiz do repositório.
- **Neon Free:** PostgreSQL persistente, com credenciais armazenadas somente nos painéis dos provedores.

Planos gratuitos têm cotas, restrições de uso e podem mudar. Não configure serviços pagos, upgrades ou cartão de crédito sem revisar os termos vigentes.

## O que já funciona no código

- A API escuta em `0.0.0.0` e usa `PORT` quando definido pelo provedor.
- O runtime da API é iniciado com `npm run start -w @moviemix/api`.
- `/health` verifica o processo; `/health/ready` verifica a conexão PostgreSQL.
- O frontend chama `/api/...` usando a origem do próprio site.
- O cookie de sessão é `HttpOnly`, `SameSite=Lax` e recebe `Secure` com `NODE_ENV=production`.

## Pontos que ainda precisam de implementação/validação

1. **Proxy Vercel:** o Vite remove `/api` apenas no desenvolvimento. Em produção, configurar rewrite `/api/:path*` para `https://<api-render>/:path*`, preservando o método, corpo, cookies e `Set-Cookie`. A URL definitiva depende do endereço realmente atribuído pelo Render. A configuração não está incluída neste patch para evitar publicar uma URL fictícia.
2. **Origem no logout:** `isSameOrigin` compara o cabeçalho `Origin` com `request.protocol` e `Host`. Um proxy externo pode apresentar ao Fastify o host interno/Render em vez do host Vercel, causando `403` no logout. **Não desabilitar essa proteção.** Antes da publicação, adaptar e testar a validação de origem para um domínio público explicitamente configurado e confiável.
3. **Migrações:** executar `npm run db:migrate -w @moviemix/api` com `DATABASE_URL` apontando para o Neon, em um ambiente controlado com `drizzle-kit` instalado, antes de iniciar a API. O `render.yaml` **não** executa migrações automaticamente.
4. **TLS do banco:** usar a URL de conexão recomendada pelo Neon e confirmar as exigências de SSL/TLS. Nunca usar credenciais locais em produção.
5. **CORS/cookies:** confirmar o funcionamento do proxy e do cookie na URL pública com cadastro, login, refresh, logout e ações autenticadas.
6. **Vercel:** configurar Root Directory e comandos de build compatíveis com o npm workspaces; não presumir que selecionar apenas `apps/web` instalará corretamente as dependências do monorepo.
7. **Segurança:** revisar `npm audit`, rate limiting, política de dados e disponibilidade antes de abrir a aplicação ao público.

## Render Blueprint (ainda não aplicar)

O `render.yaml` descreve **somente a API**, não cria o Neon ou o frontend. `DATABASE_URL` e `TMDB_READ_ACCESS_TOKEN` estão declarados como valores a serem fornecidos no painel (`sync: false`); não há segredos no repositório. O health check depende do banco e só ficará saudável depois da migração e da configuração de conexão.

## Comandos locais de validação

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```

**Próxima etapa:** configurar e testar a validação segura de origem no backend antes de ativar o proxy público; depois obter a URL real do Render e preparar o rewrite da Vercel.
