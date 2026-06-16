import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createUtilityNodeRegistry } from "../registry.ts";
import type { WorkflowExecutionContext } from "../types.ts";
import type { WorkflowItem } from "../../../shared/models/workflow-types.ts";

describe("retrieval utility node handlers", () => {
  it("registers first-party retrieval handlers with explicit metadata", () => {
    const registry = createUtilityNodeRegistry();

    for (const type of [
      "text-dataset",
      "file-dataset",
      "database-dataset",
      "embeddings",
      "vector-store",
      "retriever",
    ] as const) {
      const handler = registry.get(type);
      assert.equal(handler.type, type);
      assert.ok(handler.metadata.description.length > 0);
      assert.ok(handler.metadata.outputs.length > 0);
      assert.ok(handler.metadata.errors.length > 0);
    }
  });

  it("text dataset handler returns generic items consumable by non-AI nodes", async () => {
    const registry = createUtilityNodeRegistry();
    const handler = registry.get("text-dataset");

    const result = await handler.execute({
      nodeId: "dataset",
      executionId: "exec-1",
      workflow: {
        metadata: {
          id: "wf-1",
          name: "Workflow",
          version: "1.0.0",
          isActive: false,
          isDraft: true,
          public: false,
          createdAt: "2026-06-10T00:00:00.000Z",
        },
        trigger: { type: "manual" },
        nodes: {},
        edges: [],
      },
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {} as any,
      node: {
        type: "text-dataset",
        name: "Dataset",
        text: "hello world",
        format: "plain-text",
        metadata: { source: "manual" },
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
    });

    assert.equal(result.sourceType, "text");
    assert.equal(result.count, 1);
    assert.deepEqual(result.items[0], {
      id: "dataset:0",
      text: "hello world",
      metadata: { source: "manual" },
      raw: "hello world",
    });
  });

  it("text dataset chunks plain text before vector indexing", async () => {
    const result = await createUtilityNodeRegistry().get("text-dataset").execute({
      nodeId: "dataset",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {} as any,
      node: {
        type: "text-dataset",
        name: "Dataset",
        text: "abcdefghijklmnopqrstuvwxyz",
        format: "plain-text",
        metadata: { source: "manual" },
        chunking: {
          enabled: true,
          chunkSize: 10,
          chunkOverlap: 2,
          contextualOverlapEnabled: false,
        },
      },
    });

    assert.equal(result.count, 3);
    assert.deepEqual(result.items.map((item: any) => item.id), [
      "dataset:0:0",
      "dataset:0:1",
      "dataset:0:2",
    ]);
    assert.deepEqual(result.items.map((item: any) => item.text), [
      "abcdefghij",
      "ijklmnopqr",
      "qrstuvwxyz",
    ]);
    assert.deepEqual(result.items[1].metadata, {
      source: "manual",
      chunk: { index: 1, start: 8, end: 18 },
    });
  });

  it("text dataset JSON array output can feed Split In Batches", async () => {
    const registry = createUtilityNodeRegistry();
    const workflow = workflowFixture();
    const context: WorkflowExecutionContext = { trigger: {}, steps: {}, variables: {} };
    const dataset = await registry.get("text-dataset").execute({
      nodeId: "dataset",
      executionId: "exec-1",
      workflow,
      edges: workflow.edges,
      context,
      services: {} as any,
      node: {
        type: "text-dataset",
        name: "Dataset",
        text: JSON.stringify([
          { id: "a", body: "first", status: "new" },
          { id: "b", body: "second", status: "sent" },
        ]),
        format: "json-array",
        metadata: { source: "json" },
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
    });
    context.steps.dataset = { output: dataset };

    const split = await registry.get("split-in-batches").execute({
      nodeId: "split",
      executionId: "exec-1",
      workflow,
      edges: workflow.edges,
      context,
      services: {
        executeNode: async () => undefined,
        executeWorkflow: async () => undefined,
        getWorkflowById: () => null,
        emitInternalEvent: async () => ({ triggered: [] }),
        resolvePendingWebhookResponse: () => false,
        emitNodeStart: () => undefined,
        emitNodeSuccess: () => undefined,
        emitNodeFailure: () => undefined,
      },
      node: {
        type: "split-in-batches",
        name: "Split",
        collection: "steps.dataset.output.items",
        batchSize: 1,
      },
    });

    assert.equal(dataset.count, 2);
    assert.equal(dataset.items[0].id, "a");
    assert.equal(dataset.items[0].text, "first");
    assert.deepEqual(dataset.items[0].metadata, { source: "json", status: "new" });
    assert.deepEqual(split, { batches: 2, totalItems: 2 });
  });

  it("file dataset decodes an uploaded base64 file into a dataset item", async () => {
    const handler = createUtilityNodeRegistry().get("file-dataset");
    const result = await handler.execute({
      nodeId: "files",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {} as any,
      node: {
        type: "file-dataset",
        name: "Files",
        files: [{
          filename: "notes.txt",
          content: Buffer.from("hello from upload").toString("base64"),
          mimeType: "text/plain",
          size: 17,
        }],
        format: "auto",
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
    });

    assert.equal(result.count, 1);
    assert.equal(result.items[0].text, "hello from upload");
    assert.deepEqual(result.items[0].metadata, {
      source: {
        filename: "notes.txt",
        mimeType: "text/plain",
        size: 17,
      },
    });
  });

  it("file dataset emits one dataset item per configured file", async () => {
    const handler = createUtilityNodeRegistry().get("file-dataset");
    const result = await handler.execute({
      nodeId: "files",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {} as any,
      node: {
        type: "file-dataset",
        name: "Files",
        files: [
          {
            filename: "first.md",
            content: Buffer.from("# First").toString("base64"),
            mimeType: "text/markdown",
          },
          {
            filename: "second.txt",
            content: Buffer.from("Second").toString("base64"),
            mimeType: "text/plain",
          },
        ],
        format: "auto",
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
    });

    assert.equal(result.count, 2);
    assert.deepEqual(result.items.map((item: any) => item.text), ["# First", "Second"]);
    assert.deepEqual(result.items.map((item: any) => item.id), ["files:0", "files:1"]);
  });

  it("file dataset resolves trigger file expressions before indexing", async () => {
    const handler = createUtilityNodeRegistry().get("file-dataset");
    const csv = [
      "id,nome,categoria_favorita",
      "12,Mateus Fernandes,eletrônicos",
      "20,Victor Hugo,eletrônicos",
    ].join("\n");
    const result = await handler.execute({
      nodeId: "file-dataset_1",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: {
        trigger: {
          file: {
            filename: "clientes.csv",
            content: Buffer.from(csv).toString("base64"),
            mimeType: "text/csv",
            size: Buffer.byteLength(csv),
          },
        },
        steps: {},
        variables: {},
      },
      services: {} as any,
      node: {
        type: "file-dataset",
        name: "Files",
        files: ["{{ trigger.file }}"],
        format: "auto",
        metadata: { source: "{{ trigger.file.filename }}" },
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
    });

    assert.equal(result.count, 2);
    assert.equal(result.items[0].id, "file-dataset_1:0:0");
    assert.match(result.items[0].text, /nome: Mateus Fernandes/);
    assert.notEqual(result.items[0].text, "{{ trigger.file }}");
    assert.deepEqual(result.items[0].metadata, {
      source: {
        filename: "clientes.csv",
        mimeType: "text/csv",
        size: Buffer.byteLength(csv),
        rowIndex: 0,
      },
      data: {
        id: 12,
        nome: "Mateus Fernandes",
        categoria_favorita: "eletrônicos",
      },
      custom: {
        source: "clientes.csv",
      },
    });
  });

  it("file dataset expands trigger file array expressions", async () => {
    const handler = createUtilityNodeRegistry().get("file-dataset");
    const result = await handler.execute({
      nodeId: "files",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: {
        trigger: {
          files: [
            {
              filename: "first.md",
              content: Buffer.from("# First").toString("base64"),
              mimeType: "text/markdown",
            },
            {
              filename: "second.csv",
              content: Buffer.from("id,nome\n1,Ana").toString("base64"),
              mimeType: "text/csv",
            },
          ],
        },
        steps: {},
        variables: {},
      },
      services: {} as any,
      node: {
        type: "file-dataset",
        name: "Files",
        files: ["{{ trigger.files }}"],
        format: "auto",
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
    });

    assert.equal(result.count, 2);
    assert.deepEqual(result.items.map((item: any) => item.text), ["# First", "id: 1\nnome: Ana"]);
    assert.deepEqual(result.items.map((item: any) => item.metadata.source.filename), ["first.md", "second.csv"]);
  });

  it("file dataset parses CSV uploads into one dataset item per row", async () => {
    const handler = createUtilityNodeRegistry().get("file-dataset");
    const csv = [
      "id,nome,categoria_favorita,observacoes",
      "12,Mateus Fernandes,eletrônicos,Pagamento em análise.",
      "20,Victor Hugo,eletrônicos,Possui cupom ativo.",
      '25,Caio Pires,casa,"Campo com vírgula, para testar parser."',
    ].join("\n");

    const result = await handler.execute({
      nodeId: "file-dataset_1",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {} as any,
      node: {
        type: "file-dataset",
        name: "Files",
        files: [{
          filename: "clientes.csv",
          content: Buffer.from(csv).toString("base64"),
          mimeType: "text/csv",
        }],
        format: "auto",
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
    });

    assert.equal(result.count, 3);
    assert.deepEqual(result.items.map((item: any) => item.id), [
      "file-dataset_1:0:0",
      "file-dataset_1:0:1",
      "file-dataset_1:0:2",
    ]);
    assert.equal(result.items[0].metadata.data.categoria_favorita, "eletrônicos");
    assert.equal(result.items[0].metadata.source.rowIndex, 0);
    assert.equal(result.items[2].metadata.data.observacoes, "Campo com vírgula, para testar parser.");
    assert.match(result.items[0].text, /nome: Mateus Fernandes/);
    assert.match(result.items[0].text, /categoria_favorita: eletrônicos/);
    assert.doesNotMatch(result.items[0].text, /Victor Hugo/);
  });

  it("file dataset extracts CSV and JSON files as structured data", async () => {
    const handler = createUtilityNodeRegistry().get("file-dataset");
    const csv = ["id,nome,ativo", "5,Elisa Nunes,true"].join("\n");
    const json = JSON.stringify({
      dataset: "catalogo_cursos_online",
      courses: [{ course_id: "CRS-1001", title: "APIs REST", duration_hours: 12 }],
    });

    const result = await handler.execute({
      nodeId: "file-dataset_1",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {} as any,
      node: {
        type: "file-dataset",
        name: "Files",
        files: [
          { filename: "clientes.csv", content: Buffer.from(csv).toString("base64"), mimeType: "text/csv" },
          { filename: "cursos.json", content: Buffer.from(json).toString("base64"), mimeType: "application/json" },
        ],
        format: "auto",
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
    });

    assert.equal(result.sourceType, "file");
    assert.equal(result.files.length, 2);
    assert.deepEqual(result.files[0], {
      id: "file-dataset_1:0",
      format: "csv",
      source: { filename: "clientes.csv", mimeType: "text/csv" },
      rows: [{ id: 5, nome: "Elisa Nunes", ativo: true }],
      rawText: csv,
    });
    assert.deepEqual(result.files[1], {
      id: "file-dataset_1:1",
      format: "json",
      source: { filename: "cursos.json", mimeType: "application/json" },
      data: {
        dataset: "catalogo_cursos_online",
        courses: [{ course_id: "CRS-1001", title: "APIs REST", duration_hours: 12 }],
      },
      rawText: json,
    });
  });

  it("file dataset coerces CSV metadata values for filtering", async () => {
    const handler = createUtilityNodeRegistry().get("file-dataset");
    const csv = [
      "id,nome,idade,ativo,score,saldo_brl,qtd_pedidos,ticket_medio,categoria_favorita",
      "5,Elisa Nunes,32,true,655,1804.2,31,163.79,alimentos",
    ].join("\n");

    const result = await handler.execute({
      nodeId: "file-dataset_1",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {} as any,
      node: {
        type: "file-dataset",
        name: "Files",
        files: [{
          filename: "clientes.csv",
          content: Buffer.from(csv).toString("base64"),
          mimeType: "text/csv",
        }],
        format: "auto",
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
    });

    assert.deepEqual(result.items[0].metadata.data, {
      id: 5,
      nome: "Elisa Nunes",
      idade: 32,
      ativo: true,
      score: 655,
      saldo_brl: 1804.2,
      qtd_pedidos: 31,
      ticket_medio: 163.79,
      categoria_favorita: "alimentos",
    });
    assert.match(result.items[0].text, /score: 655/);
  });

  it("file dataset keeps explicit markdown uploads as a single document", async () => {
    const handler = createUtilityNodeRegistry().get("file-dataset");
    const markdown = "# Clientes\n\n- Mateus Fernandes: eletrônicos";

    const result = await handler.execute({
      nodeId: "file-dataset_1",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {} as any,
      node: {
        type: "file-dataset",
        name: "Files",
        files: [{
          filename: "clientes.csv",
          content: Buffer.from(markdown).toString("base64"),
          mimeType: "text/csv",
        }],
        format: "markdown",
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
    });

    assert.equal(result.count, 1);
    assert.equal(result.items[0].text, markdown);
  });

  it("document loader loads a specific JSON array path into documents", async () => {
    const registry = createUtilityNodeRegistry();
    const extracted = {
      sourceType: "file",
      items: [],
      count: 0,
      files: [{
        id: "file-dataset_1:0",
        format: "json",
        source: { filename: "cursos.json", mimeType: "application/json" },
        data: {
          dataset: "catalogo_cursos_online",
          version: "1.0",
          courses: [
            { course_id: "CRS-1001", title: "APIs REST", duration_hours: 12, published: true },
            { course_id: "CRS-1002", title: "Machine Learning", duration_hours: 26, published: true },
          ],
        },
        rawText: "",
      }],
    };

    const result = await registry.get("document-loader").execute({
      nodeId: "loader",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {
        resolveConfigDependencies: async () => ({
          getOne: () => ({ load: async () => extracted }),
          getOptional: () => undefined,
          getMany: () => [],
        }),
      } as any,
      node: {
        type: "document-loader",
        name: "Default Data Loader",
        dataType: "json",
        dataMode: "specific",
        dataPath: "courses",
        textTemplate: "course_id: {{ item.course_id }}\ntitle: {{ item.title }}\nduration_hours: {{ item.duration_hours }}",
        includeSourceMetadata: true,
        includeRootFieldsAsContext: true,
        metadataTemplate: {},
      },
    });

    assert.equal(result.count, 2);
    assert.deepEqual(result.items[0], {
      id: "loader:0",
      text: "course_id: CRS-1001\ntitle: APIs REST\nduration_hours: 12",
      metadata: {
        source: { filename: "cursos.json", mimeType: "application/json", jsonPath: "courses[0]" },
        data: { course_id: "CRS-1001", title: "APIs REST", duration_hours: 12, published: true },
        context: { dataset: "catalogo_cursos_online", version: "1.0" },
      },
      raw: { course_id: "CRS-1001", title: "APIs REST", duration_hours: 12, published: true },
    });
  });

  it("document loader keeps a whole JSON file as one document when no path is selected", async () => {
    const registry = createUtilityNodeRegistry();
    const extracted = {
      sourceType: "file",
      items: [],
      count: 0,
      files: [{
        id: "file-dataset_1:0",
        format: "json",
        source: { filename: "catalog.json", mimeType: "application/json" },
        data: {
          dataset: "catalog",
          courses: [{ id: "course-1", title: "Node" }],
          instructors: [{ id: "teacher-1", name: "Marina" }],
        },
        rawText: "",
      }],
    };

    const result = await registry.get("document-loader").execute({
      nodeId: "loader",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {
        resolveConfigDependencies: async () => ({
          getOne: () => ({ load: async () => extracted }),
          getOptional: () => undefined,
          getMany: () => [],
        }),
      } as any,
      node: {
        type: "document-loader",
        name: "Default Data Loader",
        dataType: "json",
        dataMode: "all",
        includeSourceMetadata: true,
        includeRootFieldsAsContext: false,
        metadataTemplate: {},
      },
    });

    assert.equal(result.count, 1);
    assert.equal(result.items[0].metadata.source.filename, "catalog.json");
    assert.deepEqual(result.items[0].metadata.data, extracted.files[0].data);
    assert.match(result.items[0].text, /dataset: catalog/);
    assert.match(result.items[0].text, /courses: \[/);
    assert.match(result.items[0].text, /instructors: \[/);
  });

  it("document loader uses the selected JSON array path when a file has multiple arrays", async () => {
    const registry = createUtilityNodeRegistry();
    const extracted = {
      sourceType: "file",
      items: [],
      count: 0,
      files: [{
        id: "file-dataset_1:0",
        format: "json",
        source: { filename: "catalog.json", mimeType: "application/json" },
        data: {
          dataset: "catalog",
          version: "2026-06",
          courses: [{ id: "course-1", title: "Node" }],
          instructors: [
            { id: "teacher-1", name: "Marina" },
            { id: "teacher-2", name: "Ravi" },
          ],
        },
        rawText: "",
      }],
    };

    const result = await registry.get("document-loader").execute({
      nodeId: "loader",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {
        resolveConfigDependencies: async () => ({
          getOne: () => ({ load: async () => extracted }),
          getOptional: () => undefined,
          getMany: () => [],
        }),
      } as any,
      node: {
        type: "document-loader",
        name: "Default Data Loader",
        dataType: "json",
        dataMode: "specific",
        dataPath: "instructors",
        textTemplate: "id: {{ item.id }}\nname: {{ item.name }}",
        includeSourceMetadata: true,
        includeRootFieldsAsContext: true,
        metadataTemplate: {},
      },
    });

    assert.equal(result.count, 2);
    assert.deepEqual(result.items.map((item: any) => item.metadata.source.jsonPath), ["instructors[0]", "instructors[1]"]);
    assert.deepEqual(result.items[0].metadata.context, { dataset: "catalog", version: "2026-06" });
    assert.deepEqual(result.items.map((item: any) => item.metadata.data.id), ["teacher-1", "teacher-2"]);
    assert.doesNotMatch(result.items[0].text, /course-1/);
  });

  it("document loader requires a valid JSON path when loading specific data", async () => {
    const registry = createUtilityNodeRegistry();
    const extracted = {
      sourceType: "file",
      items: [],
      count: 0,
      files: [{
        id: "file-dataset_1:0",
        format: "json",
        source: { filename: "catalog.json", mimeType: "application/json" },
        data: { courses: [{ id: "course-1" }], instructors: [{ id: "teacher-1" }] },
        rawText: "",
      }],
    };

    await assert.rejects(() => registry.get("document-loader").execute({
      nodeId: "loader",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {
        resolveConfigDependencies: async () => ({
          getOne: () => ({ load: async () => extracted }),
          getOptional: () => undefined,
          getMany: () => [],
        }),
      } as any,
      node: {
        type: "document-loader",
        name: "Default Data Loader",
        dataType: "json",
        dataMode: "specific",
        dataPath: "lessons",
        includeSourceMetadata: true,
        includeRootFieldsAsContext: false,
        metadataTemplate: {},
      },
    }), /JSON path "lessons" was not found/);
  });

  it("document loader loads text and markdown files as one document per file", async () => {
    const registry = createUtilityNodeRegistry();
    const extracted = {
      sourceType: "file",
      items: [],
      count: 0,
      files: [
        {
          id: "file-dataset_1:0",
          format: "txt",
          source: { filename: "notes.txt", mimeType: "text/plain" },
          data: "plain notes",
          rawText: "plain notes",
        },
        {
          id: "file-dataset_1:1",
          format: "markdown",
          source: { filename: "readme.md", mimeType: "text/markdown" },
          data: "# Sailor\n\nMarkdown notes",
          rawText: "# Sailor\n\nMarkdown notes",
        },
      ],
    };

    const result = await registry.get("document-loader").execute({
      nodeId: "loader",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {
        resolveConfigDependencies: async () => ({
          getOne: () => ({ load: async () => extracted }),
          getOptional: () => undefined,
          getMany: () => [],
        }),
      } as any,
      node: {
        type: "document-loader",
        name: "Default Data Loader",
        dataType: "file",
        dataMode: "all",
        includeSourceMetadata: true,
        includeRootFieldsAsContext: false,
        metadataTemplate: {},
      },
    });

    assert.equal(result.count, 2);
    assert.deepEqual(result.items.map((item: any) => item.text), ["plain notes", "# Sailor\n\nMarkdown notes"]);
    assert.deepEqual(result.items.map((item: any) => item.metadata.source.filename), ["notes.txt", "readme.md"]);
  });

  it("document loader applies custom metadata templates and can omit source metadata", async () => {
    const registry = createUtilityNodeRegistry();
    const extracted = {
      sourceType: "file",
      items: [],
      count: 0,
      files: [{
        id: "file-dataset_1:0",
        format: "json",
        source: { filename: "catalog.json", mimeType: "application/json" },
        data: {
          courses: [{ id: "course-1", category: "moda", score: 655 }],
        },
        rawText: "",
      }],
    };

    const result = await registry.get("document-loader").execute({
      nodeId: "loader",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {
        resolveConfigDependencies: async () => ({
          getOne: () => ({ load: async () => extracted }),
          getOptional: () => undefined,
          getMany: () => [],
        }),
      } as any,
      node: {
        type: "document-loader",
        name: "Default Data Loader",
        dataType: "json",
        dataMode: "specific",
        dataPath: "courses",
        includeSourceMetadata: false,
        includeRootFieldsAsContext: false,
        metadataTemplate: {
          category: "{{ item.category }}",
          score: "{{ item.score }}",
          staticLabel: "course",
        },
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
    });

    assert.equal(result.count, 1);
    assert.deepEqual(result.items[0].metadata, {
      data: { id: "course-1", category: "moda", score: 655 },
      custom: { category: "moda", score: "655", staticLabel: "course" },
    });
  });

  it("document loader transforms generic dataset items when the data source has no files", async () => {
    const registry = createUtilityNodeRegistry();
    const extracted = {
      sourceType: "text",
      count: 1,
      items: [{
        id: "text-dataset_1:0",
        text: "Sailor document loaders transform items.",
        metadata: { source: "manual", topic: "docs" },
        raw: { body: "Sailor document loaders transform items.", topic: "docs" },
      }],
    };

    const result = await registry.get("document-loader").execute({
      nodeId: "loader",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {
        resolveConfigDependencies: async () => ({
          getOne: () => ({ load: async () => extracted }),
          getOptional: () => undefined,
          getMany: () => [],
        }),
      } as any,
      node: {
        type: "document-loader",
        name: "Default Data Loader",
        dataType: "text",
        dataMode: "all",
        includeSourceMetadata: true,
        includeRootFieldsAsContext: false,
        metadataTemplate: { topic: "{{ item.topic }}" },
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
    });

    assert.equal(result.count, 1);
    assert.equal(result.items[0].text, "Sailor document loaders transform items.");
    assert.deepEqual(result.items[0].metadata, {
      source: { source: "manual", topic: "docs" },
      data: { body: "Sailor document loaders transform items.", topic: "docs" },
      custom: { topic: "docs" },
    });
  });

  it("document loader chunks text documents when chunking is enabled", async () => {
    const registry = createUtilityNodeRegistry();
    const extracted = {
      sourceType: "file",
      items: [],
      count: 0,
      files: [{
        id: "file-dataset_1:0",
        format: "markdown",
        source: { filename: "guide.md", mimeType: "text/markdown" },
        data: "abcdefghi",
        rawText: "abcdefghi",
      }],
    };

    const result = await registry.get("document-loader").execute({
      nodeId: "loader",
      executionId: "exec-1",
      workflow: workflowFixture(),
      edges: [],
      context: { trigger: {}, steps: {}, variables: {} },
      services: {
        resolveConfigDependencies: async () => ({
          getOne: () => ({ load: async () => extracted }),
          getOptional: () => undefined,
          getMany: () => [],
        }),
      } as any,
      node: {
        type: "document-loader",
        name: "Default Data Loader",
        dataType: "file",
        dataMode: "all",
        includeSourceMetadata: true,
        includeRootFieldsAsContext: false,
        metadataTemplate: {},
        chunking: {
          enabled: true,
          chunkSize: 4,
          chunkOverlap: 1,
          contextualOverlapEnabled: false,
        },
      },
    });

    assert.deepEqual(result.items.map((item: any) => item.text), ["abcd", "defg", "ghi"]);
    assert.deepEqual(result.items.map((item: any) => item.id), ["loader:0:0", "loader:0:1", "loader:0:2"]);
    assert.deepEqual(result.items[1].metadata.chunk, { index: 1, start: 3, end: 7 });
    assert.equal(result.items[1].metadata.source.filename, "guide.md");
  });

  it("vector store indexes connected dataset documents with connected embedding config", async () => {
    const calls: Array<{ pluginId: string; methodId: string; params: Record<string, any> }> = [];
    const workflow = workflowFixture();
    workflow.nodes = {
      dataset: {
        type: "text-dataset",
        name: "Dataset",
        text: "hello",
        format: "plain-text",
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
      embeddings: {
        type: "embeddings",
        name: "Embeddings",
        pluginId: "embedding-provider",
        methodId: "createEmbeddings",
        model: "embedding-model",
        dimension: 3,
        input: "",
      },
      vector: {
        type: "vector-store",
        name: "Vector",
        pluginId: "vector-provider",
        ensureCollectionMethodId: "ensureCollection",
        upsertMethodId: "upsertDocuments",
        queryMethodId: "querySimilar",
        collectionName: "documents",
        dimension: 3,
        metric: "cosine",
        config: {},
      },
    };
    workflow.edges = [
      { id: "dataset-vector", source: "dataset", target: "vector", targetHandle: "document" },
      { id: "embedding-vector", source: "embeddings", target: "vector", targetHandle: "embedding" },
    ];

    const result = await createUtilityNodeRegistry().get("vector-store").execute({
      nodeId: "vector",
      executionId: "exec-1",
      workflow,
      edges: workflow.edges,
      context: {
        trigger: {},
        variables: {},
        steps: {
          dataset: {
            output: {
              items: [{ id: "doc-1", text: "hello", metadata: { source: "test" } }],
              count: 1,
              sourceType: "text",
            },
          },
        },
      },
      services: {
        executePluginMethod: async (
          pluginId: string,
          methodId: string,
          params: Record<string, any>,
        ) => {
          calls.push({ pluginId, methodId, params });
          if (pluginId === "embedding-provider") return { vectors: [[0.1, 0.2, 0.3]] };
          if (methodId === "upsertDocuments") return { upsertedCount: 1 };
          return { ok: true };
        },
      } as any,
      node: workflow.nodes.vector,
    });

    assert.deepEqual(calls.map((call) => `${call.pluginId}:${call.methodId}`), [
      "vector-provider:ensureCollection",
      "embedding-provider:createEmbeddings",
      "vector-provider:upsertDocuments",
    ]);
    const upsertedDocument = calls[2]?.params.documents[0] as Record<string, any>;
    assert.equal(upsertedDocument.text, "hello");
    assert.deepEqual(upsertedDocument.vector, [0.1, 0.2, 0.3]);
    assert.equal(result.indexedCount, 1);
  });

  it("vector store indexes documents loaded through a document loader", async () => {
    const calls: Array<{ pluginId: string; methodId: string; params: Record<string, any> }> = [];
    const workflow = workflowFixture();
    const csv = ["id,nome,score", "5,Elisa Nunes,655"].join("\n");
    workflow.nodes = {
      file: {
        type: "file-dataset",
        name: "Extract From File",
        files: [{ filename: "clientes.csv", content: Buffer.from(csv).toString("base64"), mimeType: "text/csv" }],
        format: "auto",
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
      loader: {
        type: "document-loader",
        name: "Default Data Loader",
        dataType: "file",
        dataMode: "all",
        includeSourceMetadata: true,
        includeRootFieldsAsContext: false,
        chunking: {
          enabled: false,
          chunkSize: 1000,
          chunkOverlap: 0,
          contextualOverlapEnabled: false,
        },
      },
      embeddings: {
        type: "embeddings",
        name: "Embeddings",
        pluginId: "embedding-provider",
        methodId: "createEmbeddings",
        model: "embedding-model",
        dimension: 3,
        input: "",
      },
      vector: {
        type: "vector-store",
        name: "Vector",
        pluginId: "vector-provider",
        ensureCollectionMethodId: "ensureCollection",
        upsertMethodId: "upsertDocuments",
        queryMethodId: "querySimilar",
        collectionName: "documents",
        dimension: 3,
        metric: "cosine",
        config: {},
        retrievalMode: "index",
      },
    };
    workflow.edges = [
      { id: "file-loader", source: "file", target: "loader", targetHandle: "data" },
      { id: "loader-vector", source: "loader", target: "vector", targetHandle: "document" },
      { id: "embedding-vector", source: "embeddings", target: "vector", targetHandle: "embedding" },
    ];

    const result = await createUtilityNodeRegistry().get("vector-store").execute({
      nodeId: "vector",
      executionId: "exec-1",
      workflow,
      edges: workflow.edges,
      context: { trigger: {}, variables: {}, steps: {} },
      services: {
        executeNode: async ({ nodeId, node, context, workflow, edges, executionId }: any) =>
          createUtilityNodeRegistry().get(node.type).execute({
            nodeId,
            node,
            context,
            workflow,
            edges,
            executionId,
            services: {
              executeNode: async (nested: any) => createUtilityNodeRegistry().get(nested.node.type).execute({ ...nested, services: {} as any }),
            } as any,
          }),
        executePluginMethod: async (pluginId: string, methodId: string, params: Record<string, any>) => {
          calls.push({ pluginId, methodId, params });
          if (pluginId === "embedding-provider") return { vectors: [[0.1, 0.2, 0.3]] };
          if (methodId === "upsertDocuments") return { upsertedCount: 1 };
          return { ok: true };
        },
      } as any,
      node: workflow.nodes.vector,
    });

    const upsertedDocument = calls.find((call) => call.methodId === "upsertDocuments")?.params.documents[0];
    assert.equal(result.indexedCount, 1);
    assert.equal(upsertedDocument.text, "id: 5\nnome: Elisa Nunes\nscore: 655");
    assert.deepEqual(upsertedDocument.metadata.data, { id: 5, nome: "Elisa Nunes", score: 655 });
  });

  it("vector store queries similar documents and returns agent-ready context", async () => {
    const calls: string[] = [];
    const workflow = workflowFixture();
    workflow.nodes = {
      embeddings: {
        type: "embeddings",
        name: "Embeddings",
        pluginId: "embedding-provider",
        methodId: "createEmbeddings",
        model: "embedding-model",
        dimension: 3,
        input: "",
      },
      vector: {
        type: "vector-store",
        name: "Vector",
        pluginId: "vector-provider",
        ensureCollectionMethodId: "ensureCollection",
        upsertMethodId: "upsertDocuments",
        queryMethodId: "querySimilar",
        collectionName: "documents",
        dimension: 3,
        metric: "cosine",
        config: {},
        retrievalMode: "query",
        query: "What is Sailor?",
        topK: 3,
        outputMode: "context",
        maxContextChars: 100,
        filter: {},
      },
    };
    workflow.edges = [
      { id: "embedding-vector", source: "embeddings", target: "vector", targetHandle: "embedding" },
    ];

    const result = await createUtilityNodeRegistry().get("vector-store").execute({
      nodeId: "vector",
      executionId: "exec-1",
      workflow,
      edges: workflow.edges,
      context: { trigger: {}, variables: {}, steps: {} },
      services: {
        executePluginMethod: async (pluginId: string, methodId: string) => {
          calls.push(`${pluginId}:${methodId}`);
          if (pluginId === "embedding-provider") return { vectors: [[0.1, 0.2, 0.3]] };
          if (methodId === "querySimilar") {
            return [{ id: "doc-1", text: "Sailor builds workflows.", score: 0.9, metadata: {} }];
          }
          return { ok: true };
        },
      } as any,
      node: workflow.nodes.vector,
    });

    assert.deepEqual(calls, [
      "embedding-provider:createEmbeddings",
      "vector-provider:ensureCollection",
      "vector-provider:querySimilar",
    ]);
    assert.equal(result.context, "Sailor builds workflows.");
  });
});

function workflowFixture(): WorkflowItem {
  return {
    metadata: {
      id: "wf-1",
      name: "Workflow",
      version: "1.0.0",
      isActive: false,
      isDraft: true,
      public: false,
      createdAt: "2026-06-10T00:00:00.000Z",
    },
    trigger: { type: "manual" as const },
    nodes: {},
    edges: [],
  };
}
