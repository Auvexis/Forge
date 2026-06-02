# Agent tool result compaction / workflow parity - 2026-06-01

## Problema

O Workflow Editor passa outputs entre nodes por referencia no contexto em memoria e sanitiza apenas logs/eventos. O Tools Agent estava transformando outputs de ferramentas em mensagens `tool` para a proxima chamada da LLM. Mesmo com buffers/readables substituidos por refs, resultados grandes nao-binarios como `google_drive_list_files` ainda podiam entrar inteiros no prompt do Ollama, causando consumo alto de RAM/GPU e travamentos.

## Hipotese

O travamento vem da diferenca arquitetural: o agente usa a LLM como roteador de dados entre ferramentas, enquanto o workflow manual usa referencias em memoria. Compactar agressivamente o resultado visivel para a LLM deve manter refs utilizaveis e impedir listas/metadados enormes no contexto.

## Plano

1. Adicionar teste vermelho garantindo que resultados grandes de ferramenta sejam truncados antes de irem para a proxima chamada do modelo.
2. Implementar compactacao generica para tool results destinados a modelo/eventos: strings grandes, arrays grandes e objetos profundos.
3. Manter refs binarias intactas para que o proximo tool call ainda consiga reidratar `agent-ref://...`.
4. Rodar testes focados do runtime do agente e typecheck/build relevante.

## Resultado esperado

O Tools Agent nao envia listas completas do Drive nem payloads grandes para a LLM/browser. Ele se aproxima do comportamento leve do Workflow Editor: dados pesados ficam fora do prompt, com apenas preview/resumo e referencias.
