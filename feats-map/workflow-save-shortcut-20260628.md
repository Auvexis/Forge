# Workflow Save Shortcut

## Motivo

O Workflow Editor precisa oferecer o atalho convencional de salvamento sem abrir o diálogo nativo do navegador.

## Comportamento

- `Ctrl+S` e `Cmd+S` acionam `handleSaveWorkflow()`.
- O atalho funciona inclusive dentro de campos editáveis.
- Repetições automáticas da tecla não disparam salvamentos adicionais.
- O comportamento atual do botão Save permanece intacto.

## Tasks

- [ ] Adicionar um teste de contrato para o atalho.
- [ ] Integrar o atalho ao handler existente.
- [ ] Executar testes e type-check.
- [ ] Commitar na branch dev.
