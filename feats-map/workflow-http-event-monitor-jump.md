# Workflow HTTP event and monitor jump

## Problemas

- Workflow exportado em `workflow_21512a0f-c723-4744-b827-da346a23bbc0_v1.0.7.json` chega no `Wait for Event`, mas o node `HTTP Request` nao envia, nao mostra erro e nao mostra logs.
- `AppGlobalAutomationMonitor.vue` faz uma animacao ruim ao trocar workflow: logs aparecem embaixo e depois sobem.

## Tasks

- [x] Rastrear execucao de `event-listener -> http` com o workflow exportado.
- [x] Criar teste falhando para HTTP depois de evento, se a causa for backend.
- [x] Corrigir causa raiz sem quebrar plugins/generic engines.
- [x] Validar formato exato do workflow exportado contra o executor.
- [x] Rastrear layout/animacao do `AppGlobalAutomationMonitor`.
- [x] Corrigir salto visual no monitor.
- [x] Rodar testes/build focados.
- [x] Commitar correcoes.
