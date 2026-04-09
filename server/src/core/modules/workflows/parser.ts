export function resolvePath(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

export const WorkflowParser = {
  /**
   * Evaluates parameters against a context object.
   * If a parameter exactly matches "{{ path.to.var }}", it returns the exact object reference
   * (e.g. keeping Buffers intact).
   * If it contains variables mixed with text like "Hello {{ path.to.var }}", it replaces them as strings.
   */
  evalParams: (params: Record<string, any>, context: any): Record<string, any> => {
    const cooked: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") {
        // Check if value is strictly a single {{ var }} 
        const exactMatch = /^{{\s*([a-zA-Z0-9_.\[\]]+)\s*}}$/.exec(value.trim());
        if (exactMatch) {
          cooked[key] = resolvePath(context, exactMatch[1]);
          continue;
        }

        // Otherwise try inline interpolation
        cooked[key] = value.replace(/{{\s*([a-zA-Z0-9_.\[\]]+)\s*}}/g, (match, path) => {
          const resolved = resolvePath(context, path);
          return resolved !== undefined && resolved !== null ? String(resolved) : match;
        });
      } else if (typeof value === "object" && value !== null) {
         // recursively eval inner objects/arrays
         if (Array.isArray(value)) {
           cooked[key] = value.map(item => 
             typeof item === "object" && item !== null ? WorkflowParser.evalParams(item, context) : item
           );
         } else {
           cooked[key] = WorkflowParser.evalParams(value, context);
         }
      } else {
        cooked[key] = value; // primitives
      }
    }

    return cooked;
  }
};
