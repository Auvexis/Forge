export type PluginMethodPlanStep =
  | { kind: "httpRequest"; nodeId: string; methodId: string }
  | { kind: "responseMapper"; nodeId: string; methodId: string }
  | { kind: "errorMapper"; nodeId: string; methodId: string }
  | { kind: "codeBlock"; nodeId: string; methodId: string; codeBlockId: string }
  | {
      kind: "if";
      nodeId: string;
      methodId: string;
      condition: string;
      thenSteps: PluginMethodPlanStep[];
      elseSteps: PluginMethodPlanStep[];
    }
  | {
      kind: "switch";
      nodeId: string;
      methodId: string;
      expression: string;
      cases: PluginMethodPlanSwitchCase[];
      defaultSteps: PluginMethodPlanStep[];
    }
  | {
      kind: "tryCatch";
      nodeId: string;
      methodId: string;
      errorVariable: string;
      trySteps: PluginMethodPlanStep[];
      catchSteps: PluginMethodPlanStep[];
    }
  | {
      kind: "jsonTransform";
      nodeId: string;
      methodId: string;
      expression: string;
      outputName?: string;
    }
  | {
      kind: "return";
      nodeId: string;
      methodId: string;
      valueExpression: string;
    }
  | {
      kind: "for";
      nodeId: string;
      methodId: string;
      itemVariable: string;
      fromExpression?: string;
      toExpression?: string;
      iterableExpression?: string;
      bodySteps: PluginMethodPlanStep[];
    }
  | {
      kind: "forEach";
      nodeId: string;
      methodId: string;
      arrayExpression: string;
      itemVariable: string;
      bodySteps: PluginMethodPlanStep[];
    };

export interface PluginMethodPlanSwitchCase {
  id: string;
  label: string;
  value: unknown;
  handle: string;
  steps: PluginMethodPlanStep[];
}

export interface PluginMethodPlan {
  methodId: string;
  handle: string;
  name: string;
  steps: PluginMethodPlanStep[];
}
