const state = {
  catalog: null,
  history: [],
  selectedResult: null,
  editingRuleId: null,
  agentDrafts: {},
  agentLoading: null,
  agentError: "",
  assessmentStage: "evidence",
  reviewDecisions: {},
  validationLoading: false,
  validationError: "",
  activeView: "dashboard",
  auditModules: [],
  selectedAuditProjectId: null,
  selectedAuditTestId: null,
  moduleViewProjectId: null,
  moduleHandoffs: {},
  moduleLoading: null,
  moduleError: ""
};

const viewTitles = {
  dashboard: "Operational Dashboard",
  sandbox: "Control Testing Workspace",
  modules: "Audit Modules",
  rules: "Rule Catalog",
  integration: "Enterprise Integration"
};

document.addEventListener("DOMContentLoaded", async () => {
  bindSidebarToggle();
  bindNavigation();
  bindActions();
  await loadCatalog();
  await loadAuditModules();
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
  toggle.querySelector("span").textContent = collapsed ? ">" : "<";
}

function bindNavigation() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      state.activeView = view;
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
      document.querySelectorAll(".view").forEach((section) => section.classList.toggle("active", section.id === `${view}-view`));
      document.getElementById("view-title").textContent = viewTitles[view];
      updateTopbarActions(view);
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    });
  });
}

function bindActions() {
  document.getElementById("quick-run").addEventListener("click", startNewAssessment);

  document.getElementById("clear-history").addEventListener("click", async () => {
    await fetch("/api/history/clear", { method: "POST" });
    state.history = [];
    state.selectedResult = null;
    state.agentDrafts = {};
    state.reviewDecisions = {};
    state.assessmentStage = "evidence";
    renderAll();
  });

  document.querySelectorAll("[data-assessment-step]").forEach((button) => {
    button.addEventListener("click", () => setAssessmentStage(button.dataset.assessmentStep));
  });

  document.getElementById("domain-select").addEventListener("change", () => {
    syncTemplateOptions();
    loadSelectedTemplate();
  });

  document.getElementById("audit-project-select").addEventListener("change", (event) => {
    state.selectedAuditProjectId = event.currentTarget.value;
    state.selectedAuditTestId = null;
    syncAuditTestOptions();
    applySelectedAuditTest();
  });

  document.getElementById("audit-test-select").addEventListener("change", (event) => {
    state.selectedAuditTestId = event.currentTarget.value;
    applySelectedAuditTest();
  });

  document.getElementById("module-project-select").addEventListener("change", (event) => {
    state.moduleViewProjectId = event.currentTarget.value;
    renderAuditModules();
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
      content: form.get("content"),
      auditContext: getSelectedAuditContext()
    });
  });

  document.getElementById("rule-form").addEventListener("submit", saveRule);
  document.getElementById("new-rule").addEventListener("click", () => setRuleForm());
  document.getElementById("catalog-new-rule").addEventListener("click", () => {
    setRuleForm();
    scrollRuleEditorIntoView();
  });
  document.getElementById("reset-rules").addEventListener("click", resetRules);
}

function startNewAssessment() {
  state.selectedResult = null;
  state.assessmentStage = "evidence";
  state.validationError = "";
  state.agentError = "";
  state.moduleError = "";

  const domainSelect = document.getElementById("domain-select");
  const templateSelect = document.getElementById("template-select");
  if (state.catalog && domainSelect && templateSelect) {
    const auditContext = getSelectedAuditContext();
    domainSelect.value = auditContext?.domainId || "cybersecurity";
    syncTemplateOptions();
    const availableTemplates = state.catalog.templates.filter((template) => template.domainId === domainSelect.value);
    const exceptionTemplate = availableTemplates.find((template) => /fail|breach|exception|outage/i.test(`${template.id} ${template.resultHint}`));
    templateSelect.value = exceptionTemplate?.id || availableTemplates[0]?.id || templateSelect.value;
    loadSelectedTemplate();
    renderAuditContextPreview(auditContext);
  }

  renderResult();
  renderValidationFeedback();
  switchView("sandbox");
  scrollAssessmentToTop();
}

function updateTopbarActions(view) {
  const resetButton = document.getElementById("clear-history");
  resetButton.classList.toggle("hidden", view !== "dashboard");
}

function renderValidationFeedback() {
  const feedback = document.getElementById("validation-feedback");
  if (!feedback) return;
  feedback.textContent = state.validationError;
  feedback.classList.toggle("hidden", !state.validationError);
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

async function loadAuditModules() {
  const response = await fetch("/api/audit-modules");
  const data = await response.json();
  state.auditModules = data.projects || [];
  state.selectedAuditProjectId = state.selectedAuditProjectId || state.auditModules[0]?.id || null;
  state.moduleViewProjectId = state.moduleViewProjectId || state.selectedAuditProjectId;
  renderAuditProjectOptions();
  syncAuditTestOptions();
  applySelectedAuditTest();
}

function renderAuditProjectOptions() {
  const options = state.auditModules.map((project) => {
    return `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)} | ${escapeHtml(project.status)}</option>`;
  }).join("");
  const assessmentSelect = document.getElementById("audit-project-select");
  const moduleSelect = document.getElementById("module-project-select");
  assessmentSelect.innerHTML = options;
  moduleSelect.innerHTML = options;
  if (state.selectedAuditProjectId) assessmentSelect.value = state.selectedAuditProjectId;
  if (state.moduleViewProjectId) moduleSelect.value = state.moduleViewProjectId;
}

function syncAuditTestOptions() {
  const project = state.auditModules.find((item) => item.id === state.selectedAuditProjectId);
  const contexts = flattenAuditTests(project);
  const select = document.getElementById("audit-test-select");
  select.innerHTML = contexts.map((context) => {
    return `<option value="${escapeHtml(context.testId)}">${escapeHtml(context.testType)} | ${escapeHtml(context.testName)}</option>`;
  }).join("");

  const selectedExists = contexts.some((context) => context.testId === state.selectedAuditTestId);
  if (!selectedExists) {
    state.selectedAuditTestId = contexts.find((context) => context.testType === "Operating Effectiveness")?.testId || contexts[0]?.testId || null;
  }
  if (state.selectedAuditTestId) select.value = state.selectedAuditTestId;
}

function applySelectedAuditTest() {
  const context = getSelectedAuditContext();
  renderAuditContextPreview(context);
  if (!context || !state.catalog) return;

  const domainSelect = document.getElementById("domain-select");
  if (Array.from(domainSelect.options).some((option) => option.value === context.domainId)) {
    domainSelect.value = context.domainId;
    syncTemplateOptions();
    loadSelectedTemplate();
  }
}

function renderAuditContextPreview(context) {
  const preview = document.getElementById("audit-context-preview");
  if (!context) {
    preview.innerHTML = '<span class="context-empty">No mapped control test is available.</span>';
    return;
  }
  preview.innerHTML = `
    <div><span>Process</span><strong>${escapeHtml(context.processName)}</strong></div>
    <div><span>Risk</span><strong>${escapeHtml(context.riskName)}</strong></div>
    <div><span>Control</span><strong>${escapeHtml(context.controlName)}</strong></div>
    <div><span>Test</span><strong>${escapeHtml(context.testName)}</strong><small>${escapeHtml(context.testType)}</small></div>
  `;
}

function getSelectedAuditContext() {
  const project = state.auditModules.find((item) => item.id === state.selectedAuditProjectId);
  return flattenAuditTests(project).find((context) => context.testId === state.selectedAuditTestId) || null;
}

function flattenAuditTests(project) {
  if (!project) return [];
  return (project.processes || []).flatMap((process) => {
    return (process.risks || []).flatMap((risk) => {
      return (risk.controls || []).flatMap((control) => {
        return (control.tests || []).map((test) => ({
          projectId: project.id,
          projectName: project.name,
          projectStatus: project.status,
          processId: process.id,
          processName: process.name,
          riskId: risk.id,
          riskName: risk.name,
          riskRating: risk.rating,
          controlId: control.id,
          controlName: control.name,
          controlOwner: control.owner,
          testId: test.id,
          testName: test.name,
          testType: test.type,
          domainId: test.domainId,
          ruleIds: [...(test.ruleIds || [])]
        }));
      });
    });
  });
}

async function loadHistory() {
  const response = await fetch("/api/history");
  const data = await response.json();
  state.history = data.history || [];
  state.history.forEach((run) => {
    const key = reviewDecisionKey(run);
    if (!state.reviewDecisions[key] && run.auditorReview) {
      state.reviewDecisions[key] = { ...run.auditorReview };
    }
  });
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
    content: templateOrPayload.content,
    auditContext: templateOrPayload.auditContext || null
  };

  const submitButton = document.querySelector("#validation-form button[type='submit']");
  state.validationLoading = true;
  state.validationError = "";
  submitButton.disabled = true;
  submitButton.textContent = "Running Control Tests...";

  try {
    const response = await fetch("/api/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Validation request failed with status ${response.status}.`);
    }

    state.selectedResult = data;
    state.reviewDecisions[reviewDecisionKey(state.selectedResult)] = {};
    state.assessmentStage = "review";
    await loadHistory();
    renderAll();
    scrollAssessmentToTop();
  } catch (error) {
    state.validationError = error.message || "Control testing could not be completed.";
    renderValidationFeedback();
  } finally {
    state.validationLoading = false;
    submitButton.disabled = false;
    submitButton.textContent = "Run Control Tests";
  }
}

function renderAll() {
  renderDashboard();
  renderAuditModules();
  renderRules();
  renderResult();
  renderValidationFeedback();
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
  const avgScore = runs.length ? Math.round(runs.reduce((sum, run) => sum + run.score, 0) / runs.length) : null;
  const avgLatency = runs.length ? Math.round(runs.reduce((sum, run) => sum + run.processingDurationMs, 0) / runs.length) : 0;

  document.getElementById("avg-score").textContent = avgScore === null ? "--" : `${avgScore}%`;
  document.getElementById("processed-count").textContent = runs.length;
  document.getElementById("remediation-count").textContent = fail;
  document.getElementById("avg-latency").textContent = `${avgLatency} ms`;
  document.getElementById("pass-count").textContent = pass;
  document.getElementById("warning-count").textContent = warning;
  document.getElementById("fail-count").textContent = fail;

  renderHealthBar(pass, warning, fail);
  renderRunList(runs);
}

function renderAuditModules() {
  const output = document.getElementById("audit-module-output");
  if (!output) return;
  const project = state.auditModules.find((item) => item.id === state.moduleViewProjectId) || state.auditModules[0];
  if (!project) {
    output.innerHTML = '<div class="empty-stage"><strong>No audit projects available</strong></div>';
    return;
  }

  state.moduleViewProjectId = project.id;
  document.getElementById("module-project-select").value = project.id;
  const processCount = project.processes?.length || 0;
  const testCount = flattenAuditTests(project).length;
  const issueCount = project.issues?.length || 0;
  const reportCount = project.reports?.length || 0;

  output.innerHTML = `
    <section class="module-project-banner">
      <div>
        <span class="module-code">${escapeHtml(project.id)}</span>
        <h2>${escapeHtml(project.name)}</h2>
        <p>${escapeHtml(project.objective)}</p>
      </div>
      <div class="module-project-meta">
        <span class="status-pill low">${escapeHtml(project.status)}</span>
        <span>${escapeHtml(project.owner)}</span>
        <span>${escapeHtml(project.period)}</span>
      </div>
    </section>
    <div class="module-metrics">
      ${renderModuleMetric("Processes", processCount, "Mapped audit processes")}
      ${renderModuleMetric("Control Tests", testCount, "Design and operating tests")}
      ${renderModuleMetric("Tagged Issues", issueCount, "Draft issues linked to controls")}
      ${renderModuleMetric("Draft Reports", reportCount, "Assessment reports in the module")}
    </div>
    <div class="module-layout">
      <section class="panel module-hierarchy-panel">
        <div class="panel-header">
          <div><h2>Audit Hierarchy</h2><p>Process, risk, control, and testing lineage</p></div>
        </div>
        ${renderAuditHierarchy(project)}
      </section>
      <div class="module-records">
        <section class="module-record-section">
          <div class="section-heading">
            <div><p class="section-kicker">Issue register</p><h3>Tagged control issues</h3></div>
            <span class="count-badge">${issueCount}</span>
          </div>
          ${renderModuleIssues(project.issues || [])}
        </section>
        <section class="module-record-section">
          <div class="section-heading">
            <div><p class="section-kicker">Reporting</p><h3>Draft audit reports</h3></div>
            <span class="count-badge report-count">${reportCount}</span>
          </div>
          ${renderModuleReports(project.reports || [])}
        </section>
      </div>
    </div>
  `;
  bindAuditModuleViewActions();
}

function renderModuleMetric(label, value, description) {
  return `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(description)}</small>
    </div>
  `;
}

function renderAuditHierarchy(project) {
  return `
    <div class="audit-hierarchy">
      ${(project.processes || []).map((process) => `
        <div class="hierarchy-process">
          <div class="hierarchy-label"><span>Process</span><strong>${escapeHtml(process.name)}</strong><small>${escapeHtml(process.id)}</small></div>
          ${(process.risks || []).map((risk) => `
            <div class="hierarchy-risk">
              <div class="hierarchy-label"><span>Risk</span><strong>${escapeHtml(risk.name)}</strong><small>${escapeHtml(risk.rating)} risk | ${escapeHtml(risk.id)}</small></div>
              ${(risk.controls || []).map((control) => `
                <div class="hierarchy-control">
                  <div class="hierarchy-label"><span>Control</span><strong>${escapeHtml(control.name)}</strong><small>${escapeHtml(control.owner)} | ${escapeHtml(control.id)}</small></div>
                  <div class="hierarchy-tests">
                    ${(control.tests || []).map((test) => {
                      const taggedIssues = (project.issues || []).filter((issue) => issue.auditContext?.testId === test.id).length;
                      return `
                        <div class="hierarchy-test">
                          <div><span>${escapeHtml(test.type)}</span><strong>${escapeHtml(test.name)}</strong><small>${escapeHtml((test.ruleIds || []).join(", "))}</small></div>
                          <div class="hierarchy-test-actions">
                            ${taggedIssues ? `<span class="status-pill warning">${taggedIssues} issue${taggedIssues === 1 ? "" : "s"}</span>` : '<span class="status-pill passed">No issues</span>'}
                            <button class="secondary-button compact-button" type="button" data-start-audit-test="${escapeHtml(test.id)}" data-project-id="${escapeHtml(project.id)}">Run Test</button>
                          </div>
                        </div>
                      `;
                    }).join("")}
                  </div>
                </div>
              `).join("")}
            </div>
          `).join("")}
        </div>
      `).join("")}
    </div>
  `;
}

function renderModuleIssues(issues) {
  if (!issues.length) {
    return '<div class="module-empty"><strong>No issues tagged yet</strong><p>Confirmed failed controls can be sent here from Draft & Handoff.</p></div>';
  }
  return `<div class="module-record-list">${issues.map((issue) => `
    <article class="module-record-card issue-record-card">
      <div class="module-record-header">
        <div><span>${escapeHtml(issue.id)} | ${escapeHtml(issue.auditContext?.controlId)}</span><h3>${escapeHtml(issue.title)}</h3></div>
        <span class="status-pill ${escapeHtml(issue.severity || "medium")}">${escapeHtml(issue.severity || "medium")}</span>
      </div>
      <p>${escapeHtml(issue.summary)}</p>
      <div class="record-lineage">${escapeHtml(issue.auditContext?.processName)} / ${escapeHtml(issue.auditContext?.riskName)} / ${escapeHtml(issue.auditContext?.testName)}</div>
      <div class="record-tags">${(issue.relatedRuleIds || []).map((ruleId) => `<span>${escapeHtml(ruleId)}</span>`).join("")}</div>
    </article>
  `).join("")}</div>`;
}

function renderModuleReports(reports) {
  if (!reports.length) {
    return '<div class="module-empty"><strong>No report drafts sent yet</strong><p>Generate an assessment report and send it to this audit module.</p></div>';
  }
  return `<div class="module-record-list">${reports.map((report) => `
    <article class="module-record-card report-record-card">
      <div class="module-record-header">
        <div><span>${escapeHtml(report.id)} | ${escapeHtml(report.status)}</span><h3>${escapeHtml(report.title)}</h3></div>
        <span class="status-pill ${report.overallRating === "effective" ? "low" : "medium"}">${escapeHtml(report.overallRating)}</span>
      </div>
      <p>${escapeHtml(report.executiveSummary)}</p>
      <div class="record-lineage">${escapeHtml(report.auditContext?.projectName)} / ${escapeHtml(report.auditContext?.testName)}</div>
      <small>${(report.relatedIssueIds || []).length} related issue${(report.relatedIssueIds || []).length === 1 ? "" : "s"}</small>
    </article>
  `).join("")}</div>`;
}

function bindAuditModuleViewActions() {
  document.querySelectorAll("[data-start-audit-test]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedAuditProjectId = button.dataset.projectId;
      state.selectedAuditTestId = button.dataset.startAuditTest;
      renderAuditProjectOptions();
      syncAuditTestOptions();
      applySelectedAuditTest();
      startNewAssessment();
    });
  });
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
        <small>${escapeHtml(run.auditContext?.projectName || run.domainName)} | ${escapeHtml(run.enterpriseWriteback.workpaperId)}</small>
      </span>
      <span class="status-pill ${run.status.toLowerCase()}">${run.score}%</span>
    </button>
  `).join("");

  list.querySelectorAll(".run-row").forEach((row) => {
    row.addEventListener("click", () => {
      state.selectedResult = runs.find((run) => run.id === row.dataset.runId);
      state.reviewDecisions[reviewDecisionKey(state.selectedResult)] = {
        ...(state.selectedResult.auditorReview || getReviewDecisions(state.selectedResult))
      };
      state.assessmentStage = "review";
      renderResult();
      switchView("sandbox");
      scrollAssessmentToTop();
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
      scrollRuleEditorIntoView();
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
  const result = state.selectedResult;
  const reviewOutput = document.getElementById("review-output");
  const conclusionOutput = document.getElementById("conclusion-output");
  const publishOutput = document.getElementById("publish-output");

  renderAssessmentProgress(result);

  if (!result) {
    const emptyStage = `
      <div class="empty-stage">
        <strong>No assessment result yet</strong>
        <p>Complete the Evidence step to begin control testing.</p>
      </div>
    `;
    reviewOutput.innerHTML = emptyStage;
    conclusionOutput.innerHTML = emptyStage;
    publishOutput.innerHTML = emptyStage;
    return;
  }

  reviewOutput.innerHTML = renderReviewStage(result);
  conclusionOutput.innerHTML = renderConclusionStage(result);
  publishOutput.innerHTML = renderPublishStage(result);
  bindAssessmentStageActions(result);
  bindAgentActions(result);
  bindModuleHandoffActions(result);
}

function renderAssessmentProgress(result) {
  const stages = ["evidence", "review", "conclusion", "publish"];
  const hasResult = Boolean(result);
  const reviewComplete = hasResult && isReviewComplete(result);

  if (!hasResult && state.assessmentStage !== "evidence") {
    state.assessmentStage = "evidence";
  }
  if (state.assessmentStage === "publish" && !reviewComplete) {
    state.assessmentStage = "conclusion";
  }

  const activeIndex = stages.indexOf(state.assessmentStage);
  document.querySelectorAll("[data-assessment-step]").forEach((button) => {
    const step = button.dataset.assessmentStep;
    const stepIndex = stages.indexOf(step);
    const enabled = step === "evidence" || hasResult && (step !== "publish" || reviewComplete);
    const completed = stepIndex < activeIndex && (step !== "conclusion" || reviewComplete);
    button.disabled = !enabled;
    button.classList.toggle("active", step === state.assessmentStage);
    button.classList.toggle("completed", completed);
    if (step === state.assessmentStage) {
      button.setAttribute("aria-current", "step");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  document.querySelectorAll("[data-assessment-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.assessmentPanel === state.assessmentStage);
  });
}

function setAssessmentStage(stage) {
  const allowed = ["evidence", "review", "conclusion", "publish"];
  if (!allowed.includes(stage)) return;
  if (stage !== "evidence" && !state.selectedResult) return;
  if (stage === "publish" && !isReviewComplete(state.selectedResult)) return;
  state.assessmentStage = stage;
  renderResult();
  scrollAssessmentToTop();
}

function renderReviewStage(result) {
  const failed = (result.findings || []).filter((finding) => finding.status === "FAIL");
  const passed = (result.findings || []).filter((finding) => finding.status === "PASS");
  const exceptionCopy = failed.length
    ? failed.length === 1 ? "1 control requires auditor review." : `${failed.length} controls require auditor review.`
    : "No control exceptions were detected.";

  return `
    ${renderStageHeading("Step 2 of 4", "Review test results", "Exceptions are prioritized; successful checks remain available as supporting detail.")}
    ${renderAssessmentSummary(result)}
    ${renderAuditContextRibbon(result.auditContext)}
    <div class="review-layout">
      <div class="review-main">
        <div class="section-heading">
          <div>
            <p class="section-kicker">Review focus</p>
            <h3>${escapeHtml(exceptionCopy)}</h3>
          </div>
          <span class="count-badge">${failed.length}</span>
        </div>
        ${failed.length ? `<div class="exception-list">${failed.map(renderExceptionCard).join("")}</div>` : renderAllClearPanel()}
        ${renderPassedControls(passed)}
      </div>
      <aside class="panel review-checkpoint">
        <p class="section-kicker">Testing context</p>
        <h3>Assessment scope</h3>
        <dl class="scope-list">
          <div><dt>Domain</dt><dd>${escapeHtml(result.domainName || result.domainId)}</dd></div>
          <div><dt>Evidence</dt><dd>${escapeHtml(result.fileName)}</dd></div>
          <div><dt>Input profile</dt><dd>${escapeHtml(result.inputProfile || result.dataMode || "Not classified")}</dd></div>
          <div><dt>Rules tested</dt><dd>${result.findings.length}</dd></div>
        </dl>
        <div class="next-action-box">
          <span>Next action</span>
          <p>${failed.length ? "Review how each exception was derived and record your judgment." : "Confirm the assessment conclusion and prepare the final report."}</p>
        </div>
        <button class="primary-button full-width" type="button" data-stage-next="conclusion">Review Conclusions</button>
      </aside>
    </div>
  `;
}

function renderStageHeading(kicker, title, description) {
  return `
    <div class="stage-heading">
      <p class="step-kicker">${escapeHtml(kicker)}</p>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(description)}</p>
    </div>
  `;
}

function renderAssessmentSummary(result) {
  const failedCount = (result.findings || []).filter((finding) => finding.status === "FAIL").length;
  const statusClass = result.status.toLowerCase();
  return `
    <section class="assessment-summary ${statusClass}">
      <div class="assessment-score">
        <span>Assessment score</span>
        <strong>${escapeHtml(result.score)}</strong>
        <small>out of 100</small>
      </div>
      <div class="assessment-outcome">
        <span class="status-pill ${statusClass}">${escapeHtml(result.status.replaceAll("_", " "))}</span>
        <h2>${failedCount ? `${failedCount} exception${failedCount === 1 ? "" : "s"} identified` : "Controls operating as tested"}</h2>
        <p>${escapeHtml(result.enterpriseWriteback?.disposition || "Assessment ready for review")} | ${escapeHtml(result.processingDurationMs)} ms</p>
      </div>
      <div class="assessment-source">
        <span>Evidence population</span>
        <strong>${escapeHtml(result.fileName)}</strong>
        <small>${escapeHtml(result.domainName || result.domainId)}</small>
      </div>
    </section>
  `;
}

function renderAuditContextRibbon(context) {
  if (!context) return "";
  return `
    <section class="audit-context-ribbon">
      <div>
        <span>Audit module</span>
        <strong>${escapeHtml(context.projectName)}</strong>
      </div>
      <div class="lineage-breadcrumb">
        <span>${escapeHtml(context.processName)}</span>
        <i aria-hidden="true">/</i>
        <span>${escapeHtml(context.riskName)}</span>
        <i aria-hidden="true">/</i>
        <span>${escapeHtml(context.controlName)}</span>
        <i aria-hidden="true">/</i>
        <strong>${escapeHtml(context.testName)}</strong>
      </div>
      <span class="status-pill low">${escapeHtml(context.testType)}</span>
    </section>
  `;
}

function renderExceptionCard(finding) {
  return `
    <article class="exception-card">
      <div class="exception-header">
        <div>
          <span class="rule-reference">${escapeHtml(finding.ruleId)}</span>
          <h3>${escapeHtml(finding.title)}</h3>
        </div>
        <span class="status-pill remediation_required">Exception</span>
      </div>
      <div class="evidence-statement">
        <span>Observed from evidence</span>
        <p>${escapeHtml(finding.evidence)}</p>
      </div>
      <div class="remediation-statement">
        <span>Expected correction</span>
        <p>${escapeHtml(finding.remediation || `Remediate ${finding.ruleId} and provide refreshed evidence.`)}</p>
      </div>
    </article>
  `;
}

function renderAllClearPanel() {
  return `
    <div class="all-clear-panel">
      <span class="status-pill passed">Passed</span>
      <div>
        <h3>No failed controls require escalation</h3>
        <p>Proceed to Conclusions to confirm scope and evidence sufficiency.</p>
      </div>
    </div>
  `;
}

function renderPassedControls(passed) {
  if (!passed.length) return "";
  return `
    <details class="passed-controls">
      <summary>
        <span><strong>Passed controls</strong><small>Successful checks retained for the workpaper</small></span>
        <span class="count-badge passed-count">${passed.length}</span>
      </summary>
      <div class="passed-list">
        ${passed.map((finding) => `
          <div class="passed-row">
            <span class="status-dot-inline"></span>
            <div><strong>${escapeHtml(finding.title)}</strong><small>${escapeHtml(finding.ruleId)} | ${escapeHtml(finding.evidence)}</small></div>
          </div>
        `).join("")}
      </div>
    </details>
  `;
}

function renderConclusionStage(result) {
  const failed = (result.findings || []).filter((finding) => finding.status === "FAIL");
  const decisions = getReviewDecisions(result);
  const remaining = failed.filter((finding) => !decisions[finding.ruleId]).length;
  const reviewComplete = remaining === 0;

  return `
    ${renderStageHeading("Step 3 of 4", "Confirm the assessment conclusion", "Separate validation facts from AI interpretation, then record the auditor judgment.")}
    ${renderAuditContextRibbon(result.auditContext)}
    <div class="conclusion-layout">
      <div class="conclusion-main">
        ${failed.length
          ? failed.map((finding) => renderConclusionCard(finding, result, decisions[finding.ruleId])).join("")
          : renderPassingConclusion(result)}
        ${renderAiInsights(result.aiInsights)}
      </div>
      <aside class="panel decision-gate ${reviewComplete ? "complete" : ""}">
        <p class="section-kicker">Review gate</p>
        <h3>${reviewComplete ? "Judgment recorded" : `${remaining} decision${remaining === 1 ? "" : "s"} remaining`}</h3>
        <p>${reviewComplete ? "The assessment is ready for drafting and handoff." : "Record an auditor decision for every exception before generating stakeholder outputs."}</p>
        ${failed.length ? `
          <div class="decision-status-list">
            ${failed.map((finding) => renderDecisionStatus(finding, decisions[finding.ruleId])).join("")}
          </div>
        ` : ""}
        <button class="primary-button full-width" type="button" data-stage-next="publish" ${reviewComplete ? "" : "disabled"}>Continue to Drafts</button>
      </aside>
    </div>
  `;
}

function renderConclusionCard(finding, result, decision) {
  const insights = result.aiInsights || {};
  const confidence = insights.confidence || "medium";
  const interpretation = insights.gapSummary || `The control test identified an exception affecting ${finding.ruleId}.`;
  const decisionLabel = decision === "confirmed" ? "Exception confirmed" : decision === "follow_up" ? "Owner follow-up required" : "Awaiting auditor decision";

  return `
    <article class="conclusion-card">
      <div class="conclusion-card-header">
        <div>
          <span class="rule-reference">${escapeHtml(finding.ruleId)}</span>
          <h3>${escapeHtml(finding.title)}</h3>
        </div>
        <span class="decision-label ${decision || "pending"}">${escapeHtml(decisionLabel)}</span>
      </div>
      <div class="claim-trace">
        ${renderClaim("Observed fact", "observed", finding.evidence, `Evidence: ${result.fileName}`, "high", false)}
        ${renderClaim("Rule-derived conclusion", "rule", `${finding.title} did not satisfy the configured control test.`, `Rule: ${finding.ruleId}`, "high", false)}
        ${renderClaim("AI interpretation", "inference", interpretation, "AI guidance based on the failed finding", confidence, true)}
      </div>
      <div class="auditor-decision">
        <div>
          <strong>Auditor judgment</strong>
          <p>Confirm the exception or retain it as an open question for the process owner.</p>
        </div>
        <div class="decision-actions">
          <button class="secondary-button ${decision === "confirmed" ? "selected" : ""}" type="button" data-review-decision="confirmed" data-rule-id="${escapeHtml(finding.ruleId)}" aria-pressed="${decision === "confirmed"}">Confirm Exception</button>
          <button class="secondary-button ${decision === "follow_up" ? "selected" : ""}" type="button" data-review-decision="follow_up" data-rule-id="${escapeHtml(finding.ruleId)}" aria-pressed="${decision === "follow_up"}">Needs Owner Follow-up</button>
        </div>
      </div>
    </article>
  `;
}

function renderClaim(label, type, statement, basis, confidence, requiresConfirmation) {
  return `
    <div class="claim-item ${escapeHtml(type)}">
      <div class="claim-marker" aria-hidden="true"></div>
      <div>
        <div class="claim-heading">
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(confidence)} confidence</span>
        </div>
        <p>${escapeHtml(statement)}</p>
        <small>${escapeHtml(basis)}${requiresConfirmation ? " | Confirmation required" : ""}</small>
      </div>
    </div>
  `;
}

function renderPassingConclusion(result) {
  return `
    <article class="conclusion-card passing-conclusion">
      <span class="status-pill passed">Rule-derived conclusion</span>
      <h3>No failed controls were detected</h3>
      <p>The supplied evidence passed all ${result.findings.length} configured tests. Evidence completeness and population scope still require standard reviewer sign-off.</p>
    </article>
  `;
}

function renderDecisionStatus(finding, decision) {
  const label = decision === "confirmed" ? "Confirmed" : decision === "follow_up" ? "Follow-up" : "Pending";
  return `
    <div>
      <span>${escapeHtml(finding.ruleId)}</span>
      <strong class="${decision || "pending"}">${escapeHtml(label)}</strong>
    </div>
  `;
}

function renderPublishStage(result) {
  const decisions = getReviewDecisions(result);
  const followUpCount = Object.values(decisions).filter((decision) => decision === "follow_up").length;
  return `
    ${renderStageHeading("Step 4 of 4", "Prepare stakeholder outputs", "Generate drafts from validated facts, AI interpretation, and recorded auditor judgments.")}
    ${renderAuditContextRibbon(result.auditContext)}
    <div class="handoff-banner ${followUpCount ? "warning" : "ready"}">
      <div>
        <span>${followUpCount ? "Open questions retained" : "Review complete"}</span>
        <h2>${followUpCount ? `${followUpCount} owner follow-up${followUpCount === 1 ? "" : "s"} will remain visible in the drafts.` : "The assessment is ready for issue and report drafting."}</h2>
      </div>
      <span class="status-pill ${followUpCount ? "warning" : "passed"}">${followUpCount ? "Needs follow-up" : "Ready"}</span>
    </div>
    ${renderAgentWorkspace(result)}
    <details class="advanced-details writeback-details">
      <summary>Enterprise writeback payload</summary>
      <pre class="code-block"><code>${escapeHtml(JSON.stringify(result.enterpriseWriteback, null, 2))}</code></pre>
    </details>
  `;
}

function bindAssessmentStageActions(result) {
  document.querySelectorAll("[data-stage-next]").forEach((button) => {
    button.addEventListener("click", () => setAssessmentStage(button.dataset.stageNext));
  });

  document.querySelectorAll("[data-review-decision]").forEach((button) => {
    button.addEventListener("click", async () => {
      const key = reviewDecisionKey(result);
      state.reviewDecisions[key] = state.reviewDecisions[key] || {};
      state.reviewDecisions[key][button.dataset.ruleId] = button.dataset.reviewDecision;
      result.auditorReview = { ...state.reviewDecisions[key] };
      renderResult();
      await persistAuditorReview(result);
    });
  });
}

async function persistAuditorReview(result) {
  if (!result.id) return;
  try {
    await fetch(`/api/history/${encodeURIComponent(result.id)}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ auditorReview: getReviewDecisions(result) })
    });
  } catch (error) {
    console.warn("Auditor review could not be persisted for this session.");
  }
}

function reviewDecisionKey(result) {
  return result.id || `${result.fileName}:${result.processedAt}`;
}

function getReviewDecisions(result) {
  return state.reviewDecisions[reviewDecisionKey(result)] || result.auditorReview || {};
}

function isReviewComplete(result) {
  if (!result) return false;
  const failed = (result.findings || []).filter((finding) => finding.status === "FAIL");
  const decisions = getReviewDecisions(result);
  return failed.every((finding) => Boolean(decisions[finding.ruleId]));
}

function renderAiInsights(insights) {
  if (!insights) {
    return "";
  }

  const statusLabel = insights.status === "ready" ? "AI generated" : "Rules based";
  return `
    <section class="ai-panel">
      <div class="ai-header">
        <div>
          <h2>AI Review Support</h2>
          <p>${escapeHtml(insights.gapSummary)}</p>
        </div>
        <span class="status-pill ${insights.riskSeverity || "medium"}">${escapeHtml(statusLabel)}</span>
      </div>
      ${insights.message ? `<p class="ai-note">${escapeHtml(insights.message)}</p>` : ""}
      <details class="ai-guidance-details">
        <summary>Recommended actions and evidence requests</summary>
        <div class="ai-grid">
          ${renderInsightList("Recommended Actions", insights.auditorRecommendations)}
          ${renderInsightList("Questions for the Owner", insights.followUpQuestions)}
          ${renderInsightList("Additional Evidence", insights.additionalEvidenceNeeded)}
        </div>
      </details>
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
  const decisions = getReviewDecisions(result);
  const confirmedCount = Object.values(decisions).filter((decision) => decision === "confirmed").length;
  const followUpCount = Object.values(decisions).filter((decision) => decision === "follow_up").length;
  const drafts = state.agentDrafts[agentDraftKey(result)] || {};
  const issueLoading = state.agentLoading === "issue";
  const reportLoading = state.agentLoading === "report";
  const issueDisabled = !failedCount || issueLoading || reportLoading;
  const reportDisabled = issueLoading || reportLoading;

  return `
    <section class="agent-panel">
      <div class="ai-header">
        <div>
          <h2>AI-assisted drafting</h2>
          <p>Drafts use validation facts and the recorded auditor judgments. Generated language remains review-required.</p>
        </div>
        <span class="status-pill medium">${confirmedCount} confirmed | ${followUpCount} follow-up</span>
      </div>
      <div class="agent-actions">
        <button class="secondary-button" type="button" data-agent="issue" ${issueDisabled ? "disabled" : ""}>
          ${issueLoading ? "Generating Issue Draft..." : "Generate Issue Draft"}
        </button>
        <button class="primary-button" type="button" data-agent="report" ${reportDisabled ? "disabled" : ""}>
          ${reportLoading ? "Generating Assessment Report..." : "Generate Assessment Report"}
        </button>
      </div>
      ${!failedCount ? '<p class="ai-note">Issue drafting becomes available when at least one control finding fails.</p>' : ""}
      ${state.agentError ? `<p class="agent-error">${escapeHtml(state.agentError)}</p>` : ""}
      <div class="agent-drafts">
        ${drafts.issue ? renderIssueDraft(drafts.issue, !drafts.report) : ""}
        ${drafts.report ? renderReportDraft(drafts.report, true) : ""}
      </div>
      ${renderModuleHandoff(result, drafts)}
    </section>
  `;
}

function renderModuleHandoff(result, drafts) {
  const context = result.auditContext;
  if (!context) {
    return '<p class="ai-note">Select an audit project and control test before validation to enable module handoff.</p>';
  }
  const key = agentDraftKey(result);
  const handoff = state.moduleHandoffs[key] || {};
  const issueLoading = state.moduleLoading === `${key}:issue`;
  const reportLoading = state.moduleLoading === `${key}:report`;
  const anySent = handoff.issue?.status === "sent" || handoff.report?.status === "sent";

  return `
    <section class="module-handoff-panel">
      <div class="module-handoff-header">
        <div>
          <p class="section-kicker">Audit module handoff</p>
          <h3>${escapeHtml(context.projectName)}</h3>
          <p>${escapeHtml(context.controlName)} / ${escapeHtml(context.testName)}</p>
        </div>
        <span class="status-pill low">${escapeHtml(context.testType)}</span>
      </div>
      <div class="module-handoff-list">
        ${renderModuleHandoffRow("issue", "Control issue", drafts.issue, handoff.issue, issueLoading)}
        ${renderModuleHandoffRow("report", "Assessment report", drafts.report, handoff.report, reportLoading)}
      </div>
      ${state.moduleError ? `<p class="agent-error">${escapeHtml(state.moduleError)}</p>` : ""}
      ${anySent ? '<button class="secondary-button" type="button" data-open-audit-module>Open Audit Module</button>' : ""}
    </section>
  `;
}

function renderModuleHandoffRow(type, label, draft, handoff, loading) {
  const sent = handoff?.status === "sent";
  const status = sent ? handoff.recordId : draft ? "Draft ready" : "Generate draft first";
  return `
    <div class="module-handoff-row">
      <div>
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(status)}</span>
      </div>
      <button class="${sent ? "secondary-button" : "primary-button"}" type="button" data-module-send="${escapeHtml(type)}" ${!draft || loading || sent ? "disabled" : ""}>
        ${loading ? "Sending..." : sent ? "Sent" : `Send ${escapeHtml(label)}`}
      </button>
    </div>
  `;
}

function bindModuleHandoffActions(result) {
  document.querySelectorAll("[data-module-send]").forEach((button) => {
    button.addEventListener("click", async () => {
      await sendDraftToAuditModule(button.dataset.moduleSend, result);
    });
  });

  document.querySelectorAll("[data-open-audit-module]").forEach((button) => {
    button.addEventListener("click", () => {
      state.moduleViewProjectId = result.auditContext?.projectId || state.moduleViewProjectId;
      renderAuditProjectOptions();
      renderAuditModules();
      switchView("modules");
    });
  });
}

async function sendDraftToAuditModule(type, result) {
  const context = result.auditContext;
  const key = agentDraftKey(result);
  const drafts = state.agentDrafts[key] || {};
  const draft = drafts[type];
  if (!context || !draft) return;

  state.moduleLoading = `${key}:${type}`;
  state.moduleError = "";
  renderResult();

  try {
    const payload = {
      validationResult: {
        ...result,
        auditorReview: getReviewDecisions(result)
      },
      auditContext: context,
      [type === "issue" ? "issueDraft" : "reportDraft"]: draft
    };
    const endpoint = type === "issue" ? "issues" : "reports";
    const response = await fetch(`/api/audit-modules/${encodeURIComponent(context.projectId)}/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Audit module handoff failed with status ${response.status}.`);
    }

    state.auditModules = data.projects || state.auditModules;
    state.moduleViewProjectId = context.projectId;
    state.moduleHandoffs[key] = state.moduleHandoffs[key] || {};
    state.moduleHandoffs[key][type] = { status: "sent", recordId: data.record.id };
    renderAuditProjectOptions();
    renderAuditModules();
  } catch (error) {
    state.moduleError = error.message || "Audit module handoff failed.";
  } finally {
    state.moduleLoading = null;
    renderResult();
  }
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
        validationResult: {
          ...result,
          auditorReview: getReviewDecisions(result)
        },
        history: state.history.filter((run) => {
          const sameDomain = run.domainId === result.domainId;
          const sameAudit = !result.auditContext || run.auditContext?.projectId === result.auditContext.projectId;
          return sameDomain && sameAudit;
        }).slice(0, 10)
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

function renderIssueDraft(draft, open) {
  return `
    <details class="agent-draft-card" ${open ? "open" : ""}>
      <summary class="agent-draft-header">
        <div>
          <h2>${escapeHtml(draft.agentName || "Issue Writing Agent")}</h2>
          <p>${escapeHtml(draft.issueSummary)}</p>
        </div>
        <span class="status-pill ${draft.enterpriseIssueRecord?.severity || "medium"}">${escapeHtml(draft.status || "draft_ready")}</span>
      </summary>
      <div class="agent-draft-body">
        <div class="agent-section-grid">
          ${renderAgentSection("Testing Performed", draft.testingPerformed)}
          ${renderAgentSection("Supporting Facts", draft.supportingFacts)}
        </div>
        ${renderAgentClaimTrace(draft.claimTrace)}
        <div class="agent-narrative">
          <strong>Root-cause hypothesis</strong>
          <p>${escapeHtml(draft.rootCause)}</p>
        </div>
        <div class="agent-narrative">
          <strong>Potential impact</strong>
          <p>${escapeHtml(draft.impact)}</p>
        </div>
        <div class="agent-narrative">
          <strong>Action Owner Message</strong>
          <p>${escapeHtml(draft.actionOwnerMessage)}</p>
        </div>
        ${renderIssueRecord(draft.enterpriseIssueRecord)}
        ${renderAgentMeta(draft)}
      </div>
    </details>
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

function renderReportDraft(draft, open) {
  return `
    <details class="agent-draft-card" ${open ? "open" : ""}>
      <summary class="agent-draft-header">
        <div>
          <h2>${escapeHtml(draft.reportTitle || "Control Assessment Report")}</h2>
          <p>${escapeHtml(draft.executiveSummary)}</p>
        </div>
        <span class="status-pill ${draft.overallRating === "effective" ? "low" : "medium"}">${escapeHtml(draft.overallRating)}</span>
      </summary>
      <div class="agent-draft-body">
        <div class="agent-section-grid">
          ${renderAgentSection("Assessment Scope", draft.assessmentScope)}
          ${renderAgentSection("Supporting Facts", draft.supportingFacts)}
        </div>
        ${renderAgentClaimTrace(draft.claimTrace)}
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
      </div>
    </details>
  `;
}

function renderAppendix(items) {
  const rows = Array.isArray(items) ? items : [];
  return `
    <details class="draft-trace report-appendix">
      <summary>Appendix: ${rows.length} controls evaluated</summary>
      <div class="agent-report-list">
        ${rows.map((item) => `
          <div class="agent-row compact">
            <b>${escapeHtml(item.ruleId)} - ${escapeHtml(item.control)}</b>
            <span>${escapeHtml(item.status)}</span>
            <p>${escapeHtml(item.evidence)}</p>
          </div>
        `).join("")}
      </div>
    </details>
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

function renderAgentClaimTrace(claims) {
  const rows = Array.isArray(claims) ? claims : [];
  if (!rows.length) return "";
  return `
    <details class="draft-trace">
      <summary>Why this draft says this</summary>
      <div class="draft-claims">
        ${rows.map((claim) => `
          <div class="draft-claim ${escapeHtml(claim.classification || "ai_hypothesis")}">
            <div class="claim-heading">
              <strong>${escapeHtml(String(claim.classification || "ai_hypothesis").replaceAll("_", " "))}</strong>
              <span>${escapeHtml(claim.confidence || "medium")} confidence</span>
            </div>
            <p>${escapeHtml(claim.statement)}</p>
            <small>${escapeHtml(claim.basis)}${claim.requiresConfirmation ? " | Confirmation required" : ""}</small>
          </div>
        `).join("")}
      </div>
    </details>
  `;
}

function renderAgentMeta(draft) {
  return `
    <div class="ai-meta">
      <span>Draft source: <b>${escapeHtml(draft.source || "rules_engine")}</b></span>
      <span>Generation status: <b>${escapeHtml(draft.agentStatus || "ready")}</b></span>
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

function scrollAssessmentToTop() {
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function scrollRuleEditorIntoView() {
  if (!window.matchMedia("(max-width: 1320px)").matches) return;
  window.requestAnimationFrame(() => {
    document.getElementById("rule-form").scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
