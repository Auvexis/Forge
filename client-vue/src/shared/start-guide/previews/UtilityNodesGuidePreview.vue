<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { workflowNodesApi } from '@/core/api/workflowNodes.api'
import type { WorkflowNodeCatalogItem } from '@/core/types/workflow-node-catalog.types'
import BaseButton from '@/shared/components/base/BaseButton.vue'
import LucideIcon from '@/shared/icons/LucideIcon.vue'
import { useApi } from '@/shared/composables/useApi'
import type { StartGuideLang, StartGuideStepText } from '../startGuide.types'

const props = withDefaults(
  defineProps<{
    lang?: StartGuideLang
  }>(),
  {
    lang: 'en',
  },
)

const {
  data: workflowNodeCatalog,
  loading: workflowNodeCatalogLoading,
  execute: loadWorkflowNodeCatalog,
} = useApi(workflowNodesApi.getCatalog)

const nodeTextByType: Partial<Record<string, Record<StartGuideLang, StartGuideStepText>>> = {
  code: {
      en: {
        title: 'Code node',
        description: 'Run controlled custom logic when a workflow needs a small transformation or decision.',
      },
      pt: {
        title: 'Node Code',
        description: 'Execute logica customizada controlada quando o workflow precisa transformar ou decidir algo.',
      },
      es: {
        title: 'Nodo Code',
        description: 'Ejecuta logica personalizada controlada cuando el workflow necesita transformar o decidir algo.',
      },
  },
  if: {
      en: {
        title: 'If node',
        description: 'Split execution between true and false paths using a condition.',
      },
      pt: {
        title: 'Node If',
        description: 'Separe a execucao entre caminhos verdadeiro e falso usando uma condicao.',
      },
      es: {
        title: 'Nodo If',
        description: 'Divide la ejecucion entre rutas verdadera y falsa usando una condicion.',
      },
  },
  loop: {
      en: {
        title: 'Loop node',
        description: 'Repeat a branch for each item or while a workflow still has work to process.',
      },
      pt: {
        title: 'Node Loop',
        description: 'Repita um ramo para cada item ou enquanto o workflow ainda tem trabalho para processar.',
      },
      es: {
        title: 'Nodo Loop',
        description: 'Repite una rama para cada item o mientras el workflow todavia tiene trabajo pendiente.',
      },
  },
  http: {
      en: {
        title: 'HTTP node',
        description: 'Call external APIs and pass the response into the rest of the workflow.',
      },
      pt: {
        title: 'Node HTTP',
        description: 'Chame APIs externas e envie a resposta para o restante do workflow.',
      },
      es: {
        title: 'Nodo HTTP',
        description: 'Llama APIs externas y envia la respuesta al resto del workflow.',
      },
  },
  switch: {
      en: {
        title: 'Switch node',
        description: 'Route execution to one of many branches based on a selected value.',
      },
      pt: {
        title: 'Node Switch',
        description: 'Direcione a execucao para um entre varios ramos com base em um valor.',
      },
      es: {
        title: 'Nodo Switch',
        description: 'Dirige la ejecucion a una de varias ramas segun un valor.',
      },
  },
  merge: {
      en: {
        title: 'Merge node',
        description: 'Bring parallel or alternate branches back into one workflow path.',
      },
      pt: {
        title: 'Node Merge',
        description: 'Junte ramos paralelos ou alternativos de volta em um unico caminho.',
      },
      es: {
        title: 'Nodo Merge',
        description: 'Une ramas paralelas o alternativas de vuelta en un solo camino.',
      },
  },
  'split-in-batches': {
      en: {
        title: 'Split In Batches node',
        description: 'Split an array into smaller batches and process each batch in order.',
      },
      pt: {
        title: 'Node Split In Batches',
        description: 'Divida uma lista em lotes menores e processe cada lote em ordem.',
      },
      es: {
        title: 'Nodo Split In Batches',
        description: 'Divide una lista en lotes menores y procesa cada lote en orden.',
      },
  },
  set: {
      en: {
        title: 'Set Fields node',
        description: 'Create, rename, or update fields without writing custom code.',
      },
      pt: {
        title: 'Node Set Fields',
        description: 'Crie, renomeie ou atualize campos sem escrever codigo customizado.',
      },
      es: {
        title: 'Nodo Set Fields',
        description: 'Crea, renombra o actualiza campos sin escribir codigo personalizado.',
      },
  },
  event: {
      en: {
        title: 'Event Emitter node',
        description: 'Publish an internal event that can trigger other workflows or branches.',
      },
      pt: {
        title: 'Node Event Emitter',
        description: 'Publique um evento interno que pode acionar outros workflows ou ramos.',
      },
      es: {
        title: 'Nodo Event Emitter',
        description: 'Publica un evento interno que puede activar otros workflows o ramas.',
      },
  },
  'event-listener': {
      en: {
        title: 'Event Listener node',
        description: 'Wait for a matching event, then continue the workflow from that signal.',
      },
      pt: {
        title: 'Node Event Listener',
        description: 'Aguarde um evento compativel e continue o workflow a partir desse sinal.',
      },
      es: {
        title: 'Nodo Event Listener',
        description: 'Espera un evento compatible y continua el workflow desde esa senal.',
      },
  },
  subworkflow: {
      en: {
        title: 'Sub-Workflow node',
        description: 'Call another workflow as a reusable step inside the current workflow.',
      },
      pt: {
        title: 'Node Sub-Workflow',
        description: 'Chame outro workflow como uma etapa reutilizavel dentro do workflow atual.',
      },
      es: {
        title: 'Nodo Sub-Workflow',
        description: 'Llama otro workflow como paso reutilizable dentro del workflow actual.',
      },
  },
  'respond-webhook': {
      en: {
        title: 'Respond to Webhook node',
        description: 'Send a custom HTTP response back to the caller that started the workflow.',
      },
      pt: {
        title: 'Node Respond to Webhook',
        description: 'Envie uma resposta HTTP customizada para quem iniciou o workflow.',
      },
      es: {
        title: 'Nodo Respond to Webhook',
        description: 'Envia una respuesta HTTP personalizada a quien inicio el workflow.',
      },
  },
  'ai-agent': {
      en: {
        title: 'AI Agent node',
        description: 'Let an agent reason with connected model, memory, and tools.',
      },
      pt: {
        title: 'Node AI Agent',
        description: 'Permita que um agente raciocine com modelo, memoria e ferramentas conectadas.',
      },
      es: {
        title: 'Nodo AI Agent',
        description: 'Permite que un agente razone con modelo, memoria y herramientas conectadas.',
      },
  },
  'wait-form': {
      en: {
        title: 'Wait Form node',
        description: 'Pause execution until a form response arrives, then continue with submitted data.',
      },
      pt: {
        title: 'Node Wait Form',
        description: 'Pause a execucao ate chegar uma resposta de formulario e continue com os dados enviados.',
      },
      es: {
        title: 'Nodo Wait Form',
        description: 'Pausa la ejecucion hasta recibir una respuesta de formulario y continua con los datos.',
      },
  },
}

const utilityNodes = computed(() => workflowNodeCatalog.value?.nodes ?? [])
const selectedId = ref('')

const selectedNode = computed<WorkflowNodeCatalogItem | null>(
  () => utilityNodes.value.find((node) => node.type === selectedId.value) ?? null,
)
const selectedText = computed(() => {
  const node = selectedNode.value
  if (!node) return null
  const localized = nodeTextByType[node.type]
  return localized?.[props.lang] ?? localized?.en ?? { title: node.label, description: node.description }
})

watch(
  utilityNodes,
  (nodes) => {
    if (!selectedId.value && nodes[0]) selectedId.value = nodes[0].type
  },
  { immediate: true },
)

onMounted(() => {
  loadWorkflowNodeCatalog()
})
</script>

<template>
  <div class="utility-nodes-guide">
    <div v-if="workflowNodeCatalogLoading" class="utility-nodes-guide__state">Loading nodes...</div>
    <div v-else-if="utilityNodes.length === 0" class="utility-nodes-guide__state">No utility nodes found.</div>
    <div v-else class="utility-nodes-guide__grid" aria-label="Utility nodes">
      <button
        v-for="node in utilityNodes"
        :key="node.type"
        type="button"
        class="utility-nodes-guide__node"
        :class="{ 'utility-nodes-guide__node--active': node.type === selectedId }"
        :style="{
          '--node-tone': node.style.iconColor,
          '--node-bg': node.style.bgColor,
          '--node-border': node.style.borderColor,
        }"
        @click="selectedId = node.type"
      >
        <span class="utility-nodes-guide__icon">
          <LucideIcon :name="node.style.icon" :size="20" :color="node.style.iconColor" />
        </span>
        <span>{{ node.label }}</span>
      </button>
    </div>

    <div v-if="selectedNode && selectedText" class="utility-nodes-guide__dialog" role="dialog" aria-modal="false">
      <div>
        <p>{{ selectedNode.label }}</p>
        <h3>{{ selectedText.title }}</h3>
        <span>{{ selectedText.description }}</span>
      </div>
      <BaseButton size="sm" variant="ghost" icon-left="x" aria-label="Close node detail" @click="selectedId = ''" />
    </div>
  </div>
</template>

<style scoped>
.utility-nodes-guide {
  position: relative;
  width: 100%;
  height: 100%;
  padding: var(--sailor-space-5);
}

.utility-nodes-guide__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--sailor-space-3);
  height: 100%;
  align-content: start;
  overflow-y: auto;
  padding-bottom: 104px;
}

.utility-nodes-guide__state {
  display: grid;
  height: 100%;
  place-items: center;
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-sm);
}

.utility-nodes-guide__node {
  display: grid;
  min-height: 82px;
  align-content: center;
  justify-items: center;
  gap: var(--sailor-space-2);
  border: 1px solid var(--node-border, color-mix(in srgb, var(--node-tone) 38%, var(--sailor-border)));
  border-radius: var(--sailor-radius-md);
  background: var(--node-bg, color-mix(in srgb, var(--node-tone) 12%, var(--sailor-bg-surface)));
  color: var(--sailor-text-primary);
  cursor: pointer;
  font: inherit;
  font-size: var(--sailor-text-xs);
  font-weight: var(--sailor-font-semibold);
  text-align: center;
}

.utility-nodes-guide__node:hover,
.utility-nodes-guide__node--active {
  border-color: var(--node-tone);
  background: color-mix(in srgb, var(--node-tone) 18%, var(--sailor-bg-surface));
}

.utility-nodes-guide__icon {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: var(--sailor-radius-full);
  background: var(--node-bg, color-mix(in srgb, var(--node-tone) 22%, var(--sailor-bg-surface)));
  color: var(--node-tone);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--node-tone) 16%, transparent);
}

.utility-nodes-guide__dialog {
  position: absolute;
  inset: auto var(--sailor-space-5) var(--sailor-space-5);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sailor-space-4);
  border: 1px solid var(--sailor-border);
  border-radius: var(--sailor-radius-md);
  background: var(--sailor-bg-surface);
  padding: var(--sailor-space-4);
  box-shadow: var(--sailor-shadow-lg);
}

.utility-nodes-guide__dialog p {
  margin: 0 0 var(--sailor-space-1);
  color: var(--sailor-text-muted);
  font-size: var(--sailor-text-xs);
  font-weight: var(--sailor-font-semibold);
}

.utility-nodes-guide__dialog h3 {
  margin: 0 0 var(--sailor-space-2);
  color: var(--sailor-text-primary);
  font-size: var(--sailor-text-base);
}

.utility-nodes-guide__dialog span {
  color: var(--sailor-text-secondary);
  font-size: var(--sailor-text-sm);
  line-height: 1.5;
}

@media (max-width: 640px) {
  .utility-nodes-guide__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
