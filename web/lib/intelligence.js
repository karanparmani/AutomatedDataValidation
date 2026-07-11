const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const insightSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "gapSummary",
    "auditorRecommendations",
    "followUpQuestions",
    "additionalEvidenceNeeded",
    "riskSeverity",
    "confidence",
    "ruleReferences"
  ],
  properties: {
    gapSummary: {
      type: "string",
      description: "Plain-English explanation of the control gap or why evidence passed."
    },
    auditorRecommendations: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: { type: "string" }
    },
    followUpQuestions: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: { type: "string" }
    },
    additionalEvidenceNeeded: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: { type: "string" }
    },
    riskSeverity: {
      type: "string",
      enum: ["low", "medium", "high", "critical"]
    },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"]
    },
    ruleReferences: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: { type: "string" }
    }
  }
};

async function generateAuditIntelligence(validationResult, rules) {
  const fallback = buildFallbackInsights(validationResult);

  if (!process.env.OPENAI_API_KEY) {
    return {
      ...fallback,
      source: "rules_engine",
      status: "not_configured",
      message: "OpenAI intelligence is not configured in this environment."
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
        instructions: buildInstructions(),
        input: JSON.stringify(buildInsightContext(validationResult, rules)),
        text: {
          format: {
            type: "json_schema",
            name: "audit_intelligence",
            strict: true,
            schema: insightSchema
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ...fallback,
        source: "rules_engine",
        status: "ai_error",
        message: `AI insight generation failed with status ${response.status}.`,
        diagnostic: safeDiagnostic(errorText)
      };
    }

    const data = await response.json();
    const parsed = parseStructuredOutput(data);
    return {
      ...parsed,
      source: "openai",
      status: "ready",
      model: DEFAULT_MODEL
    };
  } catch (error) {
    return {
      ...fallback,
      source: "rules_engine",
      status: "ai_error",
      message: "AI insight generation failed; fallback guidance was returned.",
      diagnostic: safeDiagnostic(error.message)
    };
  }
}

function buildInstructions() {
  return [
    "You are an audit and risk validation copilot.",
    "Use the deterministic rule findings as the source of truth.",
    "Do not invent failed controls that are not present in the findings.",
    "Tie recommendations and follow-up questions to rule IDs when possible.",
    "Focus on practical auditor next steps, evidence requests, and process-owner questions.",
    "Keep the response concise, specific, and suitable for an internal audit workpaper."
  ].join(" ");
}

function buildInsightContext(validationResult, rules) {
  const relevantRuleIds = new Set((validationResult.findings || []).map((finding) => finding.ruleId));
  return {
    validation: {
      score: validationResult.score,
      status: validationResult.status,
      domainId: validationResult.domainId,
      domainName: validationResult.domainName,
      dataMode: validationResult.dataMode,
      inputProfile: validationResult.inputProfile,
      fileName: validationResult.fileName,
      findings: validationResult.findings,
      recommendations: validationResult.recommendations,
      enterpriseWriteback: validationResult.enterpriseWriteback,
      auditContext: validationResult.auditContext || null
    },
    activeRules: rules.filter((rule) => relevantRuleIds.has(rule.ruleId)),
    requestedOutput: "Recommendations, follow-up questions, and additional evidence needed for the auditor."
  };
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

function buildFallbackInsights(validationResult) {
  const failed = (validationResult.findings || []).filter((finding) => finding.status === "FAIL");
  const failedRuleIds = failed.map((finding) => finding.ruleId);
  const severity = inferSeverity(validationResult.score, validationResult.status);

  if (!failed.length) {
    return {
      gapSummary: "No control gaps were detected by the active validation rules.",
      auditorRecommendations: [
        "Retain the uploaded evidence with the workpaper and proceed with standard reviewer sign-off."
      ],
      followUpQuestions: [
        "Can the process owner confirm this evidence covers the complete population and testing period?"
      ],
      additionalEvidenceNeeded: [
        "Population completeness support and system-generated timestamp or export metadata."
      ],
      riskSeverity: severity,
      confidence: "medium",
      ruleReferences: ["PASSED_CONTROLS"]
    };
  }

  return {
    gapSummary: `The validation engine detected ${failed.length} control gap${failed.length === 1 ? "" : "s"} affecting ${failedRuleIds.join(", ")}.`,
    auditorRecommendations: failed.slice(0, 5).map((finding) => finding.remediation || `Remediate ${finding.ruleId}.`),
    followUpQuestions: failed.slice(0, 5).map((finding) => `Ask the process owner to explain the root cause for ${finding.ruleId} and whether the exception is isolated or systemic.`),
    additionalEvidenceNeeded: failed.slice(0, 5).map((finding) => `Updated evidence showing ${finding.title} has been remediated, plus approval or exception documentation if applicable.`),
    riskSeverity: severity,
    confidence: "medium",
    ruleReferences: failedRuleIds
  };
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

function safeDiagnostic(value) {
  return String(value || "")
    .replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]")
    .slice(0, 500);
}

module.exports = { generateAuditIntelligence };
