# Agent Tool Repeated Search Loop Waiting User - 2026-06-03

## Goal

Parar loop de tool repetida quando a busca retorna o mesmo resultado varias vezes e responder `waiting-user` com opcao de retry/nova query ou escolha de resultados.

## Tasks

- [x] Adicionar teste vermelho para repeticao de resultado `success` identico.
- [x] Classificar repeticao identica como `waiting-user`.
- [x] Preservar opcoes quando a tool retorna lista de resultados.
- [x] Remover delay artificial de retry interno da tool.
- [x] Rodar testes focados.
- [x] Commitar mudancas.
