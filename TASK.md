# TASK.md — Forge Project Bug & Feature Tracker

> Mantido por: Staff Engineer  
> Última atualização: 2026-05-08

---

## Bugs Ativos

_(nenhum bug ativo no momento)_

---

## Tarefas Pendentes

_(nenhuma tarefa pendente no momento)_

---

## Concluído

### ✅ [BUG-001] Form Trigger — fields não apareciam no Input dos nós downstream
- **Commit:** `fix(ui): resolve form trigger fields in VariableTree`
- **Arquivo corrigido:** `client-vue/src/features/workflow-editor/components/settings/editors/VariableTree.vue`
- **Root Cause:**
  O `VariableTree.vue` resolvia variáveis do Trigger verificando apenas `triggerData.schema`
  (propriedade exclusiva do trigger `manual`) e `lastTriggerPayload` (captura via SSE em runtime).
  O trigger do tipo `form` guarda seus campos em `triggerData.formFields[]` — estrutura completamente
  diferente. O código nunca tratava esse caso, então sempre caía no fallback genérico `trigger.payload`.

- **Solução aplicada:**
  1. Adicionado branch prioritário em `allPaths` para `triggerData.type === 'form'`:
     itera sobre `formFields[]` e gera paths `trigger.fields.<name>` — exatamente como o servidor
     expõe os dados no contexto de execução (`triggerPayload = { fields: fieldData, ... }`).
  2. Atualizado `iconsMap` para usar ícone `file-text` no trigger form e `list` em `trigger.fields`.
  3. Nenhuma lógica de plugin vazou para o core — a fix é 100% no layer de UI do workflow editor.

- **Path correto no servidor:** `trigger.fields.<nome_do_campo>` (confirmado em `workflows.routes.ts` linha 813-815)
