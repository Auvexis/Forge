# Agent Drive Download Convert Delay Fix - 2026-06-03

Goal: corrigir erro do `file_convert_file` apos `google_drive_download_file` e reduzir demora artificial entre steps do Agent Panel.

Tasks:
- [x] Reproduzir em teste o caso download -> convert com wrapper de arquivo/ref.
- [x] Corrigir normalizacao generica de input para o conversor sem regra especifica de Drive/Gmail.
- [x] Auditar delay entre list/download/convert no planner e remover espera desnecessaria se existir.
- [x] Rodar testes focados backend.
- [x] Rodar build backend.
- [x] Commitar mudancas.
