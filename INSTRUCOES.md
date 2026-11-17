# Patch S0-13

Aplique os arquivos deste ZIP na raiz do repositório MovieMix, preservando `.git` e os demais arquivos. O patch altera `compose.yaml`, `package.json`, `apps/api/package.json` e adiciona a configuração, os testes e a documentação. **Não sobrescreva `package-lock.json`**; nenhum pacote novo é necessário.

Leia `docs/development/database-integration-tests.md` para os comandos PowerShell. Antes de começar: `git switch main; git pull --ff-only origin main; git switch -c test/s0-13-database-integrity`.

O PostgreSQL de testes é separado e usa a porta 5434. Não use credenciais ou URLs de produção.
