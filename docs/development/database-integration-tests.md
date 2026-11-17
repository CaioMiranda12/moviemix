# MovieMix — Testes de integração PostgreSQL (S0-13)

Os testes usam um PostgreSQL **separado** do desenvolvimento, iniciado sob o profile `test` do Compose, com dados temporários em `tmpfs`. **Nunca execute testes de integração com a URL do banco de desenvolvimento.**

## Windows PowerShell — preparação

Na raiz do repositório:

```powershell
docker compose --profile test up -d test-db
docker compose ps
$env:TEST_DATABASE_URL = "postgres://moviemix_test:moviemix_test_local@127.0.0.1:5434/moviemix_test"
$env:DATABASE_URL = $env:TEST_DATABASE_URL
npm run db:migrate --workspace @moviemix/api
Remove-Item Env:DATABASE_URL
npm run test:integration
```

A variável `DATABASE_URL` é usada **somente para migrar o banco de testes**; os testes leem `TEST_DATABASE_URL` e validam hostname, porta, usuário e nome do banco. Não coloque URLs reais em arquivos versionados.

## Testes rápidos e qualidade

```powershell
npm run test
npm run lint
npm run typecheck
npm run build
npm run format:check
npm audit
```

## Limpeza

```powershell
Remove-Item Env:TEST_DATABASE_URL
# O banco de testes é temporário; ao remover o container seus dados são descartados.
docker compose --profile test stop test-db
```

Para reiniciar o banco de testes do zero, remova apenas o container `test-db` usando o Compose; não use `docker compose down -v`, que pode apagar o volume do banco de desenvolvimento.

## Escopo e limites

A suíte cobre constraints de e-mail, identidade de mídia, playlist, status, foreign keys e cascata de exclusão. A autorização de acesso a playlists privadas é responsabilidade da aplicação e **não** está implementada por essas constraints. A tabela `playlist_accesses` também não impede por si só que um usuário registre acesso à playlist de outro: isso será validado no serviço de domínio quando ele for implementado.
