# Agent Binary Ref Pipeline - 2026-06-01

## Objetivo

Criar suporte no Tools Agent / Global Agent Chat para encadear arquivos pesados entre tools sem mandar Buffer, Stream ou base64 gigante para a LLM.
Tambem melhorar o auto-controle do agente para multi-step, perguntas ao usuario e parada segura quando nao encontrar resultado ou quando houver ambiguidade.

## Decisao De Arquitetura

- A LLM ve apenas metadata e uma referencia curta.
- O backend guarda o valor real em um store temporario do Agent.
- Antes da proxima tool executar, o backend troca a referencia pelo valor real.
- Plugins continuam genericos e nao sabem do core.
- Frontend continua recebendo payload leve.

## Formato Proposto

```json
{
  "download": {
    "fileName": "video.mp4",
    "mimeType": "video/mp4",
    "content": {
      "type": "Buffer",
      "ref": "agent-ref://call_1/download/content",
      "size": 483920123
    }
  }
}
```

## Tasks Por Feature

### 0. Preparacao

- [ ] Mapear fluxo atual completo: `agent-graph-builder`, `plugin-tool-executor`, `PluginExecutor`, sanitizacao de eventos e Global Agent Chat.
- [ ] Separar escopo em 4 blocos: Binary Ref Pipeline, Multi-step no Global Agent Chat, Waiting-user simples e Loop Guard/parada inteligente.

### 1. Binary Ref Pipeline

- [ ] Criar testes falhando para sanitizar resultado pesado antes de enviar para LLM.
- [ ] Criar tipo utilitario `AgentBinaryRef` e store temporario no runtime do agente.
- [ ] Implementar sanitizacao de tool result: Buffer, Readable, base64 grande e objetos grandes viram ref + metadata.
- [ ] Garantir que `stringifyToolResult` envie para a LLM apenas payload leve.
- [ ] Criar testes falhando para resolver ref em args antes de executar proxima tool.
- [ ] Implementar resolucao recursiva de refs nos argumentos da tool.
- [ ] Integrar resolucao em `executePluginAgentTool` ou no wrapper de `createGraphTools`, antes de chamar `PluginExecutor`.
- [ ] Garantir compatibilidade com `x-input-type: file` no `PluginExecutor`, mantendo unwrap existente.
- [ ] Ajustar eventos/progress para nunca vazar arquivo pesado no stream do Global Agent Chat.
- [ ] Adicionar caso de teste: Drive-like download retorna arquivo pesado, proxima tool recebe Buffer real via ref.
- [ ] Adicionar caso de teste: LLM recebe apenas `{ type, ref, size, mimeType }`.
- [ ] Adicionar limite/TTL para refs temporarias por execution/session.

### 2. Multi-step No Global Agent Chat

- [ ] Validar comportamento com `skipFinalResponseAfterToolUse`; decidir se Global Agent Chat deve permitir multi-step antes de parar.
- [ ] Criar testes falhando para multi-step no Global Agent Chat: tool 1 retorna resultado, LLM recebe resultado e escolhe tool 2 no mesmo turno.
- [ ] Refatorar Global Agent Chat para permitir multi-step quando o agente precisar continuar depois de uma tool.
- [ ] Garantir que progresso/summary do chat global mostre cada tool executada no mesmo turno.
- [ ] Garantir que o chat global ainda finalize rapido quando houver apenas uma tool terminal e nenhuma proxima acao.

### 3. Waiting-user Simples

- [ ] Criar contrato de `waiting-user` para quando faltar dado critico, houver resultado ambiguo ou nada for encontrado.
- [ ] Criar testes falhando para `waiting-user`: busca retorna 0 itens e agente pergunta ao usuario em vez de continuar tentando.
- [ ] Criar testes falhando para `waiting-user`: busca retorna varios itens sem criterio claro e agente pede escolha do usuario.
- [ ] Implementar resposta/estado `waiting-user` no Agent Run Result e no fluxo do chat global.
- [ ] Exibir pergunta/opcoes no frontend do Global Agent Chat sem quebrar historico de mensagens.
- [ ] Garantir que a resposta do usuario continue a mesma sessao e preserve contexto/opcoes anteriores.

### 4. Loop Guard / Parada Inteligente

- [ ] Criar loop guard por assinatura de tool call: `toolName + argsHash + resultClass`.
- [ ] Bloquear repeticao da mesma tool com mesmos args quando o resultado anterior foi `not_found`, erro irrecuperavel ou ambiguidade.
- [ ] Definir classificacao leve de resultado: `success`, `empty`, `ambiguous`, `failed`, `needs_user`.
- [ ] Permitir no maximo 1 ou 2 tentativas de recuperacao automatica antes de perguntar ao usuario.
- [ ] Adicionar testes de loop guard: mesma tool + mesmos args nao roda infinitamente.
- [ ] Adicionar teste de parada: resultado vazio repetido vira `waiting-user`, nao nova tool call.
- [ ] Adicionar teste de parada: erro de permissao/credencial para o turno com mensagem clara.

### 5. Verificacao E Fechamento

- [ ] Rodar testes focados do agent runtime.
- [ ] Rodar testes focados do Global Agent Chat frontend/backend.
- [ ] Rodar build do server.
- [ ] Rodar build do client-vue se houver ajuste visual no chat.
- [ ] Atualizar este arquivo marcando tasks concluidas durante a implementacao.
- [ ] Fazer commit por task/bloco coerente.

## Riscos

- `Readable` pode ser consumido uma vez. Para arquivo grande, melhor armazenar em temp file/ref, nao Buffer em memoria.
- Base64 grande nao deve entrar em prompt nem em eventos.
- Ref sem store backend nao resolve nada; `"Buffer"` sozinho nao basta.
- Global Agent Chat hoje usa `skipFinalResponseAfterToolUse: true`, isso pode limitar cadeia de tools.
- Multi-step sem loop guard pode fazer agente repetir busca sem resultado ate bater limite bruto.
- `waiting-user` precisa ser estado explicito; se virar apenas texto livre, frontend nao consegue mostrar opcoes bem.

## MVP Recomendado

1. Store em memoria por execution para validar arquitetura.
2. Suporte a Buffer e base64 grande.
3. Suporte a Readable convertendo para temp file ou Buffer com limite.
4. Multi-step real no Global Agent Chat.
5. Waiting-user simples para `not_found` e resultado ambiguo.
6. Loop guard por tool + args + classe de resultado.
7. Depois evoluir para artifact/temp file store persistente.

## Features Priorizadas

### 1. Binary Ref Pipeline

Permite passar arquivos pesados entre tools sem mandar conteudo real para a LLM.

### 2. Multi-step No Global Agent Chat

Permite o agente continuar depois de uma tool e decidir a proxima tool no mesmo turno.

### 3. Waiting-user Simples

Permite o agente perguntar ao usuario quando faltar dado critico, quando houver varias opcoes ou quando nada for encontrado.

### 4. Loop Guard / Parada Inteligente

Evita loop infinito quando uma busca nao acha nada, quando a tool falha de forma irrecuperavel ou quando a mesma chamada se repete sem progresso.
