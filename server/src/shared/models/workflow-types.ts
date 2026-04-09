// 1. O Gatilho
export interface WorkflowTrigger {
  type: "manual" | "webhook" | "cron" | "event";
  schema?: Record<string, any>; // Opcional, para validar entradas manuais
}

// 2. Política de Falhas
export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: "fixed" | "linear" | "exponential";
  intervalSeconds: number;
}

// 3. O Passo a ser executado
export interface WorkflowNode {
  pluginId: string;
  action: string;
  name: string;
  params: Record<string, any>; // Aqui virão as strings com {{ }}
  retryPolicy?: RetryPolicy;
  ui?: {
    positionX: number;
    positionY: number;
  };
}

// 4. As Conexões
export interface WorkflowEdge {
  id: string;
  source: string; // ID do Node de saída
  target: string; // ID do Node de entrada
  condition?: string; // Expressão que deve ser verdadeira para o edge executar
}

export interface WorkflowMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
  isActive: boolean;
  public: boolean;
  createdAt: string;
}

// 5. O Payload Completo (A raiz)
export interface WorkflowItem {
  metadata: WorkflowMetadata;
  trigger: WorkflowTrigger;
  nodes: Record<string, WorkflowNode>; // Dicionário de Nós
  edges: WorkflowEdge[];
}
