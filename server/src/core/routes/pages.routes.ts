import type { FastifyInstance, FastifyReply } from "fastify";
import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { PageActionService } from "../modules/pages/page-actions.ts";
import { PageService } from "../modules/pages/page-service.ts";
import type { CreatePageInput, SailorPage, UpdatePageInput } from "../modules/pages/page-types.ts";
import { activeProfileRuntime } from "../profiles/active-profile-runtime.ts";

interface PageActionServiceLike {
  submitAction: PageActionService["submitAction"];
}

export interface PagesRoutesOptions {
  getActiveProfileId?: () => string;
  actionService?: PageActionServiceLike;
}

export default async function pagesRoutes(
  fastify: FastifyInstance,
  options: PagesRoutesOptions = {},
) {
  const sendResponse = <T>(reply: FastifyReply, response: ApiResponse<T>) => {
    return reply.code(response.status_code).send(response);
  };

  const getProfileId =
    options.getActiveProfileId ??
    (() => activeProfileRuntime.activeProfileService.getActiveProfile()?.id ?? "default");
  const actionService = options.actionService ?? new PageActionService();
  const getService = () => new PageService({ profileId: getProfileId() });

  fastify.get("/pages", async (_req, reply) => {
    return sendResponse(reply, {
      status_code: 200,
      message: "Pages fetched successfully",
      error: null,
      data: getService().listPages(),
    });
  });

  fastify.post("/pages", async (req, reply) => {
    try {
      const body = req.body as Partial<CreatePageInput>;
      const page = getService().createPage({
        profileId: getProfileId(),
        title: String(body.title ?? ""),
        slug: body.slug,
        blocks: body.blocks,
      });
      return sendResponse<SailorPage>(reply, {
        status_code: 201,
        message: "Page created successfully",
        error: null,
        data: page,
      });
    } catch (error) {
      return sendResponse(reply, badRequest("Failed to create page", error));
    }
  });

  fastify.get("/pages/:pageId", async (req, reply) => {
    const { pageId } = req.params as { pageId: string };
    const page = getService().getPage(pageId);
    if (!page) return sendResponse(reply, notFound("Page not found"));
    return sendResponse(reply, {
      status_code: 200,
      message: "Page fetched successfully",
      error: null,
      data: page,
    });
  });

  fastify.put("/pages/:pageId", async (req, reply) => {
    const { pageId } = req.params as { pageId: string };
    try {
      const page = getService().updatePage(pageId, req.body as UpdatePageInput);
      return sendResponse(reply, {
        status_code: 200,
        message: "Page updated successfully",
        error: null,
        data: page,
      });
    } catch (error) {
      return sendResponse(reply, routeError(error, "Page not found", "Failed to update page"));
    }
  });

  fastify.delete("/pages/:pageId", async (req, reply) => {
    const { pageId } = req.params as { pageId: string };
    const deleted = getService().deletePage(pageId);
    if (!deleted) return sendResponse(reply, notFound("Page not found"));
    return sendResponse(reply, {
      status_code: 200,
      message: "Page deleted successfully",
      error: null,
      data: null,
    });
  });

  fastify.post("/pages/:pageId/publish", async (req, reply) => {
    const { pageId } = req.params as { pageId: string };
    try {
      const page = getService().publishPage(pageId);
      return sendResponse(reply, {
        status_code: 200,
        message: "Page published successfully",
        error: null,
        data: page,
      });
    } catch (error) {
      return sendResponse(reply, routeError(error, "Page not found", "Failed to publish page"));
    }
  });

  fastify.get("/pages/:pageId/preview", async (req, reply) => {
    const { pageId } = req.params as { pageId: string };
    const html = getService().renderPreview(pageId);
    if (!html) return reply.code(404).send("Page not found");
    return reply.code(200).type("text/html").send(html);
  });

  fastify.get("/p/:slug", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const html = getService().renderPublished(slug);
    if (!html) return reply.code(404).send("Page not found");
    return reply.code(200).type("text/html").send(html);
  });

  fastify.post("/p/:slug/actions/:actionId", async (req, reply) => {
    const { slug, actionId } = req.params as { slug: string; actionId: string };
    const result = await actionService.submitAction(getProfileId(), slug, actionId, {
      body: req.body,
      headers: req.headers,
      ip: req.ip,
    });
    if (!result.ok) {
      return sendResponse(reply, {
        status_code: result.statusCode,
        message: result.message,
        error: result.message,
        data: null,
      });
    }
    return sendResponse(reply, {
      status_code: 202,
      message: "Page action accepted",
      error: null,
      data: { executionId: result.executionId },
    });
  });
}

function notFound(message: string): ApiResponse<null> {
  return { status_code: 404, message, error: "not_found", data: null };
}

function badRequest(message: string, error: unknown): ApiResponse<null> {
  return {
    status_code: 400,
    message,
    error: error instanceof Error ? error.message : "bad_request",
    data: null,
  };
}

function routeError(error: unknown, notFoundMessage: string, fallbackMessage: string): ApiResponse<null> {
  const message = error instanceof Error ? error.message : "unknown_error";
  if (/not found/i.test(message)) {
    return notFound(notFoundMessage);
  }
  return { status_code: 400, message: fallbackMessage, error: message, data: null };
}
