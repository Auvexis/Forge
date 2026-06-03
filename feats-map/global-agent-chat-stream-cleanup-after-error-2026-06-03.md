# Global Agent Chat Stream Cleanup After Error - 2026-06-03

## Goal

Garantir que erro no Global Agent Chat fecha stream/conexao/listeners/heartbeat e nao deixa trabalho em background consumindo GPU/CPU.

## Tasks

- [x] Auditar lifecycle do stream frontend (`EventSource`, `AbortController`, unmount).
- [x] Auditar lifecycle do SSE backend (`workflowEventBus`, heartbeat, raw close/end).
- [x] Criar teste para cleanup apos erro no stream.
- [x] Corrigir vazamento.
- [x] Rodar testes/builds focados.
- [x] Commitar mudancas.
