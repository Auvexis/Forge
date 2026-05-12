# Manual Test Checklist - Execution, Variables, Autosave

## #8 Execution
- [x] Abrir um workflow.
- [x] Rodar o workflow.
- [x] Clicar em `Logs`.
- [x] Ver `Live Timeline` durante a execução.
- [x] Abrir uma execução antiga.
- [x] Conferir status da execução.
- [x] Conferir duração total da execução.
- [x] Conferir timeline por step.
- [x] Conferir duração de cada step.
- [x] Conferir payload do trigger.
- [x] Conferir payload/output de cada step.
- [x] Forçar erro em um node.
- [x] Rodar workflow com erro.
- [x] Abrir log da execução com erro.
- [x] Conferir step com status `failed`.
- [x] Conferir painel `Error Trace`.
- [x] Testar botão de copiar erro.
- [x] Configurar retry em algum node.
- [x] Fazer o node falhar antes de passar.
- [x] Conferir tentativas no log.
- [x] Conferir delay do retry.
- [x] Conferir retry na timeline.

## #9 Variables
- [ ] Abrir workflow.
- [ ] Clicar em `Settings`.
- [ ] Ir na seção `Variables`.
- [ ] Criar variável `string`.
- [ ] Criar variável `number`.
- [ ] Criar variável `boolean`.
- [ ] Criar variável `object`.
- [ ] Criar variável `array`.
- [ ] Criar variável `secret`.
- [ ] Salvar ou esperar autosave.
- [ ] Buscar variável por nome.
- [ ] Buscar variável por tipo.
- [ ] Buscar variável por descrição.
- [ ] Testar botão de olho em variável `secret`.
- [ ] Abrir um node.
- [ ] Conferir `variables` no painel esquerdo.
- [ ] Arrastar variável para um campo/input.
- [ ] Confirmar token inserido no formato `{{ variables.NOME }}`.
- [ ] Rodar workflow usando variável.
- [ ] Confirmar que valor da variável resolve na execução.

## #10 Autosave
- [ ] Abrir workflow.
- [ ] Editar nome do workflow.
- [ ] Editar descrição do workflow.
- [ ] Editar algum node.
- [ ] Conferir indicador `Unsaved Changes`.
- [ ] Conferir indicador `Autosaving`.
- [ ] Conferir indicador `Saved ...`.
- [ ] Recarregar a página depois de editar.
- [ ] Conferir recuperação de draft local.
- [ ] Fazer várias mudanças.
- [ ] Clicar undo.
- [ ] Confirmar que voltou estado anterior.
- [ ] Clicar redo.
- [ ] Confirmar que reaplicou mudança.
- [ ] Abrir mesmo workflow em duas abas.
- [ ] Editar e salvar/esperar autosave na primeira aba.
- [ ] Editar e salvar/esperar autosave na segunda aba.
- [ ] Conferir indicador `Save Conflict`.

## Teste Geral
- [ ] Criar workflow novo.
- [ ] Adicionar nodes.
- [ ] Configurar variables.
- [ ] Rodar workflow com sucesso.
- [ ] Rodar workflow com erro.
- [ ] Ver logs.
- [ ] Fechar workflow.
- [ ] Abrir workflow novamente.
- [ ] Confirmar que nada sumiu.
