# Sailor Pages Static Public Rendering

## Contexto

Ultimos commits mexeram em polish do inspector e icones/collapsibles de Pages. O fluxo atual tem backend capaz de renderizar HTML em `server/src/core/routes/pages.routes.ts`, mas o frontend Vue tambem registra `/pages/:pageId/preview` e `/p/:slug` em `client-vue/src/app/router.ts`. Isso faz a pagina publicada cair no app Vue, carregar o Sailor inteiro e quebrar quando tentamos renderizar `<style>` no template.

## Objetivo

Servir preview e paginas publicadas como HTML real do backend, fora do app Vue. O editor continua em Vue. Site publicado nao.

## Riscos

- Rotas `/p/:slug` podem conflitar com rotas Vue/profile se o fallback SPA capturar antes do backend.
- Scripts/CSS de pagina publicada precisam continuar sanitizados no renderer.
- Preview nao deve acionar actions publicadas por acidente.

## Plano

- [x] Criar/ajustar testes essenciais de rota backend para garantir:
  - `/pages/:pageId/preview` retorna `text/html` completo.
  - `/p/:slug` retorna `text/html` completo.
  - rotas nao retornam shell do Vue.

- [x] Remover `PublicSailorPage.vue` do fluxo de Pages:
  - Remover rota Vue `/pages/:pageId/preview`.
  - Remover rota Vue `/p/:slug`.
  - Manter outras rotas publicas existentes de forms sem mexer.

- [x] Garantir ordem correta no servidor:
  - Backend deve responder `/pages/:pageId/preview` e `/p/:slug` antes do fallback do frontend.
  - Se existir fallback SPA pegando tudo, excluir essas rotas dele.

- [x] Ajustar editor:
  - `Preview` abre `/pages/{pageId}/preview` em nova aba/janela.
  - `Publish` publica e fica no editor.
  - Adicionar botao `Open live` ou `Open in browser` separado, habilitado quando `publishedAt` existir.
  - Futuro `Unpublish` fica possivel porque o usuario nao e jogado para fora do editor.

- [x] Ajustar indicadores:
  - Lista de Pages mostra `Draft`/`Published`.
  - Topbar do editor mostra `Draft`/`Published`.
  - Depois de publish, store atualiza `publishedAt`.

- [x] Limpeza:
  - Remover `PublicSailorPage.vue` se nao for usado por outra feature.
  - Remover endpoints/client helpers mortos apenas se ficarem sem uso.

- [x] Verificacao minima:
  - Testes backend de pages/routes.
  - Testes contrato do editor/topbar para `Publish` nao navegar e `Open live` existir.
  - `npm run build` em `client-vue`.

## Decisao tecnica

Recomendado: HTML publico direto pelo backend. Simples, melhor SEO, menos JS, melhor isolamento.

Nao recomendado agora: SSR/hydration Vue. Mais complexo e desnecessario para Sailor Pages neste momento.
