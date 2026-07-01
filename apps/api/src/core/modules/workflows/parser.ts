import { TemplateEngine, resolvePath } from "./template-engine.ts";

export { resolvePath };

export const WorkflowParser = {
  /**
   * Backward-compatible workflow parameter evaluator.
   * Exact templates preserve object references; inline missing paths stay as-is.
   */
  evalParams: (params: Record<string, any>, context: any): Record<string, any> => {
    return TemplateEngine.evalParams(params, context, { missingPath: "preserve" });
  },
};
