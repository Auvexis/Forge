# Sailor Pages Unpublish

## Raiz

Pages tem fluxo de publish completo, mas não tem endpoint, API client, store action nem comando de UI para unpublish. Depois de publicar, o snapshot fica em `published_pages` e a página continua viva em `/p/:slug`.

## Plano

- [x] Testes essenciais
  - [x] Backend remove snapshot publicado e volta `/p/:slug` para 404.
  - [x] Store limpa `publishedAt` depois de unpublish.
  - [x] Chrome expõe comando de Unpublish quando a página está publicada.
- [x] Backend
  - [x] Adicionar remoção de published page por `pageId`.
  - [x] Adicionar `PageService.unpublishPage`.
  - [x] Adicionar rota `POST /pages/:pageId/unpublish`.
- [x] Frontend
  - [x] Adicionar endpoint/API de unpublish.
  - [x] Adicionar action no Pinia.
  - [x] Adicionar comando e botão/menu no Chrome.
- [x] Verificação
  - [x] Rodar testes focados client/server.
  - [x] Rodar build client/server.
