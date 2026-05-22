import type { PluginBlueprint, PluginBlueprintMethod } from "./plugin-blueprint-types.ts";
import type { PluginMethodPlan, PluginMethodPlanStep } from "./plugin-method-plan.ts";
import { assertSafePluginCreatorCodeBlock } from "./plugin-code-block-safety.ts";

interface WriterState {
  latestResponse: string | null;
  latestValue: string | null;
}

export function writeMethodSource(input: {
  blueprint: PluginBlueprint;
  method: PluginBlueprintMethod;
  plan: PluginMethodPlan;
}): string {
  const state: WriterState = { latestResponse: null, latestValue: null };
  const steps = input.plan.steps
    .map((step) => writeStepSource(input.method, step, state))
    .join("\n\n");
  const result = state.latestValue ?? "undefined";

  return `  ${input.method.handle}: async (params: Record<string, unknown>, context: PluginContext = emptyContext) => {
${indent(steps, 4)}
    return ${result};
  }`;
}

function writeStepSource(
  method: PluginBlueprintMethod,
  step: PluginMethodPlanStep,
  state: WriterState,
): string {
  switch (step.kind) {
    case "httpRequest":
      return writeHttpRequestStep(method, step, state);
    case "responseMapper":
      return writeResponseMapperStep(method, step, state);
    case "errorMapper":
      return writeErrorMapperStep(method, step, state);
    case "codeBlock":
      return writeCodeBlockStep(method, step, state);
  }
}

function writeHttpRequestStep(
  method: PluginBlueprintMethod,
  step: Extract<PluginMethodPlanStep, { kind: "httpRequest" }>,
  state: WriterState,
): string {
  const request = JSON.stringify(method.request, null, 2);
  const rendered = `rendered_${step.nodeId}`;
  const url = `${step.nodeId}_url`;
  const response = step.nodeId;
  const body = `${step.nodeId}_body`;
  const responseLike = `${step.nodeId}_response`;
  state.latestResponse = responseLike;
  state.latestValue = responseLike;

  return `// Node HTTP Request: ${step.nodeId}
const ${rendered} = renderPluginRequestTemplate({
  request: ${indent(request, 2)},
  params,
  credentials: context.credentials ?? {},
}).request;
const ${url} = buildUrl(${rendered}.url, ${rendered}.query);
const ${response} = await fetch(${url}, {
  method: ${JSON.stringify(method.request.method)},
  headers: ${rendered}.headers,
  body: ${rendered}.body === undefined ? undefined : JSON.stringify(${rendered}.body),
});
const ${body} = await parseResponseBody(${response});
const ${responseLike} = {
  status: ${response}.status,
  headers: headersToRecord(${response}.headers),
  body: ${body},
};`;
}

function writeResponseMapperStep(
  method: PluginBlueprintMethod,
  step: Extract<PluginMethodPlanStep, { kind: "responseMapper" }>,
  state: WriterState,
): string {
  const response = state.latestResponse ?? "{}";
  const mapping = JSON.stringify(method.responseMapping, null, 2);
  state.latestValue = step.nodeId;

  return `// Node Response Mapper: ${step.nodeId}
const ${step.nodeId} = mapPluginCreatorResponse(${response}, ${indent(mapping, 2)});`;
}

function writeErrorMapperStep(
  method: PluginBlueprintMethod,
  step: Extract<PluginMethodPlanStep, { kind: "errorMapper" }>,
  state: WriterState,
): string {
  const response = state.latestResponse ?? "{}";
  const status = state.latestResponse ? `${state.latestResponse}.status` : "200";
  const body = state.latestResponse ? `${state.latestResponse}.body` : "null";
  const mapping = JSON.stringify(method.errorMapping, null, 2);

  return `// Node Error Mapper: ${step.nodeId}
const ${step.nodeId} = mapPluginCreatorError(${response}, ${indent(mapping, 2)});
if (${step.nodeId}) {
  throw new SailorPluginError(${step.nodeId}.message, {
    code: ${step.nodeId}.code,
    status: ${step.nodeId}.status ?? undefined,
    details: ${step.nodeId}.details,
  });
}
assertHttpOk({ status: ${status}, body: ${body} });`;
}

function writeCodeBlockStep(
  method: PluginBlueprintMethod,
  step: Extract<PluginMethodPlanStep, { kind: "codeBlock" }>,
  state: WriterState,
): string {
  const codeBlock = method.codeBlocks?.find((candidate) => candidate.id === step.codeBlockId) ?? {
    id: step.codeBlockId,
    name: step.codeBlockId,
    source: "return previous;",
  };
  assertSafePluginCreatorCodeBlock(codeBlock.source);
  const previous = state.latestValue ?? "undefined";
  state.latestValue = codeBlock.outputName ?? step.nodeId;

  return `// Node Code Block: ${step.nodeId}
const ${step.nodeId} = await (async () => {
  const previous = ${previous};
${indent(codeBlock.source, 2)}
})();`;
}

function indent(value: string, spaces: number): string {
  const padding = " ".repeat(spaces);
  return padding + value.replace(/\n/g, `\n${padding}`);
}
