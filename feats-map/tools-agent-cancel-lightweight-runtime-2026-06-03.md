# Tools Agent Cancel And Lightweight Runtime - 2026-06-03

## Objetivo

Reduzir custo constante de GPU/RAM do Tools Agent, remover thinking do fluxo do agent e permitir cancelar uma execucao ativa pelo chat.

## Tasks

- [x] Remover `keep_alive: 0` obrigatorio do adapter Ollama e manter configuracao opcional via env/opcoes.
- [x] Remover envio/uso de thinking nos adapters OpenAI, OpenRouter e Ollama para o Tools Agent.
- [x] Adicionar contrato/teste para cancelamento do Agent Panel via execucao ativa.
- [x] Expor cancelamento no client API/store e trocar Send por Stop/Cancel durante execucao.
- [x] Garantir que o cancelamento chame o endpoint de cancelamento existente da workflow execution.
- [x] Verificar testes focados de server/client.
- [x] Verificar build de server/client se os testes focados passarem.
