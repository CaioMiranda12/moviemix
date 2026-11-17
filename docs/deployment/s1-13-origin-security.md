# S1-13 — Proteção de origem atrás do proxy

A Vercel encaminhará `/api/*` para o Render. A requisição pode chegar ao Fastify com `Host` diferente da origem pública exibida no navegador. Por isso, a API valida as operações que alteram dados (logout, favoritos, acompanhamento e avaliações) contra a variável **`PUBLIC_APP_ORIGIN`**, e não contra cabeçalhos de proxy enviados pelo cliente.

## Configuração

- **Desenvolvimento:** não defina `PUBLIC_APP_ORIGIN`. A comparação com `Host` continua funcionando localmente.
- **Produção (Render):** defina `PUBLIC_APP_ORIGIN=https://SEU-PROJETO.vercel.app` no painel de variáveis do serviço. Use a origem HTTPS exata, sem barra final, caminho ou parâmetros.
- **Domínio personalizado:** atualize `PUBLIC_APP_ORIGIN` para o domínio efetivamente usado pelo navegador.
- Não inclua tokens, senhas ou URLs com credenciais nessa variável.

Em produção, se a variável estiver ausente ou inválida, as operações protegidas retornam `403` (falha segura). A API rejeita origens HTTP, origens ausentes e domínios diferentes, mesmo que `X-Forwarded-Host` seja manipulado.

## Verificação antes do deploy

1. Rode `npm run test -w @moviemix/api` e `npm run typecheck`.
2. Confirme que o frontend chama `/api/...` e que o proxy da Vercel está configurado antes de publicar.
3. Após o deploy, teste login, logout, adicionar/remover favorito, avaliação e acompanhamento pelo domínio público.
4. Se houver `403` nas operações protegidas, confira a origem exata no navegador e o valor de `PUBLIC_APP_ORIGIN` no Render; não desabilite a proteção.

> Este patch não cria serviços, não executa migrações e não modifica seu `.env` local.
