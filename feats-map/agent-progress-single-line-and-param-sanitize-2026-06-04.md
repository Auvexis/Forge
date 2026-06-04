# Agent Progress Single Line And Param Sanitize - 2026-06-04

Goal: corrigir params opcionais invalidos do planner e exibir progresso live em uma unica linha atualizada.

Rules:
- Trabalhar em `dev`.
- Fazer TDD antes da correcao.
- Commitar ao fim da fatia.
- Nao hardcodar Drive/Gmail.
- Params devem ser filtrados genericamente pelo schema da tool.
- Progress live deve atualizar a mesma mensagem, nao criar varias linhas.
- Usar tokens CSS e manter shimmer no texto de status.

## Task 1 - Sanitizar Params Opcionais

- [x] Criar teste vermelho para enum opcional invalido removido antes do invoke.
- [x] Implementar sanitizacao generica por schema.
- [x] Manter params required invalidos para repair/erro.

## Task 2 - Progress Live Em Linha Unica

- [x] Criar contrato frontend para progress ativo usar id unico.
- [x] Atualizar store para upsertar progress ativo na mesma mensagem.
- [x] Adicionar animacao vertical no texto de status.
- [x] Rodar testes focados.
- [x] Rodar builds.
- [x] Commitar.
