import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import type { ApiResponse } from "../../shared/models/api-response.model.ts";
import { NotificationService } from "../modules/notifications/notification-service.ts";

const NotificationLevelSchema = z.enum(["error", "warning", "info"]);
const NotificationCategorySchema = z.string().regex(/^[a-z][a-z0-9-]{0,63}$/);
const InternalActionUrlSchema = z
  .string()
  .max(2048)
  .refine((value) => value.startsWith("/") && !value.startsWith("//"), "Action URL must be an internal path");

const CreateNotificationSchema = z.object({
  level: NotificationLevelSchema,
  category: NotificationCategorySchema.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  message: z.string().trim().min(1).max(10_000),
  source: z.string().trim().min(1).max(200).optional(),
  context: z.unknown().optional(),
  actionUrl: InternalActionUrlSchema.optional(),
  actionLabel: z.string().trim().min(1).max(100).optional(),
});

const ListNotificationsQuerySchema = z.object({
  category: NotificationCategorySchema.optional(),
  level: NotificationLevelSchema.optional(),
  unread: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
});

const NotificationIdParamsSchema = z.object({ id: z.string().trim().min(1).max(200) });

export interface NotificationRoutesOptions {
  service?: NotificationService;
}

export default async function notificationsRoutes(
  fastify: FastifyInstance,
  options: NotificationRoutesOptions = {},
) {
  const service = options.service ?? new NotificationService();

  fastify.post("/notifications", async (request, reply) => {
    const parsed = CreateNotificationSchema.safeParse(request.body);
    if (!parsed.success) return invalidRequest(reply, parsed.error);
    return sendResponse(reply, 201, "Notification created", service.create(parsed.data));
  });

  fastify.get("/notifications", async (request, reply) => {
    const parsed = ListNotificationsQuerySchema.safeParse(request.query);
    if (!parsed.success) return invalidRequest(reply, parsed.error);
    return sendResponse(reply, 200, "Notifications fetched", service.list(parsed.data));
  });

  fastify.get("/notifications/summary", async (_request, reply) => {
    return sendResponse(reply, 200, "Notification summary fetched", service.summary());
  });

  fastify.patch("/notifications/read-all", async (_request, reply) => {
    return sendResponse(reply, 200, "Notifications marked as read", { updated: service.markAllRead() });
  });

  fastify.patch("/notifications/:id/read", async (request, reply) => {
    const parsed = NotificationIdParamsSchema.safeParse(request.params);
    if (!parsed.success) return invalidRequest(reply, parsed.error);
    const notification = service.markRead(parsed.data.id);
    if (!notification) return notFound(reply);
    return sendResponse(reply, 200, "Notification marked as read", notification);
  });

  fastify.delete("/notifications/:id", async (request, reply) => {
    const parsed = NotificationIdParamsSchema.safeParse(request.params);
    if (!parsed.success) return invalidRequest(reply, parsed.error);
    if (!service.delete(parsed.data.id)) return notFound(reply);
    return sendResponse(reply, 200, "Notification deleted", null);
  });

  fastify.delete("/notifications", async (_request, reply) => {
    return sendResponse(reply, 200, "Notifications cleared", { deleted: service.clear() });
  });
}

function sendResponse<T>(reply: FastifyReply, statusCode: number, message: string, data: T) {
  const response: ApiResponse<T> = { status_code: statusCode, message, error: null, data };
  return reply.code(statusCode).send(response);
}

function invalidRequest(reply: FastifyReply, error: z.ZodError) {
  const response: ApiResponse<null> = {
    status_code: 400,
    message: "Invalid notification request",
    error: error.issues.map((issue) => issue.message).join(", "),
    data: null,
  };
  return reply.code(400).send(response);
}

function notFound(reply: FastifyReply) {
  const response: ApiResponse<null> = {
    status_code: 404,
    message: "Notification not found",
    error: "NOTIFICATION_NOT_FOUND",
    data: null,
  };
  return reply.code(404).send(response);
}
