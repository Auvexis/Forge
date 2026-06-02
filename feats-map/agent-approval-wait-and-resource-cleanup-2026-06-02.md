# Agent Approval Wait And Resource Cleanup - 2026-06-02

## Problema

- Global Agent Chat mostra approval, mas o fluxo parece continuar/finalizar sem esperar decisao.
- Stream termina como `done` normal depois de `WAITING_APPROVAL`.
- Summary de tools concluidas aparece mesmo com uma tool pendente de approval.
- Depois da pausa, backend/Ollama continuam consumindo recurso.

## Tasks

- [x] Criar teste vermelho para stream parar em `WAITING_APPROVAL` sem summary/done normal.
- [x] Garantir evento final explicito de waiting approval.
- [x] Impedir fallback/summary depois de approval pendente.
- [x] Criar teste vermelho para ref de attachment preservar filename/mimeType.
- [x] Resolver binary ref de arquivo como `{ filename, mimeType, content }`.
- [x] Confirmar que approve/reject sao os unicos caminhos que chamam resume.
- [x] Rodar testes focados server/client.
- [x] Commitar somente arquivos deste bloco.
