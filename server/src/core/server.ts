import "dotenv/config";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import formbody from "@fastify/formbody";
import cors from "@fastify/cors";
import rootRoutes from "./routes/index.ts";
import appRoutes from "./routes/app.routes.ts";
import pluginsRoutes from "./routes/plugins.routes.ts";
import workflowsRoutes from "./routes/workflows.routes.ts";
import webhooksRoutes from "./routes/webhooks.routes.ts";
import credentialsRoutes from "./routes/credentials.routes.ts";
import commandPaletteRoutes from "./routes/command-palette.routes.ts";
import { initializeDatabases } from "./database/index.ts";
import { loadPlugins } from "./modules/plugins/loader.ts";
import { Scheduler } from "./modules/scheduler/scheduler.ts";
import { devWorkflowSessionRuntime } from "./modules/workflows/dev-session/runtime.ts";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 23801;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:23802";
const LOGS_ENABLED = process.env.LOGS_ENABLED || "false";

const fastify = Fastify({
  bodyLimit: 10485760, // 10MB limit for JSON (multipart handles larger files)
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
    enabled: LOGS_ENABLED === "true",
  },
});

await fastify.register(multipart, {
  limits: {
    fieldNameSize: 100,    // Max field name size in bytes
    fieldSize: 1000000,    // Max field value size in bytes (1MB)
    fields: 20,            // Max number of non-file fields
    fileSize: 10737418240, // Max file size per file (10GB)
    files: 20,             // Max number of file fields per request
  },
});

await fastify.register(formbody);

await fastify.register(cors, {
  origin: [CLIENT_ORIGIN],
  methods: ["*"],
  credentials: true,
});

await initializeDatabases();
await loadPlugins();
Scheduler.initialize();

fastify.register(rootRoutes);
fastify.register(appRoutes);
fastify.register(pluginsRoutes);
fastify.register(workflowsRoutes);
fastify.register(webhooksRoutes);
fastify.register(credentialsRoutes);
fastify.register(commandPaletteRoutes);

fastify.addHook("onClose", async () => {
  await devWorkflowSessionRuntime.manager.stopAll("server shutdown");
});

// Run the server!
fastify.listen({ port: PORT, host: "0.0.0.0" }, function (err, address) {
  if (err) {
    console.error("[NOD8 | FATAL ERROR]:", err);
    fastify.log.error(err);
    process.exit(1);
  }

  console.log(`[NOD8 | SERVER]: Server running at ${address}`);
});
