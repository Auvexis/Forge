import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const distDir = process.env.FABRIC_CLIENT_DIST;
const port = Number(process.env.FABRIC_CLIENT_PORT ?? 23802);

if (!distDir || !fs.existsSync(path.join(distDir, "index.html"))) {
  console.error("[FABRIC | CLIENT]: Client dist directory is missing.");
  process.exit(1);
}

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url ?? "/", "http://localhost");
  const safePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "");
  const candidate = path.resolve(distDir, safePath);
  const filePath = candidate.startsWith(path.resolve(distDir)) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()
    ? candidate
    : path.join(distDir, "index.html");

  res.writeHead(200, {
    "content-type": contentTypes.get(path.extname(filePath)) ?? "application/octet-stream",
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`[FABRIC | CLIENT]: Static client running at http://localhost:${port}`);
});
