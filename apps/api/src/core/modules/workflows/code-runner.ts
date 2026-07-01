import vm from "node:vm";
import { createRequire } from "node:module";

// Safely create a require function for the sandbox
const sandboxRequire = typeof require !== "undefined" ? require : createRequire(import.meta.url || __filename);

export interface CodeRunnerResult {
  output: any;
  variables: Record<string, any>;
  logs: string[];
}

function clean(obj: any, visited = new WeakSet()): any {
  if (obj === null || typeof obj !== "object") return obj;

  if (visited.has(obj)) return "[Circular]";
  visited.add(obj);

  if (typeof obj.pipe === "function" && typeof obj.on === "function") {
    return "<ReadableStream>";
  }

  if (Buffer.isBuffer(obj)) return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => clean(item, visited));
  }

  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === "function" || typeof value === "symbol") continue;
    cleaned[key] = clean(value, visited);
  }
  return cleaned;
}

export function runCode(
  script: string,
  context: Record<string, any>,
  variables: Record<string, any>,
  timeoutMs: number = 5000,
): CodeRunnerResult {
  const logs: string[] = [];
  const sandboxVars = { ...variables };
  const cleanedContext = clean(context);

  const sandbox = {
    context: cleanedContext,
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
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    require: sandboxRequire,
    process,
    Buffer,
  };

  vm.createContext(sandbox);

  const wrappedScript = `
    (async function() {
      ${script}
    })()
  `;

  const scriptObj = new vm.Script(wrappedScript);
  const output = scriptObj.runInContext(sandbox, { timeout: timeoutMs });

  return {
    output,
    variables: sandboxVars,
    logs,
  };
}
