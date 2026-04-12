import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import type { WorkflowItem, WorkflowNode } from "../../shared/models/workflow-types.ts";
import { WorkflowRepository } from "../modules/workflows/repository.ts";
import { WorkflowEngine, sanitizeContextForLogging } from "../modules/workflows/executor.ts";
import { PluginManager } from "../modules/plugins/manager.ts";

// ──────────── Allowed node types ────────────
const VALID_NODE_TYPES = new Set([
  "plugin",
  "code",
  "if",
  "loop",
  "subworkflow",
  "trigger",
]);

// ──────────── Validation helper ────────────

function validateWorkflowDefinition(
  workflow: WorkflowItem,
): string | null {
  if (!workflow.metadata?.id || !workflow.metadata?.name) {
    return "Workflow must have metadata with id and name";
  }

  if (!workflow.trigger?.type) {
    return "Workflow must have a trigger with type";
  }

  if (!workflow.nodes || typeof workflow.nodes !== "object") {
    return "Workflow must have a nodes map";
  }

  if (!Array.isArray(workflow.edges)) {
    return "Workflow must have an edges array";
  }

  // Validate each node has a recognized type
  for (const [nodeId, node] of Object.entries(workflow.nodes)) {
    if (!node.type || !VALID_NODE_TYPES.has(node.type)) {
      return `Node "${nodeId}" has invalid type: "${(node as any).type}". Valid types: ${[...VALID_NODE_TYPES].join(", ")}`;
    }

    // Type-specific validation
    switch (node.type) {
      case "plugin":
        if (!node.pluginId || !node.action) {
          return `Plugin node "${nodeId}" must have pluginId and action`;
        }
        break;
      case "code":
        if (!node.script || typeof node.script !== "string") {
          return `Code node "${nodeId}" must have a script string`;
        }
        break;
      case "if":
        if (!node.condition || typeof node.condition !== "string") {
          return `If node "${nodeId}" must have a condition string`;
        }
        break;
      case "loop":
        if (!node.collection || typeof node.collection !== "string") {
          return `Loop node "${nodeId}" must have a collection expression`;
        }
        break;
      case "subworkflow":
        if (!node.workflowId) {
          return `SubWorkflow node "${nodeId}" must have a workflowId`;
        }
        break;
    }
  }

  // Validate edges reference existing nodes
  const validNodeIds = new Set(["trigger", ...Object.keys(workflow.nodes)]);
  for (const edge of workflow.edges) {
    if (!validNodeIds.has(edge.source)) {
      return `Edge "${edge.id}" references unknown source node "${edge.source}"`;
    }
    if (!validNodeIds.has(edge.target)) {
      return `Edge "${edge.id}" references unknown target node "${edge.target}"`;
    }
  }

  return null; // Valid
}

export default async function workflowsRoutes(fastify: FastifyInstance) {
  const sendResponse = <T>(reply: FastifyReply, response: ApiResponse<T>) => {
    return reply.code(response.status_code).send(response);
  };

  /**
   * Get all workflows
   */
  fastify.get("/workflows", async (req, reply) => {
    try {
      const workflows = WorkflowRepository.getWorkflows();
      return sendResponse(reply, {
        status_code: 200,
        message: "Workflows fetched successfully",
        error: null,
        data: workflows,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch workflows",
        error: error.message,
        data: null,
      });
    }
  });

  /**
   * Save or Update a workflow (with validation)
   */
  fastify.post("/workflows", async (req, reply) => {
    try {
      const workflow = req.body as WorkflowItem;

      // Default isDraft if not provided
      if (workflow.metadata.isDraft === undefined) {
        workflow.metadata.isDraft = false;
      }

      const validationError = validateWorkflowDefinition(workflow);
      if (validationError) {
        return sendResponse(reply, {
          status_code: 400,
          message: `Invalid workflow: ${validationError}`,
          error: validationError,
          data: null,
        });
      }

      WorkflowRepository.saveWorkflow(workflow);
      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow saved successfully",
        error: null,
        data: workflow,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to save workflow",
        error: error.message,
        data: null,
      });
    }
  });

  /**
   * Execute a workflow manually
   */
  fastify.post("/workflows/:workflowId/execute", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };

    try {
      const workflow = WorkflowRepository.getWorkflowById(workflowId);
      if (!workflow) {
        return sendResponse(reply, {
          status_code: 404,
          message: "Workflow not found",
          error: "Not Found",
          data: null,
        });
      }

      let triggerPayload: Record<string, any> = {};

      if (req.isMultipart()) {
        const parts = req.parts();
        for await (const part of parts) {
          if (part.type === "file") {
            triggerPayload[part.fieldname] = await part.toBuffer();
          } else {
            try {
              triggerPayload[part.fieldname] = JSON.parse(part.value as string);
            } catch {
              triggerPayload[part.fieldname] = part.value;
            }
          }
        }
      } else {
        triggerPayload = (req.body as Record<string, any>) || {};
      }

      // Execute Workflow DAG natively
      const result = await WorkflowEngine.executeWorkflow(
        workflow,
        triggerPayload,
      );

      if (result.status === "FAILED") {
        return sendResponse(reply, {
          status_code: 400,
          message: "Workflow execution failed",
          error: result.context.steps["error"] || "Unknown execution error",
          data: {
            ...result,
            context: sanitizeContextForLogging(result.context)
          },
        });
      }

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow executed successfully",
        error: null,
        data: {
          ...result,
          context: sanitizeContextForLogging(result.context)
        },
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: `Workflow Execution failed: ${error.message}`,
        error: error.message,
        data: null,
      });
    }
  });

  /**
   * Get workflow executions
   */
  fastify.get("/workflows/:workflowId/executions", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      const executions = WorkflowRepository.getWorkflowExecutions(workflowId);
      return sendResponse(reply, {
        status_code: 200,
        message: "Executions fetched successfully",
        error: null,
        data: executions,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch executions",
        error: error.message,
        data: null,
      });
    }
  });

  /**
   * Get workflow schema — describes the full structure for the frontend editor
   */
  fastify.get("/workflows/:workflowId/schema", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };

    try {
      const workflow = WorkflowRepository.getWorkflowById(workflowId);
      if (!workflow) {
        return sendResponse(reply, {
          status_code: 404,
          message: "Workflow not found",
          error: "Not Found",
          data: null,
        });
      }

      // Build a schema representation of the workflow
      const nodeSchemas: Record<string, any> = {};
      for (const [nodeId, node] of Object.entries(workflow.nodes)) {
        const baseSchema: any = {
          type: node.type,
          name: node.name,
        };

        switch (node.type) {
          case "plugin": {
            // Enrich with plugin manifest if available
            try {
              const plugin = PluginManager.getPlugin(node.pluginId);
              const methodManifest = plugin.manifest.methods[node.action];
              baseSchema.pluginId = node.pluginId;
              baseSchema.action = node.action;
              baseSchema.pluginName = plugin.manifest.metadata.name;
              baseSchema.pluginIcon = plugin.manifest.metadata.icon;
              baseSchema.parameters = methodManifest?.parameters ?? {};
              baseSchema.responseSchema = methodManifest?.responseSchema ?? null;
            } catch {
              baseSchema.pluginId = node.pluginId;
              baseSchema.action = node.action;
              baseSchema.parameters = {};
            }
            break;
          }
          case "code":
            baseSchema.language = node.language;
            break;
          case "if":
            baseSchema.condition = node.condition;
            baseSchema.handles = ["then", "else"];
            break;
          case "loop":
            baseSchema.collection = node.collection;
            baseSchema.maxIterations = node.maxIterations;
            baseSchema.handles = ["loop-body", "loop-done"];
            break;
          case "subworkflow":
            baseSchema.workflowId = node.workflowId;
            baseSchema.inputMapping = node.inputMapping;
            break;
        }

        nodeSchemas[nodeId] = baseSchema;
      }

      const schema = {
        workflowId: workflow.metadata.id,
        name: workflow.metadata.name,
        version: workflow.metadata.version,
        isDraft: workflow.metadata.isDraft,
        trigger: workflow.trigger,
        nodes: nodeSchemas,
        edges: workflow.edges,
        variables: workflow.variables || [],
        availableNodeTypes: [...VALID_NODE_TYPES],
      };

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow schema retrieved",
        error: null,
        data: schema,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to fetch workflow schema",
        error: error.message,
        data: null,
      });
    }
  });

  /**
   * Update a workflow (with validation)
   */
  fastify.put("/workflows/:workflowId", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      const workflow = req.body as WorkflowItem;
      // Guarantee the ID matches the route params
      workflow.metadata.id = workflowId;
      workflow.metadata.updatedAt = new Date().toISOString();

      // Default isDraft if not provided
      if (workflow.metadata.isDraft === undefined) {
        workflow.metadata.isDraft = false;
      }

      const validationError = validateWorkflowDefinition(workflow);
      if (validationError) {
        return sendResponse(reply, {
          status_code: 400,
          message: `Invalid workflow: ${validationError}`,
          error: validationError,
          data: null,
        });
      }

      WorkflowRepository.saveWorkflow(workflow);

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow updated successfully",
        error: null,
        data: workflow,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to update workflow",
        error: error.message,
        data: null,
      });
    }
  });

  /**
   * Publish a draft workflow
   */
  fastify.post("/workflows/:workflowId/publish", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      const workflow = WorkflowRepository.publishDraft(workflowId);
      if (!workflow) {
        return sendResponse(reply, {
          status_code: 404,
          message: "Workflow not found",
          error: "Not Found",
          data: null,
        });
      }

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow published successfully",
        error: null,
        data: workflow,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to publish workflow",
        error: error.message,
        data: null,
      });
    }
  });

  /**
   * Delete a workflow and its execution logs
   */
  fastify.delete("/workflows/:workflowId", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      // Cascading deletion to keep DB clean
      WorkflowRepository.deleteWorkflowExecutions(workflowId);
      WorkflowRepository.deleteWorkflow(workflowId);

      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow deleted successfully",
        error: null,
        data: null,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to delete workflow",
        error: error.message,
        data: null,
      });
    }
  });

  /**
   * Delete only workflow executions (Keep the workflow, clear the history)
   */
  fastify.delete("/workflows/:workflowId/executions", async (req, reply) => {
    const { workflowId } = req.params as { workflowId: string };
    try {
      WorkflowRepository.deleteWorkflowExecutions(workflowId);
      return sendResponse(reply, {
        status_code: 200,
        message: "Workflow execution history cleared successfully",
        error: null,
        data: null,
      });
    } catch (error: any) {
      return sendResponse(reply, {
        status_code: 500,
        message: "Failed to clear execution logs",
        error: error.message,
        data: null,
      });
    }
  });
}
