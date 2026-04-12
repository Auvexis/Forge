import { VM } from "vm2";

export interface CodeRunnerResult {
  output: any;
  variables: Record<string, any>;
  logs: string[];
}

/**
 * Executes a JavaScript script inside an isolated vm2 sandbox.
 *
 * The sandbox exposes:
 *  - `context` (read‑only clone of the execution context: trigger payload + step outputs)
 *  - `variables` (read/write workflow‑level variables)
 *  - `console.log()` → captured into `logs[]`
 *
 * The script's **return value** becomes the node's output stored in `context.steps[nodeId]`.
 */
export function runCode(
  script: string,
  context: Record<string, any>,
  variables: Record<string, any>,
  timeoutMs: number = 5000,
): CodeRunnerResult {
  const logs: string[] = [];

  // Shallow‑clone variables so mutations inside the VM propagate back
  const sandboxVars = { ...variables };

  const vm = new VM({
    timeout: timeoutMs,
    sandbox: {
      context: Object.freeze(structuredClone(context)),
      variables: sandboxVars,
      console: {
        log: (...args: any[]) => {
          logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
        },
        warn: (...args: any[]) => {
          logs.push("[WARN] " + args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
        },
        error: (...args: any[]) => {
          logs.push("[ERROR] " + args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
        },
      },
    },
  });

  // Wrap script in an IIFE to allow top-level 'return'
  const wrappedScript = `
    (function() {
      ${script}
    })()
  `;

  const output = vm.run(wrappedScript);

  return {
    output,
    variables: sandboxVars,
    logs,
  };
}
