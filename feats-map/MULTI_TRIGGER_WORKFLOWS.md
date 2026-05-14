# Multi Trigger Workflows

Objetivo: permitir varios triggers reais em um workflow. Cada trigger e um ponto de entrada independente e inicia uma nova execucao apenas no branch conectado a ele.

## Tasks

- [x] Task 1: Contrato e migracao runtime
  - Adicionar configuracao de trigger dentro do node `type: "trigger"`.
  - Adicionar `disabled?: boolean` para nodes.
  - Preservar compatibilidade com `workflow.trigger` legado.

- [ ] Task 2: Executor por trigger
  - Criar execucao a partir de um `triggerNodeId`.
  - Rodar somente nodes alcancaveis daquele trigger.
  - Se node normal estiver desabilitado, pular e liberar proximos nodes.
  - Se trigger estiver desabilitado, nao iniciar execucao.

- [ ] Task 3: Ingressos backend
  - Resolver webhook/plugin/form/cron/event para o trigger node correto.
  - Registrar/desregistrar triggers de plugin por node.
  - Agendar cron por trigger node.
  - Manter fallback legado.

- [ ] Task 4: Frontend canvas e editor
  - Mostrar triggers como nodes reais.
  - Permitir adicionar trigger pela aba de utilitarios.
  - Editar cada trigger independentemente.
  - Adicionar toggle enable/disable para trigger/node.

- [ ] Task 5: Verificacao final
  - Rodar testes backend.
  - Rodar type-check/build frontend.
  - Testar fluxo manual/webhook basico.
