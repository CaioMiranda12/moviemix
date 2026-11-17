# S1-02 — Login de usuários

`POST /auth/login` aceita `{ "email": "user@example.com", "password": "..." }`.

- Sucesso: HTTP 200, `{ "user": { "id": "...", "email": "..." } }` e cookie `moviemix_session`.
- Credenciais incorretas: HTTP 401 e mensagem genérica.
- Corpo inválido: HTTP 400.
- Excesso de tentativas: HTTP 429 (limite local de 5 requisições/minuto por IP).
- Erro interno: HTTP 500 sem detalhes internos.

A senha é verificada com Argon2id. O token aleatório tem 32 bytes (hex) e apenas seu SHA-256 é persistido na tabela `sessions`. Expira em sete dias. Cookie: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=604800` e `Secure` quando `NODE_ENV=production`.

**Escopo:** esta issue cria sessões, mas ainda não implementa leitura do cookie, `GET /auth/me`, logout ou revogação. Não use o cookie como prova de autenticação em endpoints privados até implementar middleware que valide o hash, a expiração e a associação ao usuário. Antes de expor endpoints que alteram estado autenticado, implementar proteção CSRF e política de origem. O limitador em memória funciona por processo e não é adequado para múltiplas réplicas; para produção, usar armazenamento compartilhado e revisar limites e proxy confiável.

## Testes

```powershell
npm run test
$env:TEST_DATABASE_URL = "postgres://moviemix_test:moviemix_test_local@127.0.0.1:5434/moviemix_test"
npm run test:integration
```

## Teste manual

```powershell
$body = @{ email = "primeiro.usuario@example.com"; password = "SenhaSegura123456!" } | ConvertTo-Json
Invoke-WebRequest -Method Post -Uri "http://localhost:3333/auth/login" -ContentType "application/json" -Body $body -SessionVariable movieSession
$movieSession.Cookies.GetCookies("http://localhost:3333")
```

Nunca versionar senhas reais, cookies ou tokens. As quatro vulnerabilidades moderadas previamente conhecidas do Drizzle Kit continuam como pendência técnica.
