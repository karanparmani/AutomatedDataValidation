const auditModules = [
  {
    id: "AUD-2026-IAM",
    name: "Identity & Access Management Audit",
    status: "Fieldwork",
    owner: "Technology Audit",
    period: "Q1 2026",
    objective: "Assess whether logical access controls prevent unauthorized production access.",
    processes: [
      {
        id: "PRC-IAM-01",
        name: "Identity Lifecycle & Access Administration",
        risks: [
          {
            id: "RSK-IAM-01",
            name: "Unauthorized production access",
            rating: "High",
            controls: [
              {
                id: "CTL-IAM-01",
                name: "MFA enforcement for active accounts",
                owner: "Identity Operations",
                tests: [
                  {
                    id: "TEST-IAM-DE-01",
                    name: "MFA control design review",
                    type: "Design Effectiveness",
                    domainId: "cybersecurity",
                    ruleIds: ["CYBER_01_HEADERS", "CYBER_02_MFA_STATE"]
                  },
                  {
                    id: "TEST-IAM-OE-01",
                    name: "Active account MFA operating test",
                    type: "Operating Effectiveness",
                    domainId: "cybersecurity",
                    ruleIds: ["CYBER_01_HEADERS", "CYBER_02_MFA_STATE"]
                  }
                ]
              },
              {
                id: "CTL-IAM-02",
                name: "Inactive account deprovisioning",
                owner: "Directory Services",
                tests: [
                  {
                    id: "TEST-IAM-OE-02",
                    name: "Inactive account population test",
                    type: "Operating Effectiveness",
                    domainId: "cybersecurity",
                    ruleIds: ["CYBER_03_INACTIVE_ACC"]
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    issues: [],
    reports: []
  },
  {
    id: "AUD-2026-CREDIT",
    name: "Consumer Credit Underwriting Audit",
    status: "Fieldwork",
    owner: "Credit Risk Audit",
    period: "Q1 2026",
    objective: "Assess compliance with underwriting limits, verification, and approval requirements.",
    processes: [
      {
        id: "PRC-CR-01",
        name: "Credit Decisioning & Approval",
        risks: [
          {
            id: "RSK-CR-01",
            name: "Applications approved outside credit policy",
            rating: "High",
            controls: [
              {
                id: "CTL-CR-01",
                name: "Underwriting policy validation",
                owner: "Consumer Underwriting",
                tests: [
                  {
                    id: "TEST-CR-DE-01",
                    name: "Underwriting rule design review",
                    type: "Design Effectiveness",
                    domainId: "credit_risk",
                    ruleIds: ["CREDIT_01_DTI_LIMIT", "CREDIT_02_INC_VERIFY", "CREDIT_03_APP_OVERRIDE"]
                  },
                  {
                    id: "TEST-CR-OE-01",
                    name: "Underwriting population operating test",
                    type: "Operating Effectiveness",
                    domainId: "credit_risk",
                    ruleIds: ["CREDIT_01_DTI_LIMIT", "CREDIT_02_INC_VERIFY", "CREDIT_03_APP_OVERRIDE"]
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    issues: [],
    reports: []
  },
  {
    id: "AUD-2026-RESILIENCE",
    name: "Technology Resilience Review",
    status: "Planning",
    owner: "Infrastructure Audit",
    period: "2026",
    objective: "Assess production backup, recovery, and logging safeguards.",
    processes: [
      {
        id: "PRC-TECH-01",
        name: "Production Operations & Recovery",
        risks: [
          {
            id: "RSK-TECH-01",
            name: "Production services cannot be recovered or investigated",
            rating: "Medium",
            controls: [
              {
                id: "CTL-TECH-01",
                name: "Backup completion and production logging",
                owner: "Platform Operations",
                tests: [
                  {
                    id: "TEST-TECH-OE-01",
                    name: "Backup and logging operating test",
                    type: "Operating Effectiveness",
                    domainId: "app_technology",
                    ruleIds: ["APP_01_BACKUP_FREQ", "APP_02_LOGS_LEVEL"]
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    issues: [],
    reports: []
  }
];

let issueSequence = 1001;
let reportSequence = 501;

function getAuditModules() {
  return clone(auditModules);
}

function resolveAuditContext(projectId, testId) {
  const project = auditModules.find((item) => item.id === projectId);
  if (!project) return null;

  for (const process of project.processes) {
    for (const risk of process.risks) {
      for (const control of risk.controls) {
        const test = control.tests.find((item) => item.id === testId);
        if (test) {
          return {
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
            ruleIds: [...test.ruleIds]
          };
        }
      }
    }
  }

  return null;
}

function sendIssueToAuditModule(projectId, input) {
  const project = requireProject(projectId);
  const validationResult = input.validationResult || {};
  const draft = input.issueDraft || {};
  const requestedContext = input.auditContext || validationResult.auditContext || {};
  const context = resolveAuditContext(projectId, requestedContext.testId);
  if (!context) {
    throw new Error("A valid audit project and control test are required.");
  }

  const failedFindings = (validationResult.findings || []).filter((finding) => finding.status === "FAIL");
  if (!failedFindings.length) {
    throw new Error("Only failed control results can be tagged with an issue.");
  }

  const existingIssue = project.issues.find((issue) => issue.validationId && issue.validationId === validationResult.id);
  if (existingIssue) {
    return { record: clone(existingIssue), projects: getAuditModules() };
  }

  const record = {
    id: `ISS-2026-${issueSequence++}`,
    projectId: project.id,
    status: "Draft",
    title: draft.enterpriseIssueRecord?.title || draft.issueSummary || `${context.controlName} exception`,
    severity: draft.enterpriseIssueRecord?.severity || "medium",
    priority: draft.enterpriseIssueRecord?.priority || "P3",
    summary: draft.issueSummary || "Control exception identified by automated testing.",
    rootCauseHypothesis: draft.rootCause || "Process-owner confirmation required.",
    potentialImpact: draft.impact || "Potential impact requires auditor review.",
    actionOwnerMessage: draft.actionOwnerMessage || "Provide remediation ownership and updated evidence.",
    requiredActions: clone(draft.enterpriseIssueRecord?.requiredActions || validationResult.recommendations || []),
    relatedRuleIds: failedFindings.map((finding) => finding.ruleId),
    failedControls: failedFindings.map((finding) => ({
      ruleId: finding.ruleId,
      title: finding.title,
      evidence: finding.evidence
    })),
    auditContext: context,
    validationId: validationResult.id,
    workpaperId: validationResult.enterpriseWriteback?.workpaperId,
    score: validationResult.score,
    source: draft.source || "rules_engine",
    createdAt: new Date().toISOString()
  };

  project.issues.unshift(record);
  project.reports
    .filter((report) => report.validationId === validationResult.id)
    .forEach((report) => {
      if (!report.relatedIssueIds.includes(record.id)) {
        report.relatedIssueIds.unshift(record.id);
      }
    });
  return { record: clone(record), projects: getAuditModules() };
}

function sendReportToAuditModule(projectId, input) {
  const project = requireProject(projectId);
  const validationResult = input.validationResult || {};
  const draft = input.reportDraft || {};
  const requestedContext = input.auditContext || validationResult.auditContext || {};
  const context = resolveAuditContext(projectId, requestedContext.testId);
  if (!context) {
    throw new Error("A valid audit project and control test are required.");
  }

  const existingReport = project.reports.find((report) => report.validationId && report.validationId === validationResult.id);
  if (existingReport) {
    return { record: clone(existingReport), projects: getAuditModules() };
  }

  const record = {
    id: `RPT-2026-${reportSequence++}`,
    projectId: project.id,
    status: "Draft",
    title: draft.reportTitle || `${project.name} Draft Report`,
    overallRating: draft.overallRating || "needs_attention",
    executiveSummary: draft.executiveSummary || "Assessment report draft generated from available control testing.",
    findings: clone(draft.findings || []),
    actionPlans: clone(draft.actionPlans || []),
    managementAttention: clone(draft.managementAttention || []),
    appendixControlsEvaluated: clone(draft.appendixControlsEvaluated || []),
    auditContext: context,
    validationId: validationResult.id,
    relatedIssueIds: project.issues.map((issue) => issue.id),
    source: draft.source || "rules_engine",
    createdAt: new Date().toISOString()
  };

  project.reports.unshift(record);
  return { record: clone(record), projects: getAuditModules() };
}

function requireProject(projectId) {
  const project = auditModules.find((item) => item.id === projectId);
  if (!project) {
    throw new Error("Audit project not found.");
  }
  return project;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = {
  getAuditModules,
  resolveAuditContext,
  sendIssueToAuditModule,
  sendReportToAuditModule
};
