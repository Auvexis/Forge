import http from "node:http";
import net from "node:net";

import { resolveGatewayRoute } from "./routing.js";

const GATEWAY_PORT = Number(process.env.FABRIC_GATEWAY_PORT ?? process.env.PORT ?? 23800);
const API_ORIGIN = process.env.FABRIC_API_ORIGIN ?? "http://localhost:23801";
const CLIENT_ORIGIN = process.env.FABRIC_CLIENT_ORIGIN ?? "http://localhost:23802";

function targetOrigin(pathname: string, accept?: string | string[]): URL {
  const route = resolveGatewayRoute(pathname, { accept });
  return new URL(route.target === "api" ? API_ORIGIN : CLIENT_ORIGIN);
}

function proxyHttp(req: http.IncomingMessage, res: http.ServerResponse): void {
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const target = targetOrigin(requestUrl.pathname, req.headers.accept);
  const headers = { ...req.headers };
  headers.host = target.host;
  headers["x-forwarded-host"] = req.headers.host ?? "";
  headers["x-forwarded-proto"] = "http";

  const proxyReq = http.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      method: req.method,
      path: `${requestUrl.pathname}${requestUrl.search}`,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (error) => {
    if (res.headersSent) {
      res.destroy(error);
      return;
    }
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end(`Fabric gateway could not reach upstream: ${error.message}`);
  });

  req.pipe(proxyReq);
}

function proxyUpgrade(req: http.IncomingMessage, socket: net.Socket, head: Buffer): void {
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const target = targetOrigin(requestUrl.pathname, req.headers.accept);
  const upstream = net.connect(Number(target.port || 80), target.hostname, () => {
    upstream.write(
      `${req.method} ${requestUrl.pathname}${requestUrl.search} HTTP/${req.httpVersion}\r\n` +
        Object.entries({
          ...req.headers,
          host: target.host,
          "x-forwarded-host": req.headers.host ?? "",
          "x-forwarded-proto": "http",
        })
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value ?? ""}`)
          .join("\r\n") +
        "\r\n\r\n",
    );
    if (head.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });

  upstream.on("error", () => socket.destroy());
}

const server = http.createServer(proxyHttp);
server.on("upgrade", proxyUpgrade);

server.listen(GATEWAY_PORT, "0.0.0.0", () => {
  console.log(`[FABRIC | GATEWAY]: http://localhost:${GATEWAY_PORT}`);
  console.log(`[FABRIC | GATEWAY]: API -> ${API_ORIGIN}`);
  console.log(`[FABRIC | GATEWAY]: Client -> ${CLIENT_ORIGIN}`);
});
