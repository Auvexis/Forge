import Fastify from "fastify";
import rootRoutes from "./routes/index.ts";
import ollamaRoutes from "./routes/ollama.routes.ts";
import pluginsRoutes from "./routes/plugins.routes.ts";

const fastify = Fastify({
  logger: true,
});

fastify.register(rootRoutes);
fastify.register(ollamaRoutes);
fastify.register(pluginsRoutes);

// Run the server!
fastify.listen({ port: 8032 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
