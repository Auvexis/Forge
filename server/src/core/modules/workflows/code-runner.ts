import { VM } from "vm2";

export interface CodeRunnerResult {
  output: any;
  variables: Record<string, any>;
  logs: string[];
}

/**
 * Recursively sanitizes the context to make it safe for structuredClone.
 * Detects and replaces non-serializable objects:
 *  - Functions/Symbols → removed
 *  - Streams (Readable/Writable) → replaced with placeholder string
 *  - Buffers → preserved (structuredClone supports ArrayBuffers/Uint8Arrays)
 */
function clean(obj: any, visited = new WeakSet()): any {
  if (obj === null || typeof obj !== "object") return obj;

  // Prevent infinite recursion on circular references
  if (visited.has(obj)) return "[Circular]";
  visited.add(obj);

  // 1. Detect Streams (Duck typing for Node.js ReadableStream/undici)
  if (typeof obj.pipe === "function" && typeof obj.on === "function") {
    return "<ReadableStream>";
  }

  // 2. Handle Buffers (Already cloneable in most Node versions via structuredClone, 
  // but we keep them as-is to preserve binary data for those that need it)
  if (Buffer.isBuffer(obj)) return obj;

  // 3. Recursive cleaning for Arrays
  if (Array.isArray(obj)) {
    return obj.map(item => clean(item, visited));
  }

  // 4. Recursive cleaning for Objects
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === "function" || typeof value === "symbol") continue;
    cleaned[key] = clean(value, visited);
  }
  return cleaned;
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

  // Deep-clean the context to remove non-serializable elements (like functions)
  // before isolation. This prevents "could not be cloned" errors.
  const cleanedContext = clean(context);

  const vm = new VM({
    timeout: timeoutMs,
    sandbox: {
      context: Object.freeze(structuredClone(cleanedContext)),
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
