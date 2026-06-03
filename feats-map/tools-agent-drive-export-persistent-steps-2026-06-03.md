# Tools Agent Drive Export And Persistent Steps - 2026-06-03

## Objetivo

Corrigir download de arquivos Google Drive Docs Editors, manter steps do Agent Panel persistidos no chat e reduzir latencia do fluxo de tools.

## Tasks

- [x] Corrigir `google_drive_download_file` para exportar Google Docs/Sheets/Slides/Drawings como arquivo binario.
- [x] Adicionar testes do Google Drive para download binario normal e export de Docs Editors.
- [x] Reduzir `google_drive_list_files` default para retornar menos itens no agent.
- [x] Restaurar intro inicial do fluxo de tools sem depender do primeiro step demorado.
- [x] Persistir steps de progresso/sumario enquanto eles acontecem, para nao sumirem em reload/HMR.
- [x] Evitar duplicar steps persistidos no fim da execucao.
- [x] Verificar testes focados de server/client.
- [x] Verificar build server/client.

## Nota arquitetura

Guardar downloads grandes em pasta temporaria por execucao/chat pode reduzir RAM, mas deve ficar no core/agent-runtime, nao no plugin. Plugin continua generico retornando arquivo; core decide se guarda como ref em memoria ou em disco e limpa no final.
