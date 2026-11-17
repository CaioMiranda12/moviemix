# Visão de arquitetura — rascunho

O MovieMix será um **monólito modular**: frontend React separado de uma API Fastify, com PostgreSQL como fonte de verdade dos dados próprios e integração com TMDB encapsulada no módulo de catálogo.

Módulos previstos: auth, users, catalog, playlists, library, recommendations. Administração e moderação são pós-MVP.

As decisões detalhadas foram elaboradas durante o planejamento e deverão ser consolidadas nos ADRs antes da implementação dos módulos correspondentes.
