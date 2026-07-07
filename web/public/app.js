const state = {
  catalog: null,
  history: [],
  selectedResult: null,
  editingRuleId: null,
  agentDrafts: {},
  agentLoading: null,
  agentError: ""
};

const viewTitles = {
  dashboard: "Operational Dashboard",
  sandbox: "Evidence Sandbox",
  rules: "Rule Catalog",
  integration: "Enterprise Integration"
};

document.addEventListener("DOMContentLoaded", async () => {
  bindSidebarToggle();
  bindNavigation();
  bindActions();
  await loadCatalog();
  await loadHistory();
  renderAll();
});

function bindSidebarToggle() {
  const shell = document.querySelector(".app-shell");
  const toggle = document.getElementById("sidebar-toggle");
  const saved = window.localStorage.getItem("sidebarCollapsed") === "true";

  shell.classList.toggle("sidebar-collapsed", saved);
  updateSidebarToggle(toggle, saved);

  toggle.addEventListener("click", () => {
    const collapsed = !shell.classList.contains("sidebar-collapsed");
    shell.classList.toggle("sidebar-collapsed", collapsed);
    window.localStorage.setItem("sidebarCollapsed", String(collapsed));
    updateSidebarToggle(toggle, collapsed);
  });
}

function updateSidebarToggle(toggle, collapsed) {
  toggle.setAttribute("aria-expanded", String(!collapsed));
  toggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
  toggle.querySelector("span").textContent = collapsed ? "›" : "‹";
}

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

  document.getElementById("evidence-file").addEventListener("change", loadEvidenceFile);

  document.getElementById("validation-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await runValidation({
      sourceSystem: "AuditBoard",
      domainId: form.get("domainId"),
      dataMode: form.get("dataMode"),
      fileName: form.get("fileName"),
      fileType: form.get("fileType"),
      content: form.get("content")
    });
  });

  document.getElementById("rule-form").addEventListener("submit", saveRule);
  document.getElementById("new-rule").addEventListener("click", () => setRuleForm());
  document.getElementById("reset-rules").addEventListener("click", resetRules);
}

async function loadCatalog() {
  const response = await fetch("/api/catalog");
  state.catalog = await response.json();
  renderDomainOptions();
  renderRuleDomainOptions();
  syncTemplateOptions();
  loadSelectedTemplate();
  setRuleForm();
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
    dataMode: templateOrPayload.dataMode || inferDataMode(templateOrPayload),
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

function renderRuleDomainOptions() {
  const select = document.getElementById("rule-domain");
  const options = [
    { id: "standard_qa", displayName: "Global Standard QA" },
    ...state.catalog.domains
  ];
  select.innerHTML = options.map((domain) => {
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
  document.getElementById("data-mode").value = template.isStructured === false ? "unstructured" : "structured";
  document.getElementById("evidence-content").value = template.content;
}

async function loadEvidenceFile(event) {
  const file = event.currentTarget.files && event.currentTarget.files[0];
  if (!file) return;

  const text = await file.text();
  document.getElementById("file-name").value = file.name;
  document.getElementById("file-type").value = inferFileType(file.name);
  document.getElementById("data-mode").value = inferDataMode({ fileName: file.name, fileType: inferFileType(file.name), content: text });
  document.getElementById("evidence-content").value = text;
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
    <div class="rule-row ${rule.isActive ? "" : "inactive-rule"}">
      <span class="rule-meta">
        ${escapeHtml(rule.ruleId)}
        <small>${escapeHtml(rule.domainId)} | ${escapeHtml(rule.matchMode || "specialized")}</small>
      </span>
      <strong class="rule-title">${escapeHtml(rule.title)}</strong>
      <span class="rule-points">${rule.weight} pts</span>
      <div class="rule-actions">
        <button class="secondary-button compact-button" type="button" data-edit-rule="${escapeHtml(rule.ruleId)}">Edit</button>
        <button class="secondary-button compact-button danger-button" type="button" data-delete-rule="${escapeHtml(rule.ruleId)}">Delete</button>
      </div>
    </div>
  `).join("");

  table.querySelectorAll("[data-edit-rule]").forEach((button) => {
    button.addEventListener("click", () => {
      const rule = state.catalog.rules.find((item) => item.ruleId === button.dataset.editRule);
      setRuleForm(rule);
    });
  });

  table.querySelectorAll("[data-delete-rule]").forEach((button) => {
    button.addEventListener("click", async () => {
      await deleteRule(button.dataset.deleteRule);
    });
  });
}

function setRuleForm(rule) {
  state.editingRuleId = rule ? rule.ruleId : null;
  document.getElementById("rule-form-title").textContent = rule ? "Edit Rule" : "New Rule";
  document.getElementById("rule-original-id").value = rule ? rule.ruleId : "";
  document.getElementById("rule-domain").value = rule ? rule.domainId : "cybersecurity";
  document.getElementById("rule-id").value = rule ? rule.ruleId : "";
  document.getElementById("rule-title").value = rule ? rule.title : "";
  document.getElementById("rule-description").value = rule ? rule.description : "";
  document.getElementById("rule-match-mode").value = rule ? rule.matchMode || "specialized" : "contains";
  document.getElementById("rule-type").value = rule ? rule.ruleType : "presence";
  document.getElementById("rule-target").value = rule ? rule.targetField : "";
  document.getElementById("rule-expected").value = rule ? rule.expectedValue : "";
  document.getElementById("rule-weight").value = rule ? rule.weight : 10;
  document.getElementById("rule-active").checked = rule ? rule.isActive !== false : true;
}

async function saveRule(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const originalId = document.getElementById("rule-original-id").value;
  const payload = {
    domainId: form.get("domainId"),
    ruleId: form.get("ruleId"),
    title: form.get("title"),
    description: form.get("description"),
    matchMode: form.get("matchMode"),
    ruleType: form.get("ruleType"),
    targetField: form.get("targetField"),
    expectedValue: form.get("expectedValue"),
    weight: Number(form.get("weight")),
    isActive: document.getElementById("rule-active").checked
  };

  const url = originalId ? `/api/rules/${encodeURIComponent(originalId)}` : "/api/rules";
  const method = originalId ? "PUT" : "POST";
  const response = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  state.catalog.rules = data.rules;
  setRuleForm(data.rule);
  renderRules();
}

async function deleteRule(ruleId) {
  const response = await fetch(`/api/rules/${encodeURIComponent(ruleId)}`, { method: "DELETE" });
  const data = await response.json();
  state.catalog.rules = data.rules;
  if (state.editingRuleId === ruleId) {
    setRuleForm();
  }
  renderRules();
}

async function resetRules() {
  const response = await fetch("/api/rules/reset", { method: "POST" });
  const data = await response.json();
  state.catalog.rules = data.rules;
  setRuleForm();
  renderRules();
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
        <p>${escapeHtml(result.inputProfile || result.dataMode || "")}</p>
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
    ${renderAiInsights(result.aiInsights)}
    ${renderAgentWorkspace(result)}
    <pre class="code-block"><code>${escapeHtml(JSON.stringify(result.enterpriseWriteback, null, 2))}</code></pre>
  `;
  bindAgentActions(result);
}

function renderAiInsights(insights) {
  if (!insights) {
    return "";
  }

  const statusLabel = insights.status === "ready" ? "OpenAI" : insights.status === "not_configured" ? "Fallback" : "Fallback";
  return `
    <section class="ai-panel">
      <div class="ai-header">
        <div>
          <h2>AI Auditor Guidance</h2>
          <p>${escapeHtml(insights.gapSummary)}</p>
        </div>
        <span class="status-pill ${insights.riskSeverity || "medium"}">${escapeHtml(statusLabel)}</span>
      </div>
      ${insights.message ? `<p class="ai-note">${escapeHtml(insights.message)}</p>` : ""}
      <div class="ai-grid">
        ${renderInsightList("Recommendations", insights.auditorRecommendations)}
        ${renderInsightList("Follow-up Questions", insights.followUpQuestions)}
        ${renderInsightList("Evidence Needed", insights.additionalEvidenceNeeded)}
      </div>
      <div class="ai-meta">
        <span>Severity: <b>${escapeHtml(insights.riskSeverity)}</b></span>
        <span>Confidence: <b>${escapeHtml(insights.confidence)}</b></span>
        <span>Rules: <b>${escapeHtml((insights.ruleReferences || []).join(", "))}</b></span>
      </div>
    </section>
  `;
}

function renderInsightList(title, items) {
  const list = Array.isArray(items) && items.length ? items : ["No guidance returned."];
  return `
    <div class="ai-card">
      <strong>${escapeHtml(title)}</strong>
      <ul>
        ${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderAgentWorkspace(result) {
  const failedCount = (result.findings || []).filter((finding) => finding.status === "FAIL").length;
  const drafts = state.agentDrafts[agentDraftKey(result)] || {};
  const issueLoading = state.agentLoading === "issue";
  const reportLoading = state.agentLoading === "report";
  const issueDisabled = !failedCount || issueLoading || reportLoading;
  const reportDisabled = issueLoading || reportLoading;

  return `
    <section class="agent-panel">
      <div class="ai-header">
        <div>
          <h2>Self-Service Agents</h2>
          <p>Generate stakeholder-ready drafts from the selected validation result.</p>
        </div>
        <span class="status-pill medium">Agents</span>
      </div>
      <div class="agent-actions">
        <button class="secondary-button" type="button" data-agent="issue" ${issueDisabled ? "disabled" : ""}>
          ${issueLoading ? "Drafting Issue..." : "Draft Issue"}
        </button>
        <button class="primary-button" type="button" data-agent="report" ${reportDisabled ? "disabled" : ""}>
          ${reportLoading ? "Drafting Report..." : "Draft Report"}
        </button>
      </div>
      ${!failedCount ? '<p class="ai-note">Issue drafting becomes available when at least one control finding fails.</p>' : ""}
      ${state.agentError ? `<p class="agent-error">${escapeHtml(state.agentError)}</p>` : ""}
      <div class="agent-drafts">
        ${drafts.issue ? renderIssueDraft(drafts.issue) : ""}
        ${drafts.report ? renderReportDraft(drafts.report) : ""}
      </div>
    </section>
  `;
}

function bindAgentActions(result) {
  document.querySelectorAll("[data-agent]").forEach((button) => {
    button.addEventListener("click", async () => {
      await requestAgentDraft(button.dataset.agent, result);
    });
  });
}

async function requestAgentDraft(agentType, result) {
  const key = agentDraftKey(result);
  state.agentDrafts[key] = state.agentDrafts[key] || {};
  state.agentLoading = agentType;
  state.agentError = "";
  renderResult();

  try {
    const response = await fetch(`/api/agents/${agentType}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        validationResult: result,
        history: state.history.filter((run) => run.domainId === result.domainId).slice(0, 10)
      })
    });

    if (!response.ok) {
      throw new Error(`Agent request failed with status ${response.status}.`);
    }

    const data = await response.json();
    state.agentDrafts[key][agentType] = agentType === "issue" ? data.issueDraft : data.reportDraft;
  } catch (error) {
    state.agentError = error.message || "Agent request failed.";
  } finally {
    state.agentLoading = null;
    renderResult();
  }
}

function renderIssueDraft(draft) {
  return `
    <article class="agent-draft-card">
      <div class="agent-draft-header">
        <div>
          <h2>${escapeHtml(draft.agentName || "Issue Writing Agent")}</h2>
          <p>${escapeHtml(draft.issueSummary)}</p>
        </div>
        <span class="status-pill ${draft.enterpriseIssueRecord?.severity || "medium"}">${escapeHtml(draft.status || "draft_ready")}</span>
      </div>
      <div class="agent-section-grid">
        ${renderAgentSection("Testing Performed", draft.testingPerformed)}
        ${renderAgentSection("Supporting Facts", draft.supportingFacts)}
      </div>
      <div class="agent-narrative">
        <strong>Root Cause</strong>
        <p>${escapeHtml(draft.rootCause)}</p>
      </div>
      <div class="agent-narrative">
        <strong>Impact</strong>
        <p>${escapeHtml(draft.impact)}</p>
      </div>
      <div class="agent-narrative">
        <strong>Action Owner Message</strong>
        <p>${escapeHtml(draft.actionOwnerMessage)}</p>
      </div>
      ${renderIssueRecord(draft.enterpriseIssueRecord)}
      ${renderAgentMeta(draft)}
    </article>
  `;
}

function renderIssueRecord(record) {
  if (!record) return "";
  return `
    <div class="agent-record">
      <strong>Enterprise Issue Record</strong>
      <dl>
        <div><dt>Title</dt><dd>${escapeHtml(record.title)}</dd></div>
        <div><dt>Severity</dt><dd>${escapeHtml(record.severity)} / ${escapeHtml(record.priority)}</dd></div>
        <div><dt>Domain</dt><dd>${escapeHtml(record.domain)}</dd></div>
        <div><dt>Target Due Date</dt><dd>${escapeHtml(record.targetDueDate)}</dd></div>
        <div><dt>Related Rules</dt><dd>${escapeHtml((record.relatedRules || []).join(", "))}</dd></div>
      </dl>
      ${renderAgentSection("Required Actions", record.requiredActions)}
    </div>
  `;
}

function renderReportDraft(draft) {
  return `
    <article class="agent-draft-card">
      <div class="agent-draft-header">
        <div>
          <h2>${escapeHtml(draft.reportTitle || "Control Assessment Report")}</h2>
          <p>${escapeHtml(draft.executiveSummary)}</p>
        </div>
        <span class="status-pill ${draft.overallRating === "effective" ? "low" : "medium"}">${escapeHtml(draft.overallRating)}</span>
      </div>
      <div class="agent-section-grid">
        ${renderAgentSection("Assessment Scope", draft.assessmentScope)}
        ${renderAgentSection("Supporting Facts", draft.supportingFacts)}
      </div>
      <div class="agent-report-list">
        <strong>Findings</strong>
        ${(draft.findings || []).map((finding) => `
          <div class="agent-row">
            <b>${escapeHtml(finding.title)}</b>
            <span>${escapeHtml(finding.severity)} | ${escapeHtml((finding.ruleReferences || []).join(", "))}</span>
            <p>${escapeHtml(finding.summary)}</p>
          </div>
        `).join("")}
      </div>
      <div class="agent-report-list">
        <strong>Action Plans</strong>
        ${(draft.actionPlans || []).map((plan) => `
          <div class="agent-row">
            <b>${escapeHtml(plan.owner)}</b>
            <span>Due ${escapeHtml(plan.dueDate)}</span>
            <p>${escapeHtml(plan.action)}</p>
            <p>${escapeHtml(plan.successCriteria)}</p>
          </div>
        `).join("")}
      </div>
      ${renderAppendix(draft.appendixControlsEvaluated)}
      ${renderAgentSection("Management Attention", draft.managementAttention)}
      ${renderAgentMeta(draft)}
    </article>
  `;
}

function renderAppendix(items) {
  const rows = Array.isArray(items) ? items : [];
  return `
    <div class="agent-report-list">
      <strong>Appendix: Controls Evaluated</strong>
      ${rows.map((item) => `
        <div class="agent-row compact">
          <b>${escapeHtml(item.ruleId)} - ${escapeHtml(item.control)}</b>
          <span>${escapeHtml(item.status)}</span>
          <p>${escapeHtml(item.evidence)}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function renderAgentSection(title, items) {
  const list = Array.isArray(items) && items.length ? items : ["No content returned."];
  return `
    <div class="agent-section">
      <strong>${escapeHtml(title)}</strong>
      <ul>
        ${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderAgentMeta(draft) {
  return `
    <div class="ai-meta">
      <span>Source: <b>${escapeHtml(draft.source || "rules_engine")}</b></span>
      <span>Status: <b>${escapeHtml(draft.agentStatus || "ready")}</b></span>
      ${draft.model ? `<span>Model: <b>${escapeHtml(draft.model)}</b></span>` : ""}
      ${draft.message ? `<span>${escapeHtml(draft.message)}</span>` : ""}
    </div>
  `;
}

function agentDraftKey(result) {
  return result.id || `${result.fileName}:${result.processedAt}`;
}

function inferFileType(fileName) {
  const match = String(fileName || "").match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toUpperCase() : "TXT";
}

function inferDataMode(payload) {
  const fileType = String(payload.fileType || inferFileType(payload.fileName)).toLowerCase();
  if (["csv", "tsv", "json", "xlsx", "xls"].includes(fileType)) {
    return "structured";
  }
  const content = String(payload.content || "").trim();
  return /^[\[{]/.test(content) || content.includes(",") && content.includes("\n") ? "structured" : "unstructured";
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
