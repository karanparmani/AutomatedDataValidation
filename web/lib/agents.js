const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const claimTraceSchema = {
  type: "array",
  minItems: 1,
  maxItems: 12,
  items: {
    type: "object",
    additionalProperties: false,
    required: ["classification", "statement", "basis", "confidence", "requiresConfirmation"],
    properties: {
      classification: {
        type: "string",
        enum: ["observed_fact", "rule_conclusion", "ai_hypothesis", "user_confirmed"]
      },
      statement: { type: "string" },
      basis: { type: "string" },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
      requiresConfirmation: { type: "boolean" }
    }
  }
};

const issueSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "agentName",
    "status",
    "issueSummary",
    "testingPerformed",
    "rootCause",
    "impact",
    "actionOwnerMessage",
    "enterpriseIssueRecord",
    "supportingFacts",
    "claimTrace",
    "source"
  ],
  properties: {
    agentName: { type: "string" },
    status: { type: "string", enum: ["draft_ready", "no_issue_required"] },
    issueSummary: { type: "string" },
    testingPerformed: { type: "array", minItems: 1, maxItems: 8, items: { type: "string" } },
    rootCause: { type: "string" },
    impact: { type: "string" },
    actionOwnerMessage: { type: "string" },
    enterpriseIssueRecord: {
      type: "object",
      additionalProperties: false,
      required: [
        "title",
        "severity",
        "priority",
        "sourceSystem",
        "domain",
        "relatedRules",
        "requiredActions",
        "targetDueDate",
        "recordStatus"
      ],
      properties: {
        title: { type: "string" },
        severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
        priority: { type: "string", enum: ["P1", "P2", "P3", "P4"] },
        sourceSystem: { type: "string" },
        domain: { type: "string" },
        relatedRules: { type: "array", minItems: 1, maxItems: 12, items: { type: "string" } },
        requiredActions: { type: "array", minItems: 1, maxItems: 8, items: { type: "string" } },
        targetDueDate: { type: "string" },
        recordStatus: { type: "string" }
      }
    },
    supportingFacts: { type: "array", minItems: 1, maxItems: 8, items: { type: "string" } },
    claimTrace: claimTraceSchema,
    source: { type: "string", enum: ["openai", "rules_engine"] }
  }
};

const reportSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "agentName",
    "reportTitle",
    "overallRating",
    "executiveSummary",
    "assessmentScope",
    "findings",
    "supportingFacts",
    "actionPlans",
    "appendixControlsEvaluated",
    "managementAttention",
    "claimTrace",
    "source"
  ],
  properties: {
    agentName: { type: "string" },
    reportTitle: { type: "string" },
    overallRating: { type: "string", enum: ["effective", "needs_attention", "ineffective"] },
    executiveSummary: { type: "string" },
    assessmentScope: { type: "array", minItems: 1, maxItems: 8, items: { type: "string" } },
    findings: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "severity", "summary", "ruleReferences"],
        properties: {
          title: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
          summary: { type: "string" },
          ruleReferences: { type: "array", minItems: 1, maxItems: 12, items: { type: "string" } }
        }
      }
    },
    supportingFacts: { type: "array", minItems: 1, maxItems: 10, items: { type: "string" } },
    actionPlans: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["owner", "action", "dueDate", "successCriteria"],
        properties: {
          owner: { type: "string" },
          action: { type: "string" },
          dueDate: { type: "string" },
          successCriteria: { type: "string" }
        }
      }
    },
    appendixControlsEvaluated: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ruleId", "control", "status", "evidence"],
        properties: {
          ruleId: { type: "string" },
          control: { type: "string" },
          status: { type: "string" },
          evidence: { type: "string" }
        }
      }
    },
    managementAttention: { type: "array", minItems: 1, maxItems: 8, items: { type: "string" } },
    claimTrace: claimTraceSchema,
    source: { type: "string", enum: ["openai", "rules_engine"] }
  }
};

async function generateIssueDraft(validationResult, rules) {
  const fallback = buildFallbackIssue(validationResult);

  if (!hasFailedFindings(validationResult)) {
    return fallback;
  }

  return callAgent({
    fallback,
    schema: issueSchema,
    schemaName: "issue_writing_agent",
    instructions: [
      "You are an internal audit issue writing agent.",
      "Draft an issue record for action owners and an Enterprise Issue Management System.",
      "Use deterministic validation findings as source of truth.",
      "Do not invent additional failed controls, user populations, dates, or systems.",
      "Treat root cause and impact as hypotheses unless supplied evidence or auditor review confirms them.",
      "Use claimTrace to classify observed facts, rule conclusions, AI hypotheses, and user-confirmed judgments.",
      "Every claimTrace item must identify its evidence basis, confidence, and confirmation requirement.",
      "Write in professional stakeholder-ready language.",
      "Be concise, specific, and action oriented."
    ],
    context: buildIssueContext(validationResult, rules)
  });
}

async function generateAssessmentReport(validationResult, history, rules) {
  const fallback = buildFallbackReport(validationResult, history, rules);

  return callAgent({
    fallback,
    schema: reportSchema,
    schemaName: "assessment_report_agent",
    instructions: [
      "You are an executive audit report writing agent.",
      "Draft a concise control assessment report for executive management.",
      "Use only supplied validation results, rule findings, and recommendations.",
      "Separate findings, supporting facts, action plans, and appendix controls.",
      "Use claimTrace to distinguish observed facts, rule conclusions, AI hypotheses, and user-confirmed judgments.",
      "Do not present a root-cause hypothesis as confirmed unless the supplied auditor review confirms it.",
      "Do not overstate assurance. If history is limited, say the report is based on available runs.",
      "Write in clear risk and control language suitable for senior stakeholders."
    ],
    context: buildReportContext(validationResult, history, rules)
  });
}

async function callAgent({ fallback, schema, schemaName, instructions, context }) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ...fallback,
      source: "rules_engine",
      agentStatus: "not_configured",
      message: "OpenAI is not configured, so a deterministic rule-based draft was returned."
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        instructions: instructions.join(" "),
        input: JSON.stringify(context),
        text: {
          format: {
            type: "json_schema",
            name: schemaName,
            strict: true,
            schema
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ...fallback,
        source: "rules_engine",
        agentStatus: "ai_error",
        message: `Agent generation failed with status ${response.status}; fallback draft was returned.`,
        diagnostic: safeDiagnostic(errorText)
      };
    }

    const data = await response.json();
    return {
      ...parseStructuredOutput(data),
      source: "openai",
      agentStatus: "ready",
      model: DEFAULT_MODEL
    };
  } catch (error) {
    return {
      ...fallback,
      source: "rules_engine",
      agentStatus: "ai_error",
      message: "Agent generation failed; fallback draft was returned.",
      diagnostic: safeDiagnostic(error.message)
    };
  }
}

function buildIssueContext(validationResult, rules) {
  const failedRuleIds = failedFindings(validationResult).map((finding) => finding.ruleId);
  return {
    validation: summarizeValidation(validationResult),
    failedFindings: failedFindings(validationResult),
    auditorReview: validationResult.auditorReview || {},
    activeRules: rules.filter((rule) => failedRuleIds.includes(rule.ruleId)),
    requestedOutput: "Issue summary, testing performed, root cause, impact, action owner message, and Enterprise Issue Management System record draft."
  };
}

function buildReportContext(validationResult, history, rules) {
  const domainHistory = (history || [])
    .filter((run) => run.domainId === validationResult.domainId)
    .slice(0, 10)
    .map(summarizeValidation);
  const relevantRuleIds = new Set(
    [validationResult, ...(history || [])]
      .flatMap((run) => (run.findings || []).map((finding) => finding.ruleId))
  );

  return {
    currentValidation: summarizeValidation(validationResult),
    auditorReview: validationResult.auditorReview || {},
    recentDomainValidations: domainHistory,
    activeRules: rules.filter((rule) => relevantRuleIds.has(rule.ruleId)),
    requestedOutput: "Executive management report with concise summary, findings, supporting facts, action plans, and appendix of controls evaluated."
  };
}

function summarizeValidation(result) {
  return {
    id: result.id,
    score: result.score,
    status: result.status,
    domainId: result.domainId,
    domainName: result.domainName,
    fileName: result.fileName,
    fileType: result.fileType,
    dataMode: result.dataMode,
    inputProfile: result.inputProfile,
    processedAt: result.processedAt,
    recommendations: result.recommendations,
    enterpriseWriteback: result.enterpriseWriteback,
    auditorReview: result.auditorReview || {},
    auditContext: result.auditContext || null,
    findings: (result.findings || []).map((finding) => ({
      ruleId: finding.ruleId,
      title: finding.title,
      status: finding.status,
      evidence: finding.evidence,
      remediation: finding.remediation,
      weight: finding.weight
    }))
  };
}

function buildFallbackIssue(validationResult) {
  const failed = failedFindings(validationResult);
  const severity = inferSeverity(validationResult.score, validationResult.status);
  const sourceSystem = validationResult.enterpriseWriteback?.targetSystem || "Enterprise Issue Management";
  const auditContext = validationResult.auditContext;
  const issueSubject = auditContext?.controlName || validationResult.domainName || validationResult.domainId;

  if (!failed.length) {
    return {
      agentName: "Issue Writing Agent",
      status: "no_issue_required",
      issueSummary: "No issue draft is required because no failed controls were detected in the selected validation result.",
      testingPerformed: ["Reviewed validation findings and confirmed all active rules passed for the selected evidence."],
      rootCause: "No control failure was identified from the supplied evidence.",
      impact: "No issue impact was identified from the selected validation result.",
      actionOwnerMessage: "No action owner issue is required at this time. Retain evidence for reviewer sign-off.",
      enterpriseIssueRecord: {
        title: "No issue required",
        severity,
        priority: priorityForSeverity(severity),
        sourceSystem,
        domain: validationResult.domainName || validationResult.domainId || "Unknown domain",
        relatedRules: ["PASSED_CONTROLS"],
        requiredActions: ["Retain evidence and complete standard reviewer sign-off."],
        targetDueDate: targetDate(14),
        recordStatus: "Not submitted"
      },
      supportingFacts: [`Validation status ${validationResult.status} with score ${validationResult.score}.`],
      claimTrace: buildFallbackClaimTrace(validationResult, failed),
      source: "rules_engine"
    };
  }

  return {
    agentName: "Issue Writing Agent",
    status: "draft_ready",
    issueSummary: `${failed.length} control exception${failed.length === 1 ? "" : "s"} detected in ${issueSubject}.`,
    testingPerformed: [
      `Validated ${validationResult.fileName} against active standard and domain rules.`,
      `Reviewed failed rule evidence for ${failed.map((finding) => finding.ruleId).join(", ")}.`,
      `Confirmed validation disposition of ${validationResult.status} with score ${validationResult.score}.`,
      ...(auditContext ? [`Mapped the result to ${auditContext.projectName} / ${auditContext.testName}.`] : [])
    ],
    rootCause: `Process owner follow-up is required to determine whether the ${issueSubject} exception resulted from configuration drift, incomplete evidence, or an approved exception not included in the submission.`,
    impact: `The exception may reduce confidence that ${issueSubject} is operating as intended and may require remediation evidence before management reliance.`,
    actionOwnerMessage: `Please review the ${issueSubject} evidence for ${failed.map((finding) => finding.ruleId).join(", ")} and provide root cause, remediation plan, owner, target date, and updated evidence.`,
    enterpriseIssueRecord: {
      title: `${issueSubject}: ${failed[0].title} exception`,
      severity,
      priority: priorityForSeverity(severity),
      sourceSystem,
      domain: validationResult.domainName || validationResult.domainId || "Unknown domain",
      relatedRules: failed.map((finding) => finding.ruleId),
      requiredActions: failed.map((finding) => finding.remediation || `Remediate ${finding.ruleId}.`),
      targetDueDate: targetDate(severity === "high" || severity === "critical" ? 30 : 45),
      recordStatus: "Draft"
    },
    supportingFacts: failed.map((finding) => `${finding.ruleId}: ${finding.evidence}`),
    claimTrace: buildFallbackClaimTrace(validationResult, failed),
    source: "rules_engine"
  };
}

function buildFallbackReport(validationResult, history, rules) {
  const auditContext = validationResult.auditContext;
  const reportSubject = auditContext?.projectName || validationResult.domainName || "The domain";
  const domainRuns = (history || []).filter((run) => {
    const sameDomain = run.domainId === validationResult.domainId;
    const sameAudit = !auditContext || run.auditContext?.projectId === auditContext.projectId;
    return sameDomain && sameAudit;
  });
  const runs = domainRuns.length ? domainRuns : [validationResult];
  const failed = runs.flatMap((run) => failedFindings(run).map((finding) => ({ ...finding, fileName: run.fileName })));
  const severity = inferSeverity(validationResult.score, validationResult.status);
  const relevantRules = rules.filter((rule) => rule.domainId === "standard_qa" || rule.domainId === validationResult.domainId);

  return {
    agentName: "Report Writing Agent",
    reportTitle: `${auditContext?.projectName || validationResult.domainName || "Control"} Assessment Summary`,
    overallRating: failed.length ? validationResult.score < 70 ? "ineffective" : "needs_attention" : "effective",
    executiveSummary: failed.length
      ? `${reportSubject} identified ${failed.length} exception${failed.length === 1 ? "" : "s"} across ${runs.length} available validation run${runs.length === 1 ? "" : "s"}. Management attention is required for remediation and evidence refresh.`
      : `${reportSubject} did not identify failed controls across the available validation result set.`,
    assessmentScope: [
      ...(auditContext ? [
        `Audit project: ${auditContext.projectName}`,
        `Process / risk: ${auditContext.processName} / ${auditContext.riskName}`,
        `Control test: ${auditContext.controlName} / ${auditContext.testName} (${auditContext.testType})`
      ] : []),
      `Domain: ${validationResult.domainName || validationResult.domainId}`,
      `Current evidence: ${validationResult.fileName}`,
      `Available validation runs reviewed: ${runs.length}`,
      `Current score and status: ${validationResult.score} / ${validationResult.status}`
    ],
    findings: failed.length
      ? failed.slice(0, 10).map((finding) => ({
        title: finding.title,
        severity,
        summary: `${finding.ruleId} failed in ${finding.fileName}: ${finding.evidence}`,
        ruleReferences: [finding.ruleId]
      }))
      : [{
        title: "No failed controls detected",
        severity: "low",
        summary: "All evaluated controls passed for the selected evidence.",
        ruleReferences: ["PASSED_CONTROLS"]
      }],
    supportingFacts: runs.slice(0, 8).map((run) => `${run.fileName}: ${run.status} with score ${run.score}.`),
    actionPlans: failed.length
      ? failed.slice(0, 10).map((finding) => ({
        owner: "Control owner",
        action: finding.remediation || `Remediate ${finding.ruleId}.`,
        dueDate: targetDate(45),
        successCriteria: `Updated evidence demonstrates ${finding.title} is operating effectively.`
      }))
      : [{
        owner: "Audit reviewer",
        action: "Complete reviewer sign-off and retain evidence.",
        dueDate: targetDate(14),
        successCriteria: "Assessment workpaper is approved with supporting evidence retained."
      }],
    appendixControlsEvaluated: relevantRules.map((rule) => {
      const finding = (validationResult.findings || []).find((item) => item.ruleId === rule.ruleId);
      return {
        ruleId: rule.ruleId,
        control: rule.title,
        status: finding ? finding.status : "NOT_RUN",
        evidence: finding ? finding.evidence : "Control included in active catalog but not present in selected result."
      };
    }),
    managementAttention: failed.length
      ? [
        "Confirm root cause and whether the exception is isolated or systemic.",
        "Assign action owner and remediation target date.",
        "Provide refreshed evidence after remediation."
      ]
      : ["No immediate management escalation is indicated from the available validation evidence."],
    claimTrace: buildFallbackClaimTrace(validationResult, failedFindings(validationResult)),
    source: "rules_engine"
  };
}

function buildFallbackClaimTrace(validationResult, findings) {
  const selectedFindings = (findings || []).slice(0, 4);
  const auditorReview = validationResult.auditorReview || {};

  if (!selectedFindings.length) {
    return [
      {
        classification: "observed_fact",
        statement: `${validationResult.fileName} completed validation with status ${validationResult.status} and score ${validationResult.score}.`,
        basis: `Validation result ${validationResult.id || validationResult.fileName}`,
        confidence: "high",
        requiresConfirmation: false
      },
      {
        classification: "rule_conclusion",
        statement: "No active control test returned a failed finding for the supplied evidence.",
        basis: `${(validationResult.findings || []).length} configured control tests`,
        confidence: "high",
        requiresConfirmation: false
      }
    ];
  }

  const observedClaims = selectedFindings.map((finding) => ({
    classification: "observed_fact",
    statement: finding.evidence,
    basis: `Evidence ${validationResult.fileName}; rule ${finding.ruleId}`,
    confidence: "high",
    requiresConfirmation: false
  }));
  const ruleClaims = selectedFindings.map((finding) => ({
    classification: "rule_conclusion",
    statement: `${finding.title} did not satisfy the configured control test.`,
    basis: `Deterministic rule result ${finding.ruleId}`,
    confidence: "high",
    requiresConfirmation: false
  }));
  const reviewClaims = selectedFindings
    .filter((finding) => auditorReview[finding.ruleId])
    .slice(0, 2)
    .map((finding) => ({
      classification: "user_confirmed",
      statement: auditorReview[finding.ruleId] === "confirmed"
        ? `The auditor confirmed the ${finding.ruleId} exception.`
        : `The auditor retained ${finding.ruleId} for process-owner follow-up.`,
      basis: `Recorded auditor decision for ${finding.ruleId}`,
      confidence: "high",
      requiresConfirmation: false
    }));
  const hypothesisClaim = {
    classification: "ai_hypothesis",
    statement: "Potential causes include configuration drift, incomplete evidence, or an approved exception not included with the submission.",
    basis: "Plausible causes inferred from the failed control findings; no direct root-cause evidence supplied",
    confidence: "low",
    requiresConfirmation: true
  };

  return [...observedClaims, ...ruleClaims, ...reviewClaims, hypothesisClaim];
}

function failedFindings(validationResult) {
  return (validationResult.findings || []).filter((finding) => finding.status === "FAIL");
}

function hasFailedFindings(validationResult) {
  return failedFindings(validationResult).length > 0;
}

function inferSeverity(score, status) {
  if (status === "REMEDIATION_REQUIRED" || score < 70) {
    return score < 50 ? "critical" : "high";
  }
  if (status === "WARNING" || score < 90) {
    return "medium";
  }
  return "low";
}

function priorityForSeverity(severity) {
  return {
    critical: "P1",
    high: "P2",
    medium: "P3",
    low: "P4"
  }[severity] || "P3";
}

function targetDate(daysFromNow) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

function parseStructuredOutput(data) {
  if (data.output_text) {
    return JSON.parse(data.output_text);
  }

  const message = (data.output || []).find((item) => item.type === "message");
  const textItem = message && (message.content || []).find((item) => item.type === "output_text");
  if (textItem && textItem.text) {
    return JSON.parse(textItem.text);
  }

  throw new Error("No structured output text returned by model.");
}

function safeDiagnostic(value) {
  return String(value || "")
    .replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]")
    .slice(0, 500);
}

module.exports = { generateAssessmentReport, generateIssueDraft };
