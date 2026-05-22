# Plugin Creator Node Code Preview Compiler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o Plugin Creator gerar `methods.ts` como codigo sequencial baseado nos nodes do canvas, adicionar `Code Block`, remover nodes pequenos do canvas e mostrar um preview read-only em tempo real no frontend.

**Architecture:** Separar o sistema em tres camadas: blueprint normalizado, compiler backend e preview frontend. O canvas vira fluxo de alto nivel (`Method`, `HTTP Request`, `Response Mapper`, `Error Mapper`, `Code Block`); detalhes pequenos ficam nos settings dos nodes grandes. O backend vira a fonte da verdade para gerar codigo e o frontend consome um endpoint de preview com debounce para nao duplicar gerador.

**Tech Stack:** Vue 3, Pinia, Vue Flow, BaseCodeEditor/Monaco, Fastify, TypeScript, Node test runner.

---

## Scope Decision

Fazer isso em etapas. Nao mudar o runtime dos plugins para acessar core/engine. O codigo gerado continua plugin generico, baseado em `@auvexis/sailor-sdk`, `fetch`, helpers locais e dados do manifest.

Regra importante: `Code Block` permite codigo do autor do plugin, mas nao deve gerar imports nem acessar paths do Sailor/core. Validacao minima deve bloquear `import`, `require`, `process`, `fs`, `child_process`, `eval`, `Function`, `globalThis`, `__dirname`, `__filename`.

---

## File Map

**Backend types and validation**
- Modify: `server/src/core/modules/plugin-creator/plugin-blueprint-types.ts`
- Modify: `server/src/core/modules/plugin-creator/plugin-blueprint-validation.ts`
- Modify: `client-vue/src/core/types/plugin-creator.types.ts`

**Backend compiler**
- Create: `server/src/core/modules/plugin-creator/plugin-method-plan.ts`
- Create: `server/src/core/modules/plugin-creator/plugin-method-code-writer.ts`
- Modify: `server/src/core/modules/plugin-creator/plugin-methods-generator.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-method-plan.test.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-method-code-writer.test.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-methods-generator.test.ts`

**Backend preview route**
- Modify: `server/src/core/routes/plugin-creator.routes.ts`
- Modify: `client-vue/src/core/api/endpoints.ts`
- Modify: `client-vue/src/core/api/plugin-creator.api.ts`
- Test: `server/src/core/routes/plugin-creator-code-preview.routes.test.ts`
- Test: `client-vue/src/core/api/plugin-creator.api.contract.test.ts`

**Frontend canvas/settings**
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorAddItemPanel.vue`
- Modify: `client-vue/src/app/pages/PluginCreatorPage.vue`
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorCanvas.vue`
- Create: `client-vue/src/features/plugin-creator/components/nodes/CodeBlockNode.vue`
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorNodeSettingsPanel.vue`
- Modify: `client-vue/src/features/plugin-creator/components/node-editors/PluginCreatorNodeEditorFields.vue`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorCanvas.contract.test.ts`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorAddItemPanel.contract.test.ts`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorNodeSettingsPanel.contract.test.ts`

**Frontend live code minimap**
- Create: `client-vue/src/features/plugin-creator/components/PluginCreatorCodePreviewMinimap.vue`
- Create: `client-vue/src/features/plugin-creator/composables/usePluginCreatorCodePreview.ts`
- Modify: `client-vue/src/app/pages/PluginCreatorPage.vue`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorCodePreviewMinimap.contract.test.ts`

---

## Task 1: Normalize Blueprint Types For Big Nodes

**Files:**
- Modify: `server/src/core/modules/plugin-creator/plugin-blueprint-types.ts`
- Modify: `server/src/core/modules/plugin-creator/plugin-blueprint-validation.ts`
- Modify: `client-vue/src/core/types/plugin-creator.types.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-blueprint-validation.test.ts`

- [ ] **Step 1: Write failing validation tests**

Add tests proving:
- `codeBlock` is accepted as a canvas node type.
- `input`, `credential`, `header`, `query`, `body` remain loadable for backward compatibility.
- A method can store `codeBlocks`.

Test shape:

```ts
it("accepts code block nodes and method code blocks", () => {
  const blueprint = createValidBlueprint();
  blueprint.methods[0]!.codeBlocks = [
    {
      id: "code_prepare_payload",
      name: "Prepare payload",
      source: "return { name: params.name };",
      outputName: "preparedPayload",
    },
  ];
  blueprint.canvas.nodes.code_prepare_payload = {
    id: "code_prepare_payload",
    type: "codeBlock",
    position: { x: 300, y: 0 },
    data: { methodId: blueprint.methods[0]!.id, codeBlockId: "code_prepare_payload" },
  };

  const result = validatePluginBlueprint(blueprint);

  assert.equal(result.success, true);
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
cd server
node --test src/core/modules/plugin-creator/plugin-blueprint-validation.test.ts
```

Expected: FAIL because `codeBlock` and `codeBlocks` do not exist.

- [ ] **Step 3: Implement minimal type changes**

Add backend and frontend types:

```ts
export interface PluginBlueprintCodeBlock {
  id: string;
  name: string;
  source: string;
  outputName?: string;
}

export interface PluginBlueprintMethod {
  // existing fields
  codeBlocks?: PluginBlueprintCodeBlock[];
}

export type PluginBlueprintNodeType =
  | "method"
  | "request"
  | "responseMapper"
  | "errorMapper"
  | "output"
  | "codeBlock"
  | "input"
  | "credential"
  | "header"
  | "query"
  | "body"
  | "note"
  | "group";
```

Update Zod schema with:

```ts
const codeBlockSchema = z.object({
  id: z.string().regex(pluginCreatorIdPattern, "Invalid code block id"),
  name: z.string().min(1),
  source: z.string(),
  outputName: z.string().regex(fieldNamePattern, "Invalid output name").optional(),
});
```

- [ ] **Step 4: Run GREEN**

Run same server test. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/core/modules/plugin-creator/plugin-blueprint-types.ts server/src/core/modules/plugin-creator/plugin-blueprint-validation.ts server/src/core/modules/plugin-creator/plugin-blueprint-validation.test.ts client-vue/src/core/types/plugin-creator.types.ts
git commit -m "feat: add plugin creator code block blueprint types"
```

---

## Task 2: Create Backend Method Plan Compiler

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-method-plan.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-method-plan.test.ts`

- [ ] **Step 1: Write failing plan tests**

Test should prove canvas graph order becomes code steps:

```ts
it("orders method canvas nodes into executable method steps", () => {
  const blueprint = createBlueprintWithMethodGraph({
    nodes: ["method_create_lead", "request_create_lead", "map_create_lead", "code_after_map"],
    edges: [
      ["method_create_lead", "request_create_lead"],
      ["request_create_lead", "map_create_lead"],
      ["map_create_lead", "code_after_map"],
    ],
  });

  const [plan] = buildPluginMethodPlans(blueprint);

  assert.equal(plan.handle, "createLead");
  assert.deepEqual(plan.steps.map((step) => step.kind), [
    "httpRequest",
    "responseMapper",
    "codeBlock",
  ]);
});
```

- [ ] **Step 2: Run RED**

```bash
cd server
node --test src/core/modules/plugin-creator/plugin-method-plan.test.ts
```

Expected: FAIL because file/function does not exist.

- [ ] **Step 3: Implement `plugin-method-plan.ts`**

Create interfaces:

```ts
export type PluginMethodPlanStep =
  | { kind: "httpRequest"; nodeId: string; methodId: string }
  | { kind: "responseMapper"; nodeId: string; methodId: string }
  | { kind: "errorMapper"; nodeId: string; methodId: string }
  | { kind: "codeBlock"; nodeId: string; methodId: string; codeBlockId: string };

export interface PluginMethodPlan {
  methodId: string;
  handle: string;
  name: string;
  steps: PluginMethodPlanStep[];
}
```

Implement:

```ts
export function buildPluginMethodPlans(blueprint: PluginBlueprint): PluginMethodPlan[] {
  return blueprint.methods.map((method) => {
    const methodNode = Object.values(blueprint.canvas.nodes).find(
      (node) => node.type === "method" && node.data.methodId === method.id,
    );

    const orderedNodes = methodNode
      ? walkGraphFromNode(blueprint, methodNode.id)
      : [];

    return {
      methodId: method.id,
      handle: method.handle,
      name: method.name,
      steps: orderedNodes.flatMap((node) => nodeToPlanStep(node, method.id)),
    };
  });
}
```

Fallback rule: if no graph nodes exist for the method, return default steps:

```ts
[
  { kind: "httpRequest", nodeId: `${method.id}_request`, methodId: method.id },
  { kind: "responseMapper", nodeId: `${method.id}_response`, methodId: method.id },
  { kind: "errorMapper", nodeId: `${method.id}_error`, methodId: method.id },
]
```

- [ ] **Step 4: Run GREEN**

Run method plan test. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/core/modules/plugin-creator/plugin-method-plan.ts server/src/core/modules/plugin-creator/plugin-method-plan.test.ts
git commit -m "feat: compile plugin creator canvas into method plan"
```

---

## Task 3: Write Node-Shaped Method Code Generator

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-method-code-writer.ts`
- Modify: `server/src/core/modules/plugin-creator/plugin-methods-generator.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-method-code-writer.test.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-methods-generator.test.ts`

- [ ] **Step 1: Write failing generator test**

Expected source should include node comments and stable variable names:

```ts
it("emits method source as ordered node statements", () => {
  const blueprint = createBlueprintWithRequestMapperAndCodeBlock();

  const source = generatePluginMethodsSource(blueprint);

  assert.match(source, /\/\/ Node HTTP Request: request_create_lead/);
  assert.match(source, /const request_create_lead = await fetch/);
  assert.match(source, /\/\/ Node Response Mapper: map_create_lead/);
  assert.match(source, /const map_create_lead = mapPluginCreatorResponse/);
  assert.match(source, /\/\/ Node Code Block: code_after_map/);
  assert.match(source, /const code_after_map = await \(async \(\) => \{/);
});
```

- [ ] **Step 2: Run RED**

```bash
cd server
node --test src/core/modules/plugin-creator/plugin-method-code-writer.test.ts src/core/modules/plugin-creator/plugin-methods-generator.test.ts
```

Expected: FAIL because generator still emits generic `rendered/response/body`.

- [ ] **Step 3: Implement writer**

Create writer functions:

```ts
export function writeMethodSource(input: {
  blueprint: PluginBlueprint;
  method: PluginBlueprintMethod;
  plan: PluginMethodPlan;
}): string {
  const steps = input.plan.steps.map((step) => writeStepSource(input.method, step)).join("\n\n");
  return `  ${input.method.handle}: async (params: Record<string, unknown>, context: PluginContext = emptyContext) => {
${indent(steps, 4)}
  }`;
}
```

HTTP step output:

```ts
// Node HTTP Request: request_create_lead
const rendered_request_create_lead = renderPluginRequestTemplate({
  request: {...},
  params,
  credentials: context.credentials ?? {},
}).request;
const request_create_lead_url = buildUrl(rendered_request_create_lead.url, rendered_request_create_lead.query);
const request_create_lead = await fetch(request_create_lead_url, {
  method: "POST",
  headers: rendered_request_create_lead.headers,
  body: rendered_request_create_lead.body === undefined ? undefined : JSON.stringify(rendered_request_create_lead.body),
});
const request_create_lead_body = await parseResponseBody(request_create_lead);
const request_create_lead_response = {
  status: request_create_lead.status,
  headers: headersToRecord(request_create_lead.headers),
  body: request_create_lead_body,
};
```

Response mapper step output:

```ts
// Node Response Mapper: map_create_lead
const map_create_lead = mapPluginCreatorResponse(request_create_lead_response, [...]);
```

Code block step output:

```ts
// Node Code Block: code_after_map
const code_after_map = await (async () => {
  const previous = map_create_lead;
  return previous;
})();
```

The first implementation can use latest available response variable for mapper and latest available value for code block.

- [ ] **Step 4: Keep safety test**

Update existing safety test so malicious strings still appear escaped inside JSON, never as active TS code.

- [ ] **Step 5: Run GREEN**

Run writer and generator tests. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/core/modules/plugin-creator/plugin-method-code-writer.ts server/src/core/modules/plugin-creator/plugin-method-code-writer.test.ts server/src/core/modules/plugin-creator/plugin-methods-generator.ts server/src/core/modules/plugin-creator/plugin-methods-generator.test.ts
git commit -m "feat: generate plugin methods from canvas nodes"
```

---

## Task 4: Add Code Block Safety Validation

**Files:**
- Create: `server/src/core/modules/plugin-creator/plugin-code-block-safety.ts`
- Test: `server/src/core/modules/plugin-creator/plugin-code-block-safety.test.ts`
- Modify: `server/src/core/modules/plugin-creator/plugin-method-code-writer.ts`

- [ ] **Step 1: Write failing safety tests**

```ts
it("rejects code blocks that try to import modules or access process", () => {
  for (const source of [
    "import fs from 'node:fs'",
    "const fs = require('fs')",
    "return process.env",
    "return eval('1 + 1')",
    "return Function('return process')()",
  ]) {
    assert.throws(() => assertSafePluginCreatorCodeBlock(source), /not allowed/);
  }
});

it("allows plain transformations using params context and previous", () => {
  assert.doesNotThrow(() =>
    assertSafePluginCreatorCodeBlock("return { name: params.name, previous };"),
  );
});
```

- [ ] **Step 2: Run RED**

```bash
cd server
node --test src/core/modules/plugin-creator/plugin-code-block-safety.test.ts
```

Expected: FAIL because helper does not exist.

- [ ] **Step 3: Implement minimal scanner**

```ts
const forbiddenPatterns = [
  /\bimport\s+/,
  /\brequire\s*\(/,
  /\bprocess\b/,
  /\bchild_process\b/,
  /\bnode:/,
  /\bfs\b/,
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\bglobalThis\b/,
  /\b__dirname\b/,
  /\b__filename\b/,
];

export function assertSafePluginCreatorCodeBlock(source: string): void {
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      throw new Error("Code block contains not allowed runtime access");
    }
  }
}
```

- [ ] **Step 4: Call scanner before emitting code block**

In `plugin-method-code-writer.ts`, before writing code block source:

```ts
assertSafePluginCreatorCodeBlock(codeBlock.source);
```

- [ ] **Step 5: Run GREEN**

Run safety and writer tests. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/core/modules/plugin-creator/plugin-code-block-safety.ts server/src/core/modules/plugin-creator/plugin-code-block-safety.test.ts server/src/core/modules/plugin-creator/plugin-method-code-writer.ts
git commit -m "feat: validate plugin creator code blocks"
```

---

## Task 5: Add Draft Code Preview Endpoint

**Files:**
- Modify: `server/src/core/routes/plugin-creator.routes.ts`
- Test: `server/src/core/routes/plugin-creator-code-preview.routes.test.ts`
- Modify: `client-vue/src/core/api/endpoints.ts`
- Modify: `client-vue/src/core/api/plugin-creator.api.ts`
- Test: `client-vue/src/core/api/plugin-creator.api.contract.test.ts`

- [ ] **Step 1: Write failing route test**

```ts
it("generates methods source from an unsaved blueprint draft", async () => {
  const app = await buildPluginCreatorRoutesTestApp();
  const blueprint = createValidBlueprint();

  const response = await app.inject({
    method: "POST",
    url: "/plugin-creator/blueprints/preview-code",
    payload: { blueprint },
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.data.files[0].relativePath, "methods.ts");
  assert.match(body.data.files[0].content, /export const methods = \{/);
});
```

- [ ] **Step 2: Run RED**

```bash
cd server
node --test src/core/routes/plugin-creator-code-preview.routes.test.ts
```

Expected: FAIL 404.

- [ ] **Step 3: Implement route**

Add route:

```ts
fastify.post("/plugin-creator/blueprints/preview-code", async (req, reply) => {
  const { blueprint } = previewCodeSchema.parse(req.body);
  const parsed = parsePluginBlueprint(blueprint);
  const methodsSource = generatePluginMethodsSource(parsed);
  return reply.send({
    status_code: 200,
    message: "Plugin code preview generated",
    error: null,
    data: {
      files: [{ relativePath: "methods.ts", content: methodsSource }],
    },
  });
});
```

- [ ] **Step 4: Add client API**

Endpoint:

```ts
PLUGIN_CREATOR_PREVIEW_CODE: "/plugin-creator/blueprints/preview-code",
```

Client:

```ts
previewCode: (blueprint: PluginBlueprint) =>
  apiRequest<PluginCreatorGeneratedPreview>(ENDPOINTS.PLUGIN_CREATOR_PREVIEW_CODE, {
    method: "POST",
    body: { blueprint },
  }),
```

- [ ] **Step 5: Run GREEN**

Run server route test and client API contract test. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/core/routes/plugin-creator.routes.ts server/src/core/routes/plugin-creator-code-preview.routes.test.ts client-vue/src/core/api/endpoints.ts client-vue/src/core/api/plugin-creator.api.ts client-vue/src/core/api/plugin-creator.api.contract.test.ts
git commit -m "feat: add plugin creator draft code preview"
```

---

## Task 6: Clean Frontend Canvas Node Palette

**Files:**
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorAddItemPanel.vue`
- Modify: `client-vue/src/app/pages/PluginCreatorPage.vue`
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorCanvas.vue`
- Create: `client-vue/src/features/plugin-creator/components/nodes/CodeBlockNode.vue`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorAddItemPanel.contract.test.ts`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorCanvas.contract.test.ts`

- [ ] **Step 1: Write failing frontend contracts**

Assert palette includes only:

```ts
[
  "Method",
  "HTTP Request",
  "Response Mapping",
  "Error Mapping",
  "Code Block",
  "Output",
]
```

Assert palette does not include:

```ts
[
  "Input Field",
  "Credential Field",
  "Header",
  "Query Param",
  "JSON Body",
]
```

Assert canvas registers `codeBlock: markRaw(CodeBlockNode)`.

- [ ] **Step 2: Run RED**

```bash
cd client-vue
node --test src/features/plugin-creator/components/__tests__/PluginCreatorAddItemPanel.contract.test.ts src/features/plugin-creator/components/__tests__/PluginCreatorCanvas.contract.test.ts
```

Expected: FAIL because old nodes are still in palette and code block does not exist.

- [ ] **Step 3: Implement palette cleanup**

Set palette types:

```ts
export type PluginCreatorAddItemType =
  | "method"
  | "request"
  | "responseMapper"
  | "errorMapper"
  | "codeBlock"
  | "output";
```

In `PluginCreatorCanvas.vue`:

```ts
import CodeBlockNode from "./nodes/CodeBlockNode.vue";

const nodeTypes = {
  method: markRaw(MethodNode),
  request: markRaw(RequestNode),
  responseMapper: markRaw(ResponseMapperNode),
  errorMapper: markRaw(ErrorMapperNode),
  codeBlock: markRaw(CodeBlockNode),
  output: markRaw(OutputNode),
};
```

- [ ] **Step 4: Create `CodeBlockNode.vue`**

Use same visual pattern as existing plugin creator nodes. Display label, method id, and short source preview.

- [ ] **Step 5: Run GREEN**

Run frontend contract tests. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client-vue/src/features/plugin-creator/components/PluginCreatorAddItemPanel.vue client-vue/src/app/pages/PluginCreatorPage.vue client-vue/src/features/plugin-creator/components/PluginCreatorCanvas.vue client-vue/src/features/plugin-creator/components/nodes/CodeBlockNode.vue client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorAddItemPanel.contract.test.ts client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorCanvas.contract.test.ts
git commit -m "feat: simplify plugin creator canvas nodes"
```

---

## Task 7: Move Small Config Into Method And Request Settings

**Files:**
- Modify: `client-vue/src/features/plugin-creator/components/PluginCreatorNodeSettingsPanel.vue`
- Modify: `client-vue/src/features/plugin-creator/components/node-editors/PluginCreatorNodeEditorFields.vue`
- Modify: `client-vue/src/features/plugin-creator/stores/pluginCreator.store.ts`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorNodeSettingsPanel.contract.test.ts`

- [ ] **Step 1: Write failing settings contracts**

Assert Method settings include:

```ts
["Inputs", "Credentials", "Add input", "Add credential"]
```

Assert Request settings include:

```ts
["Headers", "Query params", "Body", "Add header", "Add query param"]
```

Assert Code Block settings include:

```ts
["Code Block", "Output name", "Source"]
```

- [ ] **Step 2: Run RED**

```bash
cd client-vue
node --test src/features/plugin-creator/components/__tests__/PluginCreatorNodeSettingsPanel.contract.test.ts
```

Expected: FAIL because settings are not grouped like this yet.

- [ ] **Step 3: Add store helpers**

Add focused helpers:

```ts
addMethodInput(methodId: string): void
updateMethodInputByIndex(methodId: string, index: number, payload: Partial<PluginBlueprintInput>): void
removeMethodInput(methodId: string, index: number): void
addCredentialField(): void
updateCredentialFieldByIndex(index: number, payload: Partial<PluginBlueprintCredentialField>): void
removeCredentialField(index: number): void
addRequestHeader(methodId: string): void
addRequestQuery(methodId: string): void
updateRequestKeyValue(methodId: string, section: "headers" | "query", index: number, payload: PluginBlueprintKeyValue): void
removeRequestKeyValue(methodId: string, section: "headers" | "query", index: number): void
upsertCodeBlock(methodId: string, payload: PluginBlueprintCodeBlock): void
```

- [ ] **Step 4: Implement settings UI**

Use existing `BaseInput`, `BaseSelect`, `BaseTextarea`, `BaseButton`, and `BaseCodeEditor` for code source.

Code block source editor:

```vue
<BaseCodeEditor
  :model-value="codeBlock.source"
  language="typescript"
  label="Source"
  height="220px"
  @update:model-value="updateCodeBlock({ source: $event })"
/>
```

- [ ] **Step 5: Run GREEN**

Run settings contract. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client-vue/src/features/plugin-creator/components/PluginCreatorNodeSettingsPanel.vue client-vue/src/features/plugin-creator/components/node-editors/PluginCreatorNodeEditorFields.vue client-vue/src/features/plugin-creator/stores/pluginCreator.store.ts client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorNodeSettingsPanel.contract.test.ts
git commit -m "feat: move plugin creator field config into node settings"
```

---

## Task 8: Add Live Code Preview Minimap

**Files:**
- Create: `client-vue/src/features/plugin-creator/components/PluginCreatorCodePreviewMinimap.vue`
- Create: `client-vue/src/features/plugin-creator/composables/usePluginCreatorCodePreview.ts`
- Modify: `client-vue/src/app/pages/PluginCreatorPage.vue`
- Test: `client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorCodePreviewMinimap.contract.test.ts`

- [ ] **Step 1: Write failing minimap contract**

```ts
it("renders a read-only BaseCodeEditor for generated method preview", () => {
  const source = fs.readFileSync(componentPath, "utf8");

  assert.match(source, /BaseCodeEditor/);
  assert.match(source, /readonly/);
  assert.match(source, /Generated method/);
  assert.match(source, /methods\.ts/);
});
```

Assert page mounts:

```ts
assert.match(pageSource, /PluginCreatorCodePreviewMinimap/);
```

- [ ] **Step 2: Run RED**

```bash
cd client-vue
node --test src/features/plugin-creator/components/__tests__/PluginCreatorCodePreviewMinimap.contract.test.ts
```

Expected: FAIL because component does not exist.

- [ ] **Step 3: Implement composable with debounce**

Composable:

```ts
export function usePluginCreatorCodePreview(blueprint: Ref<PluginBlueprint | null>) {
  const code = ref("");
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const refresh = useDebounceFn(async () => {
    if (!blueprint.value) {
      code.value = "";
      return;
    }
    isLoading.value = true;
    error.value = null;
    try {
      const preview = await pluginCreatorApi.previewCode(blueprint.value);
      code.value = preview.files.find((file) => file.relativePath === "methods.ts")?.content ?? "";
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to preview generated code";
    } finally {
      isLoading.value = false;
    }
  }, 350);

  watch(blueprint, () => void refresh(), { deep: true, immediate: true });

  return { code, isLoading, error, refresh };
}
```

- [ ] **Step 4: Implement minimap component**

Component:

```vue
<template>
  <aside class="plugin-creator-code-preview-minimap" aria-label="Generated method preview">
    <header>
      <strong>Generated method</strong>
      <small>methods.ts</small>
    </header>
    <BaseCodeEditor
      :model-value="code"
      language="typescript"
      height="100%"
      readonly
    />
  </aside>
</template>
```

CSS: fixed/absolute right top within canvas shell, width around `360px`, max-height `46vh`, collapsible later only if needed.

- [ ] **Step 5: Mount in page**

```vue
<PluginCreatorCodePreviewMinimap :blueprint="store.activeBlueprint" />
```

- [ ] **Step 6: Run GREEN**

Run minimap contract. Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add client-vue/src/features/plugin-creator/components/PluginCreatorCodePreviewMinimap.vue client-vue/src/features/plugin-creator/composables/usePluginCreatorCodePreview.ts client-vue/src/app/pages/PluginCreatorPage.vue client-vue/src/features/plugin-creator/components/__tests__/PluginCreatorCodePreviewMinimap.contract.test.ts
git commit -m "feat: show plugin creator live generated code preview"
```

---

## Task 9: Verify End-To-End Generation

**Files:**
- Modify if needed after failures.

- [ ] **Step 1: Run backend tests**

```bash
cd server
node --test src/core/modules/plugin-creator/plugin-method-plan.test.ts src/core/modules/plugin-creator/plugin-method-code-writer.test.ts src/core/modules/plugin-creator/plugin-methods-generator.test.ts src/core/routes/plugin-creator-code-preview.routes.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run frontend contracts**

```bash
cd client-vue
node --test src/features/plugin-creator/components/__tests__/PluginCreatorCanvas.contract.test.ts src/features/plugin-creator/components/__tests__/PluginCreatorAddItemPanel.contract.test.ts src/features/plugin-creator/components/__tests__/PluginCreatorNodeSettingsPanel.contract.test.ts src/features/plugin-creator/components/__tests__/PluginCreatorCodePreviewMinimap.contract.test.ts src/app/PluginCreatorPage.contract.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run type/build**

```bash
cd client-vue
npm run type-check
npm run build

cd ../server
npm run build
```

Expected: all PASS. Vite chunk warnings are acceptable if build exits `0`.

- [ ] **Step 4: Browser smoke**

Flow:
1. Open `http://localhost:23802/plugin-creator`.
2. Create new plugin.
3. Click `Add first step...`.
4. Add `Method`.
5. Add `HTTP Request`.
6. Configure URL/method/body.
7. Add `Response Mapper`.
8. Add `Code Block`.
9. Confirm minimap updates `methods.ts` after each edit.
10. Click `Run`, `Save`, `Publish`, `Export ZIP`.

Expected:
- Canvas has no small field nodes.
- Generated preview contains node comments.
- Published plugin has generated `methods.ts` and `methods.js`.

- [ ] **Step 5: Commit final verification fixes**

```bash
git add <only files changed during verification>
git commit -m "fix: verify plugin creator node code preview flow"
```

---

## Self Review

- Spec coverage: node-shaped generated code, `Code Block`, minimap, small-node cleanup, backend source of truth, run/publish/export verification covered.
- Placeholder scan: no `TBD`; every task has concrete paths, tests, commands and expected output.
- Type consistency: `PluginBlueprintCodeBlock`, `PluginMethodPlan`, `PluginMethodPlanStep`, `previewCode`, and `PluginCreatorCodePreviewMinimap` names are consistent across tasks.
