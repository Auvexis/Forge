import Fastify from "fastify";
import rootRoutes from "./routes/index.ts";
import ollamaRoutes from "./routes/ollama.routes.ts";
import pluginsRoutes from "./routes/plugins.routes.ts";
import aiRoutes from "./routes/ai.routes.ts";
import { loadPlugins } from "./plugins/loader.ts";

const fastify = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  },
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
});
