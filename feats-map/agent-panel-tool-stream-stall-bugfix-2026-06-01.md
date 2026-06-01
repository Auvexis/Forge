# Agent Panel Tool Stream Stall Bugfix - 2026-06-01

## Objetivo
Corrigir travamento/mensagem antiga no Agent Panel quando o Tools Agent usa Drive Download e depois precisa continuar para Gmail.

## Tasks
- [x] Investigar fluxo de stream, progresso, transcript e tool calls.
- [x] Criar teste reproduzindo erro de resposta antiga/local no merge do chat.
- [x] Criar teste reproduzindo entrega de arquivo baixado para tool seguinte sem depender de base64 gigante no modelo.
- [x] Implementar fix pequeno no core/frontend.
- [x] Rodar testes focados e build.

## Observacoes
- Sintomas relatados: chat trava apos Google Drive Download, nao chega no Gmail, sem toast/erro, e reaproveita resposta do prompt anterior.
- Hipoteses verificadas: stream do painel + merge local/final e pipeline de `agent-ref://` entre Drive Download e Gmail.
