# Agent Panel Binary Memory Investigation - 2026-06-01

## Objetivo
Encontrar e corrigir vazamento/serializacao pesada quando Tools Agent baixa arquivo do Drive e usa LLM/browser.

## Tasks
- [x] Rastrear caminho de arquivo baixado: plugin -> runtime -> eventos -> chat -> frontend.
- [x] Reproduzir em teste se Buffer/Readable/Base64 grande aparece em evento, contexto ou historico.
- [x] Corrigir para browser e LLM receberem apenas metadados/ref leve.
- [x] Rodar testes focados, build e type-check.

## Suspeitas
- Alguma camada pode estar serializando `execution.context.steps` completo.
- Algum evento pode carregar output bruto de tool.
- Historico do Agent Panel pode incluir resposta anterior errada ou resultado grande.
