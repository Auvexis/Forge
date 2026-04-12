import "dotenv/config";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import cors from "@fastify/cors";
import rootRoutes from "./routes/index.ts";
import pluginsRoutes from "./routes/plugins.routes.ts";
import workflowsRoutes from "./routes/workflows.routes.ts";
import { loadPlugins } from "./modules/plugins/loader.ts";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8032;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:8033";

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
    enabled: true,
  },
});

await fastify.register(multipart, {
  limits: {
    fieldNameSize: 100, // Max field name size in bytes
    fieldSize: 1000000, // Max field value size in bytes (1MB)
    fields: 10, // Max number of non-file fields
    fileSize: 10737418240, // Max file size (10GB)
    files: 1, // Max number of file fields
  },
});

await fastify.register(cors, {
  origin: [CLIENT_ORIGIN],
  methods: ["*"],
  credentials: true,
});

await loadPlugins();

fastify.register(rootRoutes);
fastify.register(pluginsRoutes);
fastify.register(workflowsRoutes);

// Run the server!
fastify.listen({ port: PORT, host: "0.0.0.0" }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  console.log(`[FORGE | SERVER]: Server running at ${address}`);
});
