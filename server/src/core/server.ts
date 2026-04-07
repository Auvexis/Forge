import Fastify from "fastify";
import cors from "@fastify/cors";
import rootRoutes from "./routes/index.ts";
import ollamaRoutes from "./routes/ollama.routes.ts";
import pluginsRoutes from "./routes/plugins.routes.ts";
import aiRoutes from "./routes/ai.routes.ts";
import { loadPlugins } from "./plugins/loader.ts";

const fastify = Fastify({
  bodyLimit: 1048576000, // 1GB (Note: Base64 JSON payloads will hit Node.js max string size around 500MB-1GB)
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

await fastify.register(cors, {
  origin: ["http://localhost:8033"],
  methods: ["*"],
  credentials: true,
});

await loadPlugins();

fastify.register(rootRoutes);
fastify.register(ollamaRoutes);
fastify.register(pluginsRoutes);
fastify.register(aiRoutes);

// Run the server!
fastify.listen({ port: 8032 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  console.log("[FORGE | SERVER]: Server running at http://localhost:8032");
});
