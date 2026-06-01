# Agent Panel Approval and Binary Cleanup - 2026-06-01

## Objetivo

Corrigir falso sucesso/travamento quando Tools Agent baixa arquivo do Drive e precisa enviar por Gmail.

## Tasks

- [x] Reproduzir `WAITING_APPROVAL` sendo tratado como sucesso no Agent Panel.
- [x] Reproduzir fechamento de `Readable` baixado quando a execucao termina sem consumir o arquivo.
- [x] Fazer Agent Panel expor erro/estado pendente em vez de resumo final falso.
- [x] Fechar refs binarias nao consumidas ao fim da execucao para evitar vazamento.
- [x] Rodar testes focados e build.

## Observacoes

- Gmail `sendMessage` tem `requiresApproval: true`.
- O painel hoje so falha quando workflow retorna `FAILED`; `WAITING_APPROVAL` passa como se fosse sucesso.
