# Tools Agent Limits Bugfix - 2026-06-01

## Objetivo
Permitir que o usuario escolha valores maiores de `maxIterations` e `maxToolCalls` no Tools Agent sem falhar na validacao do Agent Runtime.

## Tasks
- [x] Ajustar validacao do AI Agent para nao bloquear `maxIterations` acima de 12 e `maxToolCalls` acima de 20.
- [x] Manter validacoes basicas de tipo inteiro e minimo.
- [x] Verificar com teste focado do backend.

## Observacoes
- Causa encontrada: `server/src/core/modules/agent-runtime/agent-validation.ts` usa `AGENT_LIMITS.maxIterations` e `AGENT_LIMITS.maxToolCalls` como teto no schema Zod.
- Respeitar arquitetura: mudanca no core do agent runtime; plugins nao envolvidos.
