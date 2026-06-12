import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApiResponse } from "../../../shared/models/api-response.model.ts";
import {
  escapeHtml,
  renderFormConfirmationPage,
  renderFormPage,
} from "./form-renderer.ts";
import {
  formDefinition,
  formPublicId,
  resolveFormWorkflowTrigger,
} from "./form-service.ts";
import { processFormSubmission } from "./form-submission.ts";
import {
  getTemporaryFormSession,
  submitTemporaryFormSession,
} from "./temporary-form-session.ts";
import type { FormMode } from "./form-types.ts";

type SendResponse = <T>(
  reply: FastifyReply,
  response: ApiResponse<T>,
) => unknown;

interface RegisterFormRoutesDeps {
  clientOrigin: string;
  sendResponse: SendResponse;
  profileScopeRunner?: {
    runWithProfile<T>(profileId: string, callback: () => T): T;
  };
}

export function registerFormRoutes(
  fastify: FastifyInstance,
  deps: RegisterFormRoutesDeps,
) {
  fastify.get("/p/:profileId/forms/:formId", async (req, reply) => {
    const { profileId, formId } = req.params as {
      profileId: string;
      formId: string;
    };
    if (!deps.profileScopeRunner) {
      return renderMissingFormPage(reply, "Form not available", "Profile routing is not configured.");
    }

    try {
      return await deps.profileScopeRunner.runWithProfile(profileId, () => {
        const resolved = resolveFormWorkflowTrigger(formId, { requireActive: false });
        if (!resolved) {
          return renderMissingFormPage(reply, "Form not available", "This form does not exist.");
        }
        return reply.redirect(
          `${deps.clientOrigin}/p/${encodeURIComponent(profileId)}/forms/${encodeURIComponent(formPublicId(resolved.workflow, resolved.triggerNodeId))}`,
        );
      });
    } catch (error: any) {
      if (error instanceof Error && /Profile '.+' not found/.test(error.message)) {
        return renderMissingFormPage(reply, "Profile not found", "This profile does not exist.");
      }
      throw error;
    }
  });

  fastify.get("/p/:profileId/forms-api/:formId", async (req, reply) => {
    const { profileId, formId } = req.params as {
      profileId: string;
      formId: string;
    };
    if (!deps.profileScopeRunner) {
      return deps.sendResponse(reply, {
        status_code: 500,
        message: "Profile routing is not configured",
        error: "Profile routing is not configured",
        data: null,
      });
    }

    try {
      return await deps.profileScopeRunner.runWithProfile(profileId, () => {
        const formMode = resolveFormMode((req.query as { mode?: string }).mode);
        const resolved = resolveFormWorkflowTrigger(formId, {
          requireActive: false,
        });

        if (!resolved) {
          return deps.sendResponse(reply, {
            status_code: 404,
            message: "Form not found or unavailable",
            error: "Not Found",
            data: null,
          });
        }

        return deps.sendResponse(reply, {
          status_code: 200,
          message: "Form definition fetched",
          error: null,
          data: formDefinition(resolved.workflow, formMode, resolved.triggerNodeId),
        });
      });
    } catch (error: any) {
      if (error instanceof Error && /Profile '.+' not found/.test(error.message)) {
        return deps.sendResponse(reply, {
          status_code: 404,
          message: "Profile not found",
          error: "Not Found",
          data: null,
        });
      }
      throw error;
    }
  });

  fastify.post("/p/:profileId/forms-api/:formId/submit", async (req, reply) => {
    const { profileId, formId } = req.params as {
      profileId: string;
      formId: string;
    };
    if (!deps.profileScopeRunner) {
      return deps.sendResponse(reply, {
        status_code: 500,
        message: "Profile routing is not configured",
        error: "Profile routing is not configured",
        data: null,
      });
    }

    try {
      return await deps.profileScopeRunner.runWithProfile(profileId, async () => {
        const formMode = resolveFormMode((req.query as { mode?: string }).mode);
        const result = await processFormSubmission(
          formId,
          { requireActive: false, mode: formMode, awaitExecution: true },
          req,
        );

        if (!result.ok) {
          return deps.sendResponse(reply, {
            status_code: result.statusCode,
            message: result.message,
            error: result.message,
            data: null,
          });
        }

        return deps.sendResponse(reply, {
          status_code: 202,
          message: "Form submitted and workflow execution started",
          error: null,
          data: { executionId: result.executionId },
        });
      });
    } catch (error: any) {
      if (error instanceof Error && /Profile '.+' not found/.test(error.message)) {
        return deps.sendResponse(reply, {
          status_code: 404,
          message: "Profile not found",
          error: "Not Found",
          data: null,
        });
      }
      throw error;
    }
  });

  fastify.get("/forms-test/:formId", async (req, reply) => {
    const { formId } = req.params as { formId: string };
    const resolved = resolveFormWorkflowTrigger(formId, { requireActive: false });

    if (!resolved) {
      return renderMissingFormPage(
        reply,
        "Form not available",
        "This draft form does not exist.",
      );
    }

    return reply.redirect(
      `${deps.clientOrigin}/forms-test/${encodeURIComponent(formPublicId(resolved.workflow, resolved.triggerNodeId))}`,
    );
  });

  fastify.get("/forms/:formId", async (req, reply) => {
    const { formId } = req.params as { formId: string };
    // requireActive: false — allows draft/unpublished workflows to be accessed via the
    // PROD URL, consistent with how webhook PROD URLs work (no publish requirement).
    const resolved = resolveFormWorkflowTrigger(formId, { requireActive: false });

    if (!resolved) {
      return renderMissingFormPage(
        reply,
        "Form not available",
        "This form does not exist.",
      );
    }

    return reply.redirect(
      `${deps.clientOrigin}/forms/${encodeURIComponent(formPublicId(resolved.workflow, resolved.triggerNodeId))}`,
    );
  });

  fastify.get("/forms-api/:formId", async (req, reply) => {
    const { formId } = req.params as { formId: string };
    const formMode = resolveFormMode((req.query as { mode?: string }).mode);
    const resolved = resolveFormWorkflowTrigger(formId, {
      // requireActive: false — consistent with webhook PROD (no publish requirement)
      requireActive: false,
    });

    if (!resolved) {
      return deps.sendResponse(reply, {
        status_code: 404,
        message: "Form not found or unavailable",
        error: "Not Found",
        data: null,
      });
    }

    return deps.sendResponse(reply, {
      status_code: 200,
      message: "Form definition fetched",
      error: null,
      data: formDefinition(resolved.workflow, formMode, resolved.triggerNodeId),
    });
  });

  fastify.post("/forms-api/:formId/submit", async (req, reply) => {
    const { formId } = req.params as { formId: string };
    const formMode = resolveFormMode((req.query as { mode?: string }).mode);
    const result = await processFormSubmission(
      formId,
      { requireActive: false, mode: formMode },
      req,
    );

    if (!result.ok) {
      return deps.sendResponse(reply, {
        status_code: result.statusCode,
        message: result.message,
        error: result.message,
        data: null,
      });
    }

    return deps.sendResponse(reply, {
      status_code: 202,
      message: "Form submitted and workflow execution started",
      error: null,
      data: { executionId: result.executionId },
    });
  });

  fastify.post("/forms-test/:formId/submit", async (req, reply) => {
    const { formId } = req.params as { formId: string };
    return handleFormSubmission(
      formId,
      { requireActive: false, mode: "test" },
      req,
      reply,
    );
  });

  fastify.post("/forms/:formId/submit", async (req, reply) => {
    const { formId } = req.params as { formId: string };
    return handleFormSubmission(
      formId,
      // requireActive: false — consistent with webhook PROD (no publish requirement)
      { requireActive: false, mode: "prod" },
      req,
      reply,
    );
  });

  fastify.get("/temporary-forms/:formId", async (req, reply) => {
    const { formId } = req.params as { formId: string };
    const session = getTemporaryFormSession(formId);

    if (!session) {
      return renderMissingFormPage(
        reply,
        "Form not available",
        "This temporary form does not exist or has expired.",
      );
    }

    return reply.redirect(
      `${deps.clientOrigin}/temporary-forms/${encodeURIComponent(session.id)}`,
    );
  });

  fastify.get("/temporary-forms-api/:formId", async (req, reply) => {
    const { formId } = req.params as { formId: string };
    const session = getTemporaryFormSession(formId);

    if (!session) {
      return deps.sendResponse(reply, {
        status_code: 404,
        message: "Temporary form not found or expired",
        error: "Not Found",
        data: null,
      });
    }

    return deps.sendResponse(reply, {
      status_code: 200,
      message: "Temporary form definition fetched",
      error: null,
      data: {
        id: session.id,
        workflowId: session.workflowId,
        mode: "temp",
        title: session.title,
        description: session.description ?? "",
        fields: session.fields,
        theme: session.theme ?? {},
        expiresAt: session.expiresAt,
      },
    });
  });

  fastify.post("/temporary-forms/:formId/submit", async (req, reply) => {
    const { formId } = req.params as { formId: string };
    const session = getTemporaryFormSession(formId);
    if (!session) {
      return renderMissingFormPage(
        reply,
        "Form not available",
        "This temporary form does not exist or has expired.",
      );
    }

    const fields = ((req.body as Record<string, unknown>) ?? {});
    const submitted = submitTemporaryFormSession(formId, fields);
    if (!submitted) {
      return renderMissingFormPage(
        reply,
        "Form not available",
        "This temporary form does not exist or has expired.",
      );
    }

    return reply
      .code(200)
      .type("text/html; charset=utf-8")
      .send(renderFormConfirmationPage({
        metadata: {
          id: session.id,
          name: session.title,
          version: "temporary",
          isActive: true,
          isDraft: false,
          public: true,
          createdAt: new Date(session.createdAt).toISOString(),
        },
        trigger: { type: "form", formTitle: session.title },
        nodes: {},
        edges: [],
      }));
  });

  fastify.post("/temporary-forms-api/:formId/submit", async (req, reply) => {
    const { formId } = req.params as { formId: string };
    const session = getTemporaryFormSession(formId);
    if (!session) {
      return deps.sendResponse(reply, {
        status_code: 404,
        message: "Temporary form not found or expired",
        error: "Not Found",
        data: null,
      });
    }

    const fields = ((req.body as Record<string, unknown>) ?? {});
    const submitted = submitTemporaryFormSession(formId, fields);
    if (!submitted) {
      return deps.sendResponse(reply, {
        status_code: 404,
        message: "Temporary form not found or expired",
        error: "Not Found",
        data: null,
      });
    }

    return deps.sendResponse(reply, {
      status_code: 200,
      message: "Temporary form submitted",
      error: null,
      data: { submitted: true },
    });
  });
}

function resolveFormMode(mode: string | undefined): FormMode {
  return mode === "prod" ? "prod" : "test";
}

function renderMissingFormPage(
  reply: FastifyReply,
  title: string,
  message: string,
) {
  return reply
    .code(404)
    .type("text/html; charset=utf-8")
    .send(
      `<!DOCTYPE html><html><body style="font-family: sans-serif; padding: 40px; background:#0b0d12; color:#e7e9ee;">
        <h1>${escapeHtml(title)}</h1>
        <p>${escapeHtml(message)}</p>
      </body></html>`,
    );
}

async function handleFormSubmission(
  formId: string,
  opts: { requireActive: boolean; mode: FormMode },
  req: any,
  reply: FastifyReply,
) {
  const result = await processFormSubmission(formId, opts, req);

  if (!result.ok) {
    if (!result.workflow || !result.fields) {
      return reply
        .code(result.statusCode)
        .type("text/html; charset=utf-8")
        .send(
          `<!DOCTYPE html><html><body><h1>${escapeHtml(result.message)}</h1></body></html>`,
        );
    }

    return reply
      .code(result.statusCode)
      .type("text/html; charset=utf-8")
      .send(
        renderFormPage(result.workflow, result.fields, {
          error: result.message,
          mode: opts.mode,
        }),
      );
  }

  return reply
    .code(200)
    .type("text/html; charset=utf-8")
    .send(renderFormConfirmationPage(result.workflow));
}
