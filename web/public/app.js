const state = {
  catalog: null,
  history: [],
  selectedResult: null
};

const viewTitles = {
  dashboard: "Operational Dashboard",
  sandbox: "Evidence Sandbox",
  rules: "Rule Catalog",
  integration: "Enterprise Integration"
};

document.addEventListener("DOMContentLoaded", async () => {
  bindNavigation();
  bindActions();
  await loadCatalog();
  await loadHistory();
  renderAll();
});

function bindNavigation() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".view").forEach((section) => section.classList.toggle("active", section.id === `${view}-view`));
      document.getElementById("view-title").textContent = viewTitles[view];
    });
  });
}

function bindActions() {
  document.getElementById("quick-run").addEventListener("click", async () => {
    const template = state.catalog.templates.find((item) => item.id === "CYBER_FAIL") || state.catalog.templates[0];
    await runValidation(template);
    switchView("sandbox");
  });

  document.getElementById("clear-history").addEventListener("click", async () => {
    await fetch("/api/history/clear", { method: "POST" });
    state.history = [];
    state.selectedResult = null;
    renderAll();
  });

  document.getElementById("domain-select").addEventListener("change", () => {
    syncTemplateOptions();
    loadSelectedTemplate();
  });

  document.getElementById("template-select").addEventListener("change", loadSelectedTemplate);

  document.getElementById("validation-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await runValidation({
      sourceSystem: "AuditBoard",
      domainId: form.get("domainId"),
      fileName: form.get("fileName"),
      fileType: form.get("fileType"),
      content: form.get("content")
    });
  });
}

async function loadCatalog() {
  const response = await fetch("/api/catalog");
  state.catalog = await response.json();
  renderDomainOptions();
  syncTemplateOptions();
  loadSelectedTemplate();
}

async function loadHistory() {
  const response = await fetch("/api/history");
  const data = await response.json();
  state.history = data.history || [];
}

async function runValidation(templateOrPayload) {
  const payload = {
    sourceSystem: "AuditBoard",
    workpaperId: `WP-2026-${Math.floor(100 + Math.random() * 900)}`,
    domainId: templateOrPayload.domainId,
    fileName: templateOrPayload.fileName,
    fileType: templateOrPayload.fileType,
    fileSizeKb: templateOrPayload.fileSizeKb,
    content: templateOrPayload.content
  };

  const response = await fetch("/api/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  state.selectedResult = await response.json();
  await loadHistory();
  renderAll();
}

function renderAll() {
  renderDashboard();
  renderRules();
  renderResult();
}

function renderDomainOptions() {
  const select = document.getElementById("domain-select");
  select.innerHTML = state.catalog.domains.map((domain) => {
    return `<option value="${domain.id}">${escapeHtml(domain.displayName)}</option>`;
  }).join("");
}

function syncTemplateOptions() {
  const domainId = document.getElementById("domain-select").value;
  const select = document.getElementById("template-select");
  const templates = state.catalog.templates.filter((template) => template.domainId === domainId || template.id === "OUT_OF_WINDOW");
  select.innerHTML = templates.map((template) => {
    return `<option value="${template.id}">${escapeHtml(template.title)} - ${escapeHtml(template.resultHint)}</option>`;
  }).join("");
}

function loadSelectedTemplate() {
  const templateId = document.getElementById("template-select").value;
  const template = state.catalog.templates.find((item) => item.id === templateId);
  if (!template) return;
  document.getElementById("file-name").value = template.fileName;
  document.getElementById("file-type").value = template.fileType;
  document.getElementById("evidence-content").value = template.content;
}

function renderDashboard() {
  const runs = state.history;
  const pass = runs.filter((run) => run.status === "PASSED").length;
  const warning = runs.filter((run) => run.status === "WARNING").length;
  const fail = runs.filter((run) => run.status === "REMEDIATION_REQUIRED").length;
  const avgScore = runs.length ? Math.round(runs.reduce((sum, run) => sum + run.score, 0) / runs.length) : 94;
  const avgLatency = runs.length ? Math.round(runs.reduce((sum, run) => sum + run.processingDurationMs, 0) / runs.length) : 0;

  document.getElementById("avg-score").textContent = `${avgScore}%`;
  document.getElementById("processed-count").textContent = runs.length;
  document.getElementById("remediation-count").textContent = fail;
  document.getElementById("avg-latency").textContent = `${avgLatency} ms`;
  document.getElementById("pass-count").textContent = pass;
  document.getElementById("warning-count").textContent = warning;
  document.getElementById("fail-count").textContent = fail;

  renderHealthBar(pass, warning, fail);
  renderRunList(runs);
}

function renderHealthBar(pass, warning, fail) {
  const total = Math.max(pass + warning + fail, 1);
  const bar = document.getElementById("health-bar");
  const segments = [
    ["pass", pass],
    ["warning", warning],
    ["fail", fail]
  ].filter(([, count]) => count > 0);

  bar.innerHTML = segments.length
    ? segments.map(([name, count]) => `<span class="bar-segment ${name}" style="width:${(count / total) * 100}%"></span>`).join("")
    : '<span class="bar-segment pass" style="width:100%"></span>';
}

function renderRunList(runs) {
  const list = document.getElementById("run-list");
  if (!runs.length) {
    list.innerHTML = '<div class="empty-state">No runs yet.</div>';
    return;
  }

  list.innerHTML = runs.map((run) => `
    <button class="run-row" type="button" data-run-id="${escapeHtml(run.id)}">
      <span>
        <strong>${escapeHtml(run.fileName)}</strong>
        <small>${escapeHtml(run.domainName)} | ${escapeHtml(run.enterpriseWriteback.workpaperId)}</small>
      </span>
      <span class="status-pill ${run.status.toLowerCase()}">${run.score}%</span>
    </button>
  `).join("");

  list.querySelectorAll(".run-row").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedResult = runs.find((run) => run.id === row.dataset.runId);
      renderResult();
      switchView("sandbox");
    });
  });
}

function renderRules() {
  const table = document.getElementById("rules-table");
  table.innerHTML = state.catalog.rules.map((rule) => `
    <div class="rule-row">
      <span>${escapeHtml(rule.ruleId)}</span>
      <strong>${escapeHtml(rule.title)}</strong>
      <span>${rule.weight} pts</span>
    </div>
  `).join("");
}

function renderResult() {
  const empty = document.getElementById("result-empty");
  const output = document.getElementById("result-output");
  const result = state.selectedResult;

  empty.classList.toggle("hidden", Boolean(result));
  output.classList.toggle("hidden", !result);

  if (!result) {
    output.innerHTML = "";
    return;
  }

  output.innerHTML = `
    <div class="result-score">
      <div>
        <strong>${result.score}</strong>
        <span class="status-pill ${result.status.toLowerCase()}">${escapeHtml(result.status.replaceAll("_", " "))}</span>
      </div>
      <div>
        <h2>${escapeHtml(result.fileName)}</h2>
        <p>${escapeHtml(result.enterpriseWriteback.disposition)} | ${escapeHtml(result.processingDurationMs)} ms</p>
      </div>
    </div>
    <div class="findings-list">
      ${result.findings.map((finding) => `
        <div class="finding-row ${finding.status.toLowerCase()}">
          <strong>${escapeHtml(finding.status)} [${escapeHtml(finding.ruleId)}] ${escapeHtml(finding.title)}</strong>
          <p>${escapeHtml(finding.evidence)}</p>
        </div>
      `).join("")}
    </div>
    <pre class="code-block"><code>${escapeHtml(JSON.stringify(result.enterpriseWriteback, null, 2))}</code></pre>
  `;
}

function switchView(view) {
  const button = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (button) button.click();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
