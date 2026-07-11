const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");
const { generateAssessmentReport, generateIssueDraft } = require("./lib/agents");
const {
  getAuditModules,
  resolveAuditContext,
  sendIssueToAuditModule,
  sendReportToAuditModule
} = require("./lib/auditModules");
const { evaluateEvidence } = require("./lib/engine");
const { generateAuditIntelligence } = require("./lib/intelligence");
const { deleteRule, getCatalog, getRules, resetRules, upsertRule } = require("./lib/store");

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
      return sendJson(response, 200, getCatalog());
    }

    if (url.pathname === "/api/audit-modules" && request.method === "GET") {
      return sendJson(response, 200, { projects: getAuditModules() });
    }

    if (url.pathname === "/api/rules" && request.method === "GET") {
      return sendJson(response, 200, { rules: getRules() });
    }

    if (url.pathname === "/api/rules" && request.method === "POST") {
      const payload = await readJson(request);
      return sendJson(response, 200, upsertRule(payload));
    }

    if (url.pathname === "/api/rules/reset" && request.method === "POST") {
      return sendJson(response, 200, { rules: resetRules() });
    }

    const ruleMatch = url.pathname.match(/^\/api\/rules\/([^/]+)$/);
    if (ruleMatch && request.method === "PUT") {
      const payload = await readJson(request);
      return sendJson(response, 200, upsertRule(payload, decodeURIComponent(ruleMatch[1])));
    }

    if (ruleMatch && request.method === "DELETE") {
      return sendJson(response, 200, deleteRule(decodeURIComponent(ruleMatch[1])));
    }

    if (url.pathname === "/api/templates" && request.method === "GET") {
      return sendJson(response, 200, { templates: getCatalog().templates });
    }

    if (url.pathname === "/api/history" && request.method === "GET") {
      return sendJson(response, 200, { history });
    }

    if (url.pathname === "/api/history/clear" && request.method === "POST") {
      history.splice(0, history.length);
      return sendJson(response, 200, { history });
    }

    const reviewMatch = url.pathname.match(/^\/api\/history\/([^/]+)\/review$/);
    if (reviewMatch && request.method === "POST") {
      const record = history.find((item) => item.id === decodeURIComponent(reviewMatch[1]));
      if (!record) {
        return sendJson(response, 404, { error: "Validation record not found" });
      }
      const payload = await readJson(request);
      record.auditorReview = sanitizeAuditorReview(payload.auditorReview);
      return sendJson(response, 200, { record });
    }

    if (url.pathname === "/api/validate" && request.method === "POST") {
      const payload = await readJson(request);
      if (!payload.domainId || !payload.content) {
        return sendJson(response, 400, {
          error: "domainId and content are required"
        });
      }

      const activeRules = getRules();
      const auditContext = payload.auditContext
        ? resolveAuditContext(payload.auditContext.projectId, payload.auditContext.testId)
        : null;
      if (payload.auditContext && !auditContext) {
        return sendJson(response, 400, { error: "The selected audit project or control test is not valid." });
      }
      if (auditContext && auditContext.domainId !== payload.domainId) {
        return sendJson(response, 400, { error: "The selected control test does not match the validation domain." });
      }
      const result = evaluateEvidence(payload, activeRules);
      result.auditContext = auditContext;
      if (auditContext) {
        result.enterpriseWriteback.auditModule = {
          projectId: auditContext.projectId,
          controlId: auditContext.controlId,
          testId: auditContext.testId
        };
      }
      const aiInsights = payload.includeIntelligence === false
        ? null
        : await generateAuditIntelligence(result, activeRules);
      const record = {
        id: `run_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        ...result,
        aiInsights,
        sourceSystem: payload.sourceSystem || "AuditBoard",
        createdBy: payload.createdBy || "Digital Engineer Webhook"
      };
      history.unshift(record);
      if (history.length > 50) {
        history.pop();
      }
      return sendJson(response, 200, record);
    }

    const auditModuleMatch = url.pathname.match(/^\/api\/audit-modules\/([^/]+)\/(issues|reports)$/);
    if (auditModuleMatch && request.method === "POST") {
      const projectId = decodeURIComponent(auditModuleMatch[1]);
      const payload = await readJson(request);
      try {
        const result = auditModuleMatch[2] === "issues"
          ? sendIssueToAuditModule(projectId, payload)
          : sendReportToAuditModule(projectId, payload);
        return sendJson(response, 200, result);
      } catch (error) {
        return sendJson(response, 400, { error: error.message });
      }
    }

    if (url.pathname === "/api/intelligence" && request.method === "POST") {
      const payload = await readJson(request);
      if (!payload.validationResult) {
        return sendJson(response, 400, {
          error: "validationResult is required"
        });
      }

      const aiInsights = await generateAuditIntelligence(payload.validationResult, getRules());
      return sendJson(response, 200, { aiInsights });
    }

    if (url.pathname === "/api/agents/issue" && request.method === "POST") {
      const payload = await readJson(request);
      if (!payload.validationResult) {
        return sendJson(response, 400, {
          error: "validationResult is required"
        });
      }

      const issueDraft = await generateIssueDraft(payload.validationResult, getRules());
      return sendJson(response, 200, { issueDraft });
    }

    if (url.pathname === "/api/agents/report" && request.method === "POST") {
      const payload = await readJson(request);
      if (!payload.validationResult) {
        return sendJson(response, 400, {
          error: "validationResult is required"
        });
      }

      const reportDraft = await generateAssessmentReport(payload.validationResult, payload.history || history, getRules());
      return sendJson(response, 200, { reportDraft });
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

function sanitizeAuditorReview(value) {
  return Object.fromEntries(
    Object.entries(value && typeof value === "object" ? value : {})
      .filter(([, decision]) => decision === "confirmed" || decision === "follow_up")
      .map(([ruleId, decision]) => [String(ruleId).slice(0, 120), decision])
  );
}
