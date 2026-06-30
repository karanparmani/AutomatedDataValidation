const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");
const { domains, rules, templates } = require("./lib/catalog");
const { evaluateEvidence } = require("./lib/engine");

const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");
const history = [];

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === "/api/health") {
      return sendJson(response, 200, {
        status: "ok",
        service: "Automated Data Validation Intelligence Layer",
        version: "1.0.0"
      });
    }

    if (url.pathname === "/api/catalog" && request.method === "GET") {
      return sendJson(response, 200, { domains, rules, templates });
    }

    if (url.pathname === "/api/rules" && request.method === "GET") {
      return sendJson(response, 200, { rules });
    }

    if (url.pathname === "/api/templates" && request.method === "GET") {
      return sendJson(response, 200, { templates });
    }

    if (url.pathname === "/api/history" && request.method === "GET") {
      return sendJson(response, 200, { history });
    }

    if (url.pathname === "/api/history/clear" && request.method === "POST") {
      history.splice(0, history.length);
      return sendJson(response, 200, { history });
    }

    if (url.pathname === "/api/validate" && request.method === "POST") {
      const payload = await readJson(request);
      if (!payload.domainId || !payload.content) {
        return sendJson(response, 400, {
          error: "domainId and content are required"
        });
      }

      const result = evaluateEvidence(payload);
      const record = {
        id: `run_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        ...result,
        sourceSystem: payload.sourceSystem || "AuditBoard",
        createdBy: payload.createdBy || "Digital Engineer Webhook"
      };
      history.unshift(record);
      if (history.length > 50) {
        history.pop();
      }
      return sendJson(response, 200, record);
    }

    return serveStatic(url.pathname, response);
  } catch (error) {
    return sendJson(response, 500, {
      error: "Unexpected server error",
      detail: process.env.NODE_ENV === "production" ? undefined : error.message
    });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Automated Data Validation web app running on http://localhost:${port}`);
});

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        request.destroy();
        reject(new Error("Request body too large"));
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    request.on("error", reject);
  });
}

function serveStatic(pathname, response) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(publicDir, safePath));

  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "content-type": contentType(filePath),
      "cache-control": "public, max-age=300"
    });
    response.end(content);
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8",
    ".json": "application/json; charset=utf-8"
  };
  return types[ext] || "application/octet-stream";
}
