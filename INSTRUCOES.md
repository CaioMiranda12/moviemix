# S0-12 — Patch de modelagem Drizzle

Copie o conteúdo deste ZIP para a raiz do repositório MovieMix, preservando a estrutura de pastas. Não substitua `.git`, `node_modules` ou `.env`.

**Instale as dependências e adicione os scripts com os comandos abaixo**, em vez de substituir o `package.json` atual (assim preservamos mudanças da sua S0-07):

```powershell
npm install drizzle-orm dotenv --workspace @moviemix/api
npm install -D drizzle-kit --workspace @moviemix/api
npm pkg set 'scripts.db:generate=drizzle-kit generate' --workspace @moviemix/api
npm pkg set 'scripts.db:migrate=drizzle-kit migrate' --workspace @moviemix/api
npm pkg set 'scripts.db:check=drizzle-kit check' --workspace @moviemix/api
```

No PowerShell, use os comandos acima conforme apresentados. Depois siga `docs/development/database.md`.

A geração e execução das migrations **não foram verificadas neste pacote**; valide no seu ambiente antes de fazer commit. O arquivo `apps/api/.env` é local e não deve ser versionado.
