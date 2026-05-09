# Milestone 2.1.1 - Engine Contracts & Hardening

## Regras de Arquitetura

- Code Node continua com acesso total por decisao de produto.
- Core/engine nao importa logica de plugin.
- Plugin nao importa core/engine.
- Utility nodes first-party podem acessar internals do core porque sao mantidos pelo Nod8.
- Nenhuma feature existente deve quebrar.

## Tarefas

- [x] Recriar `TASK.md` no root para rastrear a mini-milestone.
- [x] Formalizar o contrato de `NodeHandler` com metadata de execucao, handles, side effects, erros e IO.
- [x] Criar uma `TemplateEngine` unica para `{{ trigger.xxx }}`, `{{ steps.xxx }}`, objetos, arrays e buffers.
- [x] Preservar compatibilidade do `WorkflowParser` usando a nova `TemplateEngine`.
- [x] Adicionar escaping explicito para contextos `text`, `sql`, `json` e `prompt`.
- [x] Criar um `ExternalIORunner` com timeout, retry, abort signal e erro normalizado.
- [x] Migrar o HTTP utility node para usar `ExternalIORunner`.
- [x] Extrair validacao de workflow de `workflows.routes.ts` para modulo dedicado.
- [x] Extrair montagem de schema de workflow de `workflows.routes.ts` para modulo dedicado.
- [x] Rodar testes unitarios dos novos contratos/template/IO.
- [x] Rodar testes existentes dos node handlers.
- [x] Rodar `npm run build` no server.
