# MovieMix — preparação para deploy (S1-12)

> **Status:** checklist de preparação. Nenhum ambiente de produção foi publicado ou testado nesta etapa.

## Arquitetura prevista

- **Frontend:** gerar os arquivos estáticos com `npm run build -w @moviemix/web` e servi-los em hospedagem HTTPS com fallback de SPA para `index.html`.
- **API:** executar `node apps/api/dist/server.js` em Node.js 22, com `PORT` definido pelo provedor. O servidor já escuta em `0.0.0.0`.
- **Banco:** PostgreSQL acessível pela API por uma URL privada e protegida, com backups e TLS conforme exigido pelo provedor.
- **TMDB:** `TMDB_READ_ACCESS_TOKEN` somente na API, nunca em variáveis `VITE_*` nem no bundle do navegador.

## Atenção: frontend e API precisam compartilhar a mesma origem

O frontend faz requisições relativas, como `/api/auth/login` e `/api/catalog/trending`. No desenvolvimento, o **Vite** redireciona `/api` para `localhost:3333` e remove o prefixo `/api`.

Em produção, é necessário configurar um proxy reverso ou roteador que:

1. Sirva a aplicação React em `https://SEU_DOMINIO/`.
2. Encaminhe `https://SEU_DOMINIO/api/*` para a API, **removendo `/api` do caminho** (por exemplo, `/api/health` → `/health`).
3. Encaminhe `Cookie`, `Set-Cookie`, método, corpo e cabeçalhos de origem adequadamente, preservando o domínio público e HTTPS.
4. Sirva `index.html` para rotas do React Router que não correspondam a arquivos reais, mas **não** para requisições `/api/*`.

**Não** hospede apenas os arquivos `dist` sem esse proxy: login e catálogo falhariam. Evite separar frontend e API em domínios distintos sem antes projetar e testar cookies, CORS e proteção CSRF.

## Variáveis da API

| Variável                 | Em produção               | Observação                                                      |
| ------------------------ | ------------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`           | Obrigatória               | URL PostgreSQL do provedor, nunca a credencial local de exemplo |
| `TMDB_READ_ACCESS_TOKEN` | Obrigatória para catálogo | Token privado do servidor                                       |
| `PORT`                   | Conforme o provedor       | Padrão atual: `3333`                                            |
| `NODE_ENV`               | `production`              | Ativa a flag `Secure` nos cookies de sessão                     |

Não reutilize `POSTGRES_PASSWORD=moviemix_dev` nem publique `.env`. Configure segredos no painel do provedor. O `compose.yaml` atual é **exclusivamente de desenvolvimento local**; não é um manifesto pronto para produção.

## Banco de dados e migrações

- Faça backup antes de alterações no schema e valide o procedimento de restauração.
- As migrações estão em `apps/api/drizzle/` e são aplicadas com `npm run db:migrate -w @moviemix/api`, com `DATABASE_URL` apontando para o banco correto.
- **Importante:** `drizzle-kit` é dependência de desenvolvimento e não está na imagem final da API (`npm ci --omit=dev`). Planeje executar migrações como tarefa separada em um ambiente com dependências de desenvolvimento e acesso controlado ao banco, **antes** de iniciar a nova versão. Não presuma que o container de runtime executará migrações automaticamente.
- Não rode `db:generate` contra produção nem recrie volumes para aplicar mudanças de schema.

## Verificações antes da publicação

- [ ] `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test` e `npm run build` passam.
- [ ] Integração com PostgreSQL validada no banco de testes isolado.
- [ ] Migrações aplicadas em banco de homologação com backup.
- [ ] Frontend servido em HTTPS com fallback para rotas React.
- [ ] Proxy `/api` validado sem prefixo ao chegar no Fastify.
- [ ] `GET /health` responde `200` e `GET /health/ready` responde `200` com banco disponível; readiness deve retornar `503` se o banco não estiver acessível.
- [ ] Cadastro, login, atualização de página, logout e cookies `Secure`/`HttpOnly` testados pelo navegador na URL pública.
- [ ] Catálogo, detalhes, favoritos, status, avaliações e perfil testados.
- [ ] Rate limit, logs sem segredos, política de backups, TLS e monitoramento revisados.
- [ ] Dependências e alertas do `npm audit` revisados antes de expor o serviço publicamente.

## Comandos de validação local

Na raiz do monorepo:

```powershell
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```

Para validar a API com o Docker Compose local (não é um deploy):

```powershell
docker compose up -d --build api
Invoke-RestMethod http://localhost:3333/health
Invoke-RestMethod http://localhost:3333/health/ready
```

**Próxima decisão:** escolher a hospedagem e desenhar a configuração específica do proxy, dos segredos e das migrações. Este documento não afirma que o MovieMix já está pronto para exposição pública.
