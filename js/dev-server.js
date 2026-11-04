const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT) || 4173;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

http
  .createServer((request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
    } catch {
      response.writeHead(400).end("Bad request");
      return;
    }
    const file = path.resolve(
      root,
      `.${pathname === "/" ? "/index.html" : pathname}`,
    );
    if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    fs.stat(file, (statError, stats) => {
      const target =
        !statError && stats.isDirectory()
          ? path.join(file, "index.html")
          : file;
      fs.readFile(target, (readError, contents) => {
        if (readError) {
          response
            .writeHead(readError.code === "ENOENT" ? 404 : 500)
            .end("Not found");
          return;
        }
        response.writeHead(200, {
          "Cache-Control": "no-store",
          "Content-Type":
            contentTypes[path.extname(target).toLowerCase()] ||
            "application/octet-stream",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
          "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' http://localhost:* http://127.0.0.1:* https://script.google.com https://script.googleusercontent.com https://nominatim.openstreetmap.org; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
        });
        response.end(request.method === "HEAD" ? undefined : contents);
      });
    });
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`ApnaJind dev server: http://127.0.0.1:${port}`);
  });
