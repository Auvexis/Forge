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

- [x] Mapear fluxo atual completo: `agent-graph-builder`, `plugin-tool-executor`, `PluginExecutor`, sanitizacao de eventos e Global Agent Chat.
- [x] Separar escopo em 4 blocos: Binary Ref Pipeline, Multi-step no Global Agent Chat, Waiting-user simples e Loop Guard/parada inteligente.

### 1. Binary Ref Pipeline

- [x] Criar testes falhando para sanitizar resultado pesado antes de enviar para LLM.
- [x] Criar tipo utilitario `AgentBinaryRef` e store temporario no runtime do agente.
- [x] Implementar sanitizacao de tool result: Buffer, Readable, base64 grande e objetos grandes viram ref + metadata.
- [x] Garantir que `stringifyToolResult` envie para a LLM apenas payload leve.
- [x] Criar testes falhando para resolver ref em args antes de executar proxima tool.
- [x] Implementar resolucao recursiva de refs nos argumentos da tool.
- [x] Integrar resolucao em `executePluginAgentTool` ou no wrapper de `createGraphTools`, antes de chamar `PluginExecutor`.
- [x] Garantir compatibilidade com `x-input-type: file` no `PluginExecutor`, mantendo unwrap existente.
- [x] Ajustar eventos/progress para nunca vazar arquivo pesado no stream do Global Agent Chat.
- [x] Adicionar caso de teste: Drive-like download retorna arquivo pesado, proxima tool recebe Buffer real via ref.
- [x] Adicionar caso de teste: LLM recebe apenas `{ type, ref, size, mimeType }`.
- [x] Adicionar limite/TTL para refs temporarias por execution/session.

### 2. Multi-step No Global Agent Chat

- [x] Validar comportamento com `skipFinalResponseAfterToolUse`; decidir se Global Agent Chat deve permitir multi-step antes de parar.
- [x] Criar testes falhando para multi-step no Global Agent Chat: tool 1 retorna resultado, LLM recebe resultado e escolhe tool 2 no mesmo turno.
- [x] Refatorar Global Agent Chat para permitir multi-step quando o agente precisar continuar depois de uma tool.
- [x] Garantir que progresso/summary do chat global mostre cada tool executada no mesmo turno.
- [x] Garantir que o chat global ainda finalize rapido quando houver apenas uma tool terminal e nenhuma proxima acao.

### 3. Waiting-user Simples

- [x] Criar contrato de `waiting-user` para quando faltar dado critico, houver resultado ambiguo ou nada for encontrado.
- [x] Criar testes falhando para `waiting-user`: busca retorna 0 itens e agente pergunta ao usuario em vez de continuar tentando.
- [x] Criar testes falhando para `waiting-user`: busca retorna varios itens sem criterio claro e agente pede escolha do usuario.
- [x] Implementar resposta/estado `waiting-user` no Agent Run Result e no fluxo do chat global.
- [x] Exibir pergunta/opcoes no frontend do Global Agent Chat sem quebrar historico de mensagens.
- [x] Garantir que a resposta do usuario continue a mesma sessao e preserve contexto/opcoes anteriores.

### 4. Loop Guard / Parada Inteligente

- [x] Criar loop guard por assinatura de tool call: `toolName + argsHash + resultClass`.
- [x] Bloquear repeticao da mesma tool com mesmos args quando o resultado anterior foi `not_found`, erro irrecuperavel ou ambiguidade.
- [x] Definir classificacao leve de resultado: `success`, `empty`, `ambiguous`, `failed`, `needs_user`.
- [x] Permitir no maximo 1 ou 2 tentativas de recuperacao automatica antes de perguntar ao usuario.
- [x] Adicionar testes de loop guard: mesma tool + mesmos args nao roda infinitamente.
- [x] Adicionar teste de parada: resultado vazio repetido vira `waiting-user`, nao nova tool call.
- [x] Adicionar teste de parada: erro de permissao/credencial para o turno com mensagem clara.

### 6. Hardening De Auto-controle

- [x] Criar teste falhando para erro de permissao/credencial virar `waiting-user` sem quebrar o turno.
- [x] Implementar classificacao de erro irrecuperavel: `permission`, `credential`, `unauthorized`, `forbidden`.
- [x] Emitir `agent:tool-end` failed leve e retornar pergunta clara ao usuario nesses erros.
- [x] Garantir que erro normal de tool continue falhando como antes.
- [x] Criar teste falhando para resultado ambiguo com `files/items/results/options` retornar opcoes ao usuario.
- [x] Implementar `waiting-user` automatico para ambiguidade quando a mesma busca retorna varias opcoes.
- [x] Preservar opcoes originais no payload `waiting-user` sem vazar conteudo pesado.
- [x] Criar contrato frontend para renderizar opcoes como botoes acionaveis, nao apenas lista.
- [x] Implementar clique em opcao preenchendo/enviando uma resposta curta para continuar a sessao.
- [x] Rodar testes/builds focados e fazer commit do bloco.

### 5. Verificacao E Fechamento

- [x] Rodar testes focados do agent runtime.
- [x] Rodar testes focados do Global Agent Chat frontend/backend.
- [x] Rodar build do server.
- [x] Rodar build do client-vue se houver ajuste visual no chat.
- [x] Atualizar este arquivo marcando tasks concluidas durante a implementacao.
- [x] Fazer commit por task/bloco coerente.

### 7. Bugfixes Pos-Review

#### Bug 1: Binary ref resolvido ainda pode estourar limite no executor de plugin

**Arquivos:**
- Modificar: `server/src/core/modules/agent-runtime/plugin-tool-executor.ts`
- Testar: `server/src/core/modules/agent-runtime/plugin-tool-executor.test.ts`

- [x] Criar teste falhando em `plugin-tool-executor.test.ts` onde a tool recebe um `Buffer` grande vindo de ref resolvida e o executor nao rejeita por `AGENT_LIMITS.maxToolPayloadBytes`.
- [x] Garantir que o teste falhe antes da correcao com erro de payload grande ou validacao indevida.
- [x] Refatorar a validacao de payload para medir objetos binarios como referencia/metadata, sem serializar o conteudo inteiro do `Buffer`.
- [x] Se a validacao de schema bloquear `Buffer` em parametro de arquivo, ajustar o ponto minimo para aceitar `Buffer`/file-like apenas em parametros declarados como arquivo.
- [x] Rodar `node --test src/core/modules/agent-runtime/plugin-tool-executor.test.ts` dentro de `server`.

#### Bug 2: Global Agent Panel pode esconder resposta final depois das tools

**Arquivos:**
- Modificar: `server/src/core/routes/agent-panel.routes.ts`
- Modificar: `client-vue/src/features/agent-panel/stores/agentPanel.store.ts`
- Testar: `server/src/core/routes/agent-panel.routes.test.ts`
- Testar: `client-vue/src/features/agent-panel/__tests__/agentPanel.contract.test.ts`

- [x] Criar teste falhando garantindo que um turno com tool activity e resposta final normal do assistant mostre/preserve a resposta final, nao apenas progresso/summary.
- [x] Confirmar a falha atual: deltas finais sao ignorados depois de `sawToolActivity` ou o merge do frontend mantem a mensagem local antiga.
- [x] Ajustar backend e/ou merge do frontend para trocar a mensagem local pelo assistant final persistido quando o run terminar.
- [x] Preservar o comportamento especial de `waiting-user` no mesmo fluxo.
- [x] Rodar `node --test src/core/routes/agent-panel.routes.test.ts` dentro de `server`.
- [x] Rodar `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts` dentro de `client-vue`.

#### Bug 3: Opcoes de waiting-user somem do contexto do proximo turno

**Arquivos:**
- Modificar: `server/src/core/modules/agent-runtime/chat/agent-panel-chat-service.ts`
- Testar: `server/src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts`

- [x] Criar teste falhando onde uma mensagem anterior `waiting-user` com `options` entra no historico e o payload enviado ao Agent Runner ainda contem essas opcoes.
- [x] Confirmar que o normalizador atual reduz o conteudo para texto simples e perde `options`.
- [x] Ajustar a normalizacao para preservar `text`, `waitingUser`, `reason` e `options` em formato enxuto/serializavel.
- [x] Garantir que conteudo pesado dentro de options continue sanitizado ou representado por metadata/ref, sem jogar base64/buffer no prompt.
- [x] Rodar `node --test src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts` dentro de `server`.

#### Bug 4: Regex de permissao/credencial esta ampla demais

**Arquivos:**
- Modificar: `server/src/core/modules/agent-runtime/agent-graph-builder.ts`
- Testar: `server/src/core/modules/agent-runtime/agent-graph-builder.test.ts`

- [x] Criar teste falhando provando que erro comum com palavra parecida, como `Author not found`, nao vira `waiting-user`.
- [x] Manter teste cobrindo que `Unauthorized`, `Forbidden`, `Missing credentials`, `API key` e `OAuth token` continuam virando `waiting-user`.
- [x] Trocar o regex amplo por matcher com limites de palavra e termos explicitos.
- [x] Rodar `node --test src/core/modules/agent-runtime/agent-graph-builder.test.ts` dentro de `server`.

#### Bug 5: Adapter de plugin quebra com manifest legado sem `metadata`

**Arquivos:**
- Modificar: `server/src/core/modules/agent-runtime/plugin-tool-adapter.ts`
- Testar: `server/src/core/modules/agent-runtime/plugin-tool-adapter.test.ts`
- Testar: `server/src/core/routes/agent-chat-workflow.integration.test.ts`

- [ ] Criar teste falhando para plugin com `manifest.name` top-level e sem `manifest.metadata`.
- [ ] Confirmar que o erro atual tenta ler `manifest.metadata.name`.
- [ ] Implementar fallback `manifest.metadata?.name ?? manifest.name ?? plugin.id` nos pontos de listagem/resolucao de tools.
- [ ] Rodar `node --test src/core/modules/agent-runtime/plugin-tool-adapter.test.ts` dentro de `server`.
- [ ] Rodar `node --test src/core/routes/agent-chat-workflow.integration.test.ts` dentro de `server`.

#### Verificacao Do Bloco

- [ ] Rodar suite focada do backend: `node --test src/core/modules/agent-runtime/plugin-tool-executor.test.ts src/core/modules/agent-runtime/plugin-tool-adapter.test.ts src/core/modules/agent-runtime/agent-graph-builder.test.ts src/core/modules/agent-runtime/chat/agent-panel-chat-service.test.ts src/core/routes/agent-chat-workflow.integration.test.ts src/core/routes/agent-panel.routes.test.ts`.
- [ ] Rodar suite focada do frontend: `node --test src/features/agent-panel/__tests__/agentPanel.contract.test.ts`.
- [ ] Rodar build do `server`.
- [ ] Rodar build do `client-vue` se o store/frontend for alterado.
- [ ] Atualizar este plano marcando as tasks concluidas.
- [ ] Fazer commit somente dos arquivos alterados neste bloco, sem `git add .`.

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
