# MovieMix — roteiro de demonstração (5–7 minutos)

Este roteiro apresenta **funcionalidades já implementadas** no projeto. A demonstração é local: não pressupõe URL pública nem deploy em produção.

## Preparação (antes de gravar ou apresentar)

1. Confirme que o PostgreSQL, a API e o frontend estão em execução, conforme o [README](../../README.md).
2. Confira `http://localhost:3333/health` e `http://localhost:3333/health/ready` e abra `http://localhost:5173`.
3. Verifique que o token da TMDB está configurado no `.env` local. **Nunca mostre o arquivo, token, cookies ou senhas na gravação.**
4. Use uma conta de demonstração, sem dados pessoais. Deixe previamente escolhidos um filme e uma série conhecidos, mas confirme que estão disponíveis no catálogo antes da apresentação.
5. Se houver dados antigos na conta, avalie se prefere uma conta nova para tornar o fluxo mais claro.

## Apresentação guiada

| Tempo aproximado | Ação na interface                                                                        | O que explicar                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 0:00–0:40        | Abrir login; apresentar o cadastro ou entrar na conta de demonstração                    | Autenticação com sessões persistidas e cookies HttpOnly; senhas protegidas com Argon2id |
| 0:40–1:40        | Abrir catálogo; buscar um filme e depois uma série                                       | Integração da API com a TMDB, descoberta e busca por tipo de mídia                      |
| 1:40–2:30        | Abrir os detalhes de um título                                                           | Pôster, sinopse e metadados obtidos do catálogo externo                                 |
| 2:30–3:15        | Adicionar o título aos favoritos e abrir **Minha Lista**                                 | Dados pessoais persistidos no PostgreSQL, separados por usuário                         |
| 3:15–4:00        | Marcar **Quero assistir**, **Assistindo** ou **Concluído**; abrir **Meu acompanhamento** | Acompanhamento do progresso de consumo                                                  |
| 4:00–4:45        | Atribuir uma nota de 1 a 5 estrelas; abrir **Minhas avaliações**                         | Avaliações pessoais que podem ser alteradas ou removidas                                |
| 4:45–5:30        | Abrir **Meu perfil**                                                                     | Indicadores de favoritos, status, quantidade de avaliações e média                      |
| 5:30–6:15        | Reduzir a largura da janela e usar a tecla Tab                                           | Layout responsivo, foco visível e navegação por teclado                                 |
| 6:15–7:00        | Encerrar a sessão e mostrar brevemente a estrutura do repositório                        | Separação React/Fastify, testes e infraestrutura local                                  |

Os tempos são sugestões, não medições do aplicativo. Se o cadastro já estiver pronto, mostre o login para economizar tempo.

## Mensagem curta para apresentar o projeto

> O MovieMix é uma aplicação full-stack para descobrir filmes e séries e organizar o que assistir. Desenvolvi um frontend React com TypeScript, uma API Fastify e persistência em PostgreSQL com Drizzle. A integração com a TMDB alimenta o catálogo; cada usuário pode salvar favoritos, acompanhar o que assiste, avaliar títulos e consultar suas estatísticas. O projeto também conta com testes automatizados, Docker para desenvolvimento e melhorias de acessibilidade.

## Se algo não funcionar durante a apresentação

- **Catálogo indisponível:** confira a API e a configuração do token da TMDB. Não exponha o token ao compartilhar a tela.
- **Login ou dados pessoais falhando:** confira a disponibilidade do PostgreSQL e as migrações. Evite editar o banco durante a demonstração.
- **Sem resultados na busca:** tente outro título ou retorne aos destaques; não prometa disponibilidade de títulos específicos na TMDB.
- **Ambiente fora do ar:** tenha capturas de tela próprias, sem dados sensíveis, como plano alternativo. Não apresente imagens estáticas como se fossem uma execução ao vivo.

## Capturas recomendadas para o portfólio

Produza imagens reais da aplicação em execução: catálogo, detalhes, Minha Lista, acompanhamento, avaliações e Meu perfil. Prefira uma conta de demonstração e oculte endereços de e-mail pessoais. Coloque as imagens em `docs/portfolio/screenshots/` apenas quando estiverem prontas; este patch não inclui capturas fictícias.

## Transparência técnica

- A aplicação **ainda não possui deploy de produção validado**. Consulte [o checklist de produção](../deployment/production-readiness.md).
- O conteúdo de filmes e séries é fornecido pela **TMDB**. Não afirme que a TMDB endossa ou certifica o projeto.
- Playlists colaborativas, streaming de vídeo e painel administrativo não fazem parte deste roteiro porque não estão implementados.
