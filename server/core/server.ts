import Fastify from "fastify";

const fastify = Fastify({
  logger: true,
});

// Run the server!
fastify.listen({ port: 8032 }, function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
