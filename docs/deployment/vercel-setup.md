# S1-13 — Etapa 4: preparação da Vercel (sem deploy)

## Objetivo

O frontend usa `fetch("/api/...")` com cookies de mesma origem. O `vercel.json` na raiz do monorepo configura o build da workspace web, o proxy de `/api` para a API Render e o fallback das rotas SPA (`/movie/:id`, `/favorites` etc.). O proxy remove o prefixo `/api`, pois o Fastify registra `/auth`, `/catalog`, `/favorites` etc.

## Configuração futura no painel Vercel

- Importar o repositório com **Root Directory** na raiz do monorepo (não `apps/web`).
- Framework Preset: **Other** (configuração explícita em `vercel.json`).
- Install Command: `npm ci`; Build Command: `npm run build -w @moviemix/web`; Output Directory: `apps/web/dist`.
- Antes de publicar, substituir `REPLACE_WITH_RENDER_HOST` no `vercel.json` pelo subdomínio real fornecido pelo Render (sem `https://` ou `.onrender.com` duplicados). Não usar domínio fictício em produção.
- Configurar `PUBLIC_APP_ORIGIN` na API Render como a origem HTTPS exata e estável da Vercel (por exemplo `https://moviemix.vercel.app`), sem barra final. Em produção, a API rejeita requisições de alteração sem essa configuração.
- Verificar que a Vercel mantém `Origin`, encaminha `Cookie` e devolve `Set-Cookie` pelo rewrite; testar login, refresh, logout, favoritos, notas e acompanhamento em navegador real.
- O frontend não precisa de `VITE_API_URL`: todas as chamadas continuam relativas a `/api`.

## Verificações antes de publicar

1. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`.
2. `node -e "const c=require('./vercel.json'); console.log(c.rewrites)"`.
3. `git diff --check` e `git status --short`.

## Limites e cuidados

- **Não publicar agora**: o destino do proxy ainda é um placeholder; o Render e Neon ainda não foram criados.
- O fallback SPA deve vir **depois** do proxy `/api`, para não transformar erros da API em HTML.
- Não colocar tokens TMDB, senha de banco ou `DATABASE_URL` no frontend ou no `vercel.json`.
- O domínio `*.vercel.app` escolhido para `PUBLIC_APP_ORIGIN` deve ser estável; URLs de preview têm outras origens e podem receber 403 nas operações de escrita.
- O uso do plano Hobby está sujeito às condições e limites vigentes da Vercel; não habilitar upgrades pagos.
