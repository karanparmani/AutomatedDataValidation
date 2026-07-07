# Automated Data Validation Web App

This refactor turns the Android proof of concept into a browser demo and REST intelligence layer that can sit between an enterprise application and an audit/GRC workflow.

## Dynamic Validation Workflow

- Accept structured evidence such as CSV, TSV, JSON, and spreadsheet-export text.
- Accept unstructured evidence such as emails, policy memos, logs, and narrative workpaper notes.
- Validate the submitted input against active Tier-1 and Tier-2 rules.
- Edit rule definitions from the Rules view without changing code.
- Add configurable matchers for `contains`, `not_contains`, `regex`, `date_window`, and `min_length`.
- Reset the rule catalog back to the seeded defaults.
- Generate AI auditor guidance with remediation recommendations, follow-up questions, and additional evidence requests when `OPENAI_API_KEY` is configured.
- Generate self-service agent drafts for failed-control issue records and executive control assessment reports.

## Run Locally

```bash
cd web
npm start
```

Open `http://localhost:3000`.

## API

### Validate Evidence

```http
POST /api/validate
Content-Type: application/json
```

```json
{
  "sourceSystem": "AuditBoard",
  "workpaperId": "WP-2026-184",
  "domainId": "cybersecurity",
  "dataMode": "structured",
  "fileName": "AD_Access_Dump_Exceptions_Q1.csv",
  "fileType": "CSV",
  "content": "Target Host Environment: Production (PRD-IP9)\nControl Operational Date: 2026-01-20\n..."
}
```

The response includes the evidence score, status, rule findings, remediation recommendations, and a writeback payload for the source system.

When `OPENAI_API_KEY` is configured on the server, validation responses also include `aiInsights`.

```json
{
  "aiInsights": {
    "gapSummary": "The validation engine detected an MFA exception...",
    "auditorRecommendations": ["..."],
    "followUpQuestions": ["..."],
    "additionalEvidenceNeeded": ["..."],
    "riskSeverity": "medium",
    "confidence": "high",
    "ruleReferences": ["CYBER_02_MFA_STATE"],
    "source": "openai",
    "status": "ready"
  }
}
```

If the API key is absent or the AI call fails, the app returns fallback rule-based guidance and keeps the validation workflow available.

### Self-Service Agents

```http
POST /api/agents/issue
POST /api/agents/report
Content-Type: application/json
```

```json
{
  "validationResult": {
    "score": 70,
    "status": "WARNING",
    "domainId": "cybersecurity",
    "findings": []
  },
  "history": []
}
```

- The Issue Writing Agent drafts an issue summary, testing performed, root cause, impact, action-owner message, and Enterprise Issue Management record.
- The Report Writing Agent drafts an executive assessment summary, findings, supporting facts, action plans, and appendix of controls evaluated.
- Both agents use `OPENAI_API_KEY` when available and return deterministic fallback drafts when the key is absent or the AI call fails.

### Rule Management

```http
GET /api/rules
POST /api/rules
PUT /api/rules/:ruleId
DELETE /api/rules/:ruleId
POST /api/rules/reset
POST /api/intelligence
POST /api/agents/issue
POST /api/agents/report
```

Example configurable rule:

```json
{
  "domainId": "cybersecurity",
  "ruleId": "CUSTOM_NO_FALSE_MFA",
  "title": "No false MFA values",
  "description": "Remove FALSE MFA values before approval.",
  "ruleType": "value_assertion",
  "targetField": "MFA Enabled",
  "expectedValue": "FALSE",
  "matchMode": "not_contains",
  "weight": 20,
  "isActive": true
}
```

## Enterprise Integration Shape

- Enterprise app uploads evidence or extracted text to `POST /api/validate`.
- The validation layer applies Tier-1 standard QA and Tier-2 domain-specific controls.
- The API returns a disposition payload that can be written back to AuditBoard, ServiceNow GRC, Archer, Jira, or a custom workflow.
- The current implementation uses a deterministic policy engine for reliable demos. A managed LLM or document OCR provider can be added behind the same endpoint without changing the enterprise contract.

## Hosting

### Render

1. Push this repository to GitHub.
2. In Render, create a new Blueprint or Web Service from the repository.
3. If using the included root-level `render.yaml`, Render will deploy the `web` directory as a Node web service.
4. If configuring manually, set root directory to `web`, build command to `npm install`, start command to `npm start`, and health check path to `/api/health`.
5. Add server-side environment variables:
   - `NODE_ENV=production`
   - `OPENAI_API_KEY=<your OpenAI API key>`
   - Optional: `OPENAI_MODEL=gpt-4o-mini`

The included root-level `render.yaml` is ready for Render Blueprint configuration.

### Docker

```bash
cd web
docker build -t automated-data-validation .
docker run -p 3000:3000 automated-data-validation
```

The Docker image works for Azure App Service, AWS App Runner, Google Cloud Run, Railway, Fly.io, and other container hosts.
