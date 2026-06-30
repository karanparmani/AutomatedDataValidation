const domains = [
  {
    id: "cybersecurity",
    displayName: "Cybersecurity Access",
    shortName: "Cyber",
    color: "#0f766e",
    description: "Access control reviews, MFA compliance, Active Directory status audits, and session timeout checks."
  },
  {
    id: "credit_risk",
    displayName: "Credit Risk Underwriting",
    shortName: "Credit",
    color: "#b45309",
    description: "Underwriting parameter matching, credit policy validations, risk rating verification, and approval overrides."
  },
  {
    id: "market_risk",
    displayName: "Market Risk & VaR",
    shortName: "Market",
    color: "#2563eb",
    description: "Value-at-Risk parameters, rate shocking tables, hedging validations, and trading desk compliance."
  },
  {
    id: "liquidity_risk",
    displayName: "Liquidity & Stress",
    shortName: "Liquidity",
    color: "#7c3aed",
    description: "LCR reports, stress testing scenario validations, cash flow limits, and banking book checks."
  },
  {
    id: "app_technology",
    displayName: "Application Tech Controls",
    shortName: "App Tech",
    color: "#be123c",
    description: "Server logs, backup validation schedules, database change controls, and system versions."
  }
];

const rules = [
  {
    domainId: "standard_qa",
    ruleId: "STD_EMPTY_FILE",
    title: "Evidence Size & Completeness Check",
    description: "Checks that the submitted evidence document is fully legible and is not a zero-size or corrupt placeholder.",
    ruleType: "presence",
    targetField: "Evidence Contents",
    expectedValue: "Has Extractable Content",
    weight: 15,
    isActive: true
  },
  {
    domainId: "standard_qa",
    ruleId: "STD_DATE_RANGE",
    title: "Testing Period Range Validation",
    description: "Verifies extracted audit timestamps reside strictly within the active Q1 2026 fiscal control testing window.",
    ruleType: "date_window",
    targetField: "Control Operational Date",
    expectedValue: "2026-01-01 to 2026-03-31",
    weight: 25,
    isActive: true
  },
  {
    domainId: "standard_qa",
    ruleId: "STD_HOST_SCOPE",
    title: "Authorized System Scope Check",
    description: "Verifies the host environment or system name in headers matches authorized production nodes.",
    ruleType: "value_assertion",
    targetField: "Target Host Environment",
    expectedValue: "Production (PRD-IP9)",
    weight: 15,
    isActive: true
  },
  {
    domainId: "cybersecurity",
    ruleId: "CYBER_01_HEADERS",
    title: "Access Grid Layout Validation",
    description: "Verifies that the access ledger contains user, status, MFA, and login attributes.",
    ruleType: "presence",
    targetField: "Grid Columns",
    expectedValue: "User ID, Status, MFA Enabled, Last Login Date",
    weight: 20,
    isActive: true
  },
  {
    domainId: "cybersecurity",
    ruleId: "CYBER_02_MFA_STATE",
    title: "MFA Compliance Audit",
    description: "Scans MFA state in access extracts and narratives to identify active accounts without MFA.",
    ruleType: "value_assertion",
    targetField: "MFA Enabled Status",
    expectedValue: "TRUE / Yes",
    weight: 30,
    isActive: true
  },
  {
    domainId: "cybersecurity",
    ruleId: "CYBER_03_INACTIVE_ACC",
    title: "Inactive Account Proscription",
    description: "Checks whether inactive and terminated accounts remain outside active access scope.",
    ruleType: "value_assertion",
    targetField: "Inactive Dormancy Scope",
    expectedValue: "Last Login > 90 Days Ago",
    weight: 20,
    isActive: true
  },
  {
    domainId: "credit_risk",
    ruleId: "CREDIT_01_DTI_LIMIT",
    title: "Debt-to-Income Regulatory Cap",
    description: "Ensures customer debt-to-income rates do not exceed the underwriting policy ceiling.",
    ruleType: "value_assertion",
    targetField: "Debt-to-Income (DTI)",
    expectedValue: "<= 43.0%",
    weight: 30,
    isActive: true
  },
  {
    domainId: "credit_risk",
    ruleId: "CREDIT_02_INC_VERIFY",
    title: "Income Source Verification",
    description: "Ensures every approved borrower has verified income source evidence.",
    ruleType: "value_assertion",
    targetField: "Income Verification Flag",
    expectedValue: "Verified",
    weight: 25,
    isActive: true
  },
  {
    domainId: "credit_risk",
    ruleId: "CREDIT_03_APP_OVERRIDE",
    title: "Authority Approval Sign-off",
    description: "Confirms exception applicants with low credit scores have a valid risk committee approval hash.",
    ruleType: "value_assertion",
    targetField: "Senior Underwriter Override Key",
    expectedValue: "Valid SRO Signing Hash",
    weight: 20,
    isActive: true
  },
  {
    domainId: "market_risk",
    ruleId: "MKT_01_VAR_LIMIT",
    title: "Daily VaR Breaches Check",
    description: "Asserts trading losses and VaR exception counts remain within market risk policy thresholds.",
    ruleType: "value_assertion",
    targetField: "VaR Daily Limit Exception Count",
    expectedValue: "0 Breaches",
    weight: 35,
    isActive: true
  },
  {
    domainId: "market_risk",
    ruleId: "MKT_02_SHOCK_PARAMS",
    title: "Rate Shock Matrix Completeness",
    description: "Confirms stress tests include the complete standard shock grid.",
    ruleType: "presence",
    targetField: "Shock Curves Evaluated",
    expectedValue: "Full Shock Grid Populated",
    weight: 20,
    isActive: true
  },
  {
    domainId: "liquidity_risk",
    ruleId: "LIQ_01_LCR_RATIO",
    title: "LCR Compliance Floor",
    description: "Verifies Liquidity Coverage Ratio reports show daily ratios above the regulatory floor.",
    ruleType: "value_assertion",
    targetField: "Liquidity Coverage Ratio (LCR)",
    expectedValue: ">= 100%",
    weight: 40,
    isActive: true
  },
  {
    domainId: "liquidity_risk",
    ruleId: "LIQ_02_CASH_CAP",
    title: "Cash Inflow Capture Cap",
    description: "Checks corporate inflow limits during stressed liquidity runs.",
    ruleType: "value_assertion",
    targetField: "Stressed Liquidity Cap Ratio",
    expectedValue: "<= 75%",
    weight: 25,
    isActive: true
  },
  {
    domainId: "app_technology",
    ruleId: "APP_01_BACKUP_FREQ",
    title: "Continuous Backup Schedule Verification",
    description: "Confirms production backups were triggered and completed successfully inside policy cadence.",
    ruleType: "value_assertion",
    targetField: "Last Backup Run Duration",
    expectedValue: "SUCCESS / Within 7 Days",
    weight: 35,
    isActive: true
  },
  {
    domainId: "app_technology",
    ruleId: "APP_02_LOGS_LEVEL",
    title: "Production Debug Log Suppression",
    description: "Audits production logger settings to suppress verbose/debug parameters.",
    ruleType: "value_assertion",
    targetField: "Logging Production Levels",
    expectedValue: "INFO or ERROR Only (No DEBUG)",
    weight: 20,
    isActive: true
  }
];

const templates = [
  {
    id: "CYBER_PASS",
    domainId: "cybersecurity",
    title: "AD User Directory Pull",
    resultHint: "Compliant",
    fileName: "AD_User_Provisioning_Q1_2026.csv",
    fileType: "CSV",
    fileSizeKb: 8,
    isStructured: true,
    description: "LDAP export that satisfies scope, period, and MFA controls.",
    content: `Target Host Environment: Production (PRD-IP9)
Control Operational Date: 2026-02-14
Scope division: Global Corp Directory Access Pull
Author: S. AccessManager

User ID, Status, MFA EnabledStatus, Last Login Date
U101, Active, TRUE, 2026-02-10
U102, Active, TRUE, 2026-02-12
U103, Inactive, TRUE, 2025-11-05
U104, Terminated, FALSE, 2024-05-12
U105, Active, TRUE, 2026-02-14`
  },
  {
    id: "CYBER_FAIL",
    domainId: "cybersecurity",
    title: "AD Access Logs",
    resultHint: "MFA Exceptions",
    fileName: "AD_Access_Dump_Exceptions_Q1.csv",
    fileType: "CSV",
    fileSizeKb: 12,
    isStructured: true,
    description: "Active accounts show MFA disabled.",
    content: `Target Host Environment: Production (PRD-IP9)
Control Operational Date: 2026-01-20
Scope division: Domain Main Access Audit
Author: Webhook-Sync

User ID, Status, MFA EnabledStatus, Last Login Date
U201, Active, TRUE, 2026-01-18
U202, Inactive, TRUE, 2025-12-19
U203, Active, FALSE, 2026-01-15
U204, Active, FALSE, 2026-01-20`
  },
  {
    id: "CYBER_UNSTRUCTURED_FAIL",
    domainId: "cybersecurity",
    title: "Cybersec Incident Email",
    resultHint: "Narrative Exception",
    fileName: "AD_MFA_Exception_Email.txt",
    fileType: "TXT",
    fileSizeKb: 4,
    isStructured: false,
    description: "Email thread describing active users without MFA.",
    content: `Subject: EXCEPTION LOG: Production Server Access Breach
Date: 2026-01-22
Target Host Environment: Production (PRD-IP9)
Control Operational Date: 2026-01-22

During our daily audit of production host PRD-IP9, two users (U203 and U204) logged in from external nodes without MFA Enabled status. Their MFA status was flagged as FALSE during an active session on January 15, 2026.`
  },
  {
    id: "CREDIT_PASS",
    domainId: "credit_risk",
    title: "Credit Portfolio Log",
    resultHint: "Compliant",
    fileName: "Credit_Underwriting_Register_Q1_2026.xlsx",
    fileType: "XLSX",
    fileSizeKb: 148,
    isStructured: true,
    description: "High-risk applicant includes valid SRO approval.",
    content: `Target Host Environment: Production (PRD-IP9)
Control Operational Date: 2026-01-15
Auditor Audit-ID: AUD-CR-55

Applicant ID | Debt-to-Income (DTI) | Income Verification Flag | Credit Score | Senior Underwriter Override Key
APP-5001 | 32.5% | Verified | 720 | N/A
APP-5002 | 41.0% | Verified | 650 | N/A
APP-5003 | 25.0% | Verified | 590 | Valid SRO Signing Hash: AUTH-908B1`
  },
  {
    id: "CREDIT_FAIL",
    domainId: "credit_risk",
    title: "Underwriting Register",
    resultHint: "Policy Breaches",
    fileName: "Credit_Underwriting_Policy_Outages.xlsx",
    fileType: "XLSX",
    fileSizeKb: 95,
    isStructured: true,
    description: "DTI, income verification, and override defects.",
    content: `Target Host Environment: Production (PRD-IP9)
Control Operational Date: 2026-01-20
Author: UnderwritingDesk

Applicant ID | Debt-to-Income (DTI) | Income Verification Flag | Credit Score | Senior Underwriter Override Key
APP-6001 | 48.5% | Verified | 750 | N/A
APP-6002 | 39.0% | Unverified | 680 | N/A
APP-6003 | 29.5% | Verified | 550 | None`
  },
  {
    id: "MARKET_FAIL",
    domainId: "market_risk",
    title: "Trading Daily Loss Report",
    resultHint: "VaR Breach",
    fileName: "VaR_Exceptions_Daily_Losses.csv",
    fileType: "CSV",
    fileSizeKb: 42,
    isStructured: true,
    description: "Severe losses and daily VaR limit breaches.",
    content: `Target Host Environment: Production (PRD-IP9)
Control Operational Date: 2026-03-01
Shock Curves Evaluated: Full Shock Grid Populated
Author: NetRiskEngine

Business Date | Desk Name | Daily Gain / Loss | VaR Limit Breach | Net Exposure
2026-02-27 | Fixed Income Desk | -$5,200,000 | 1 Breach | $145M
2026-02-28 | FX Risk Desk | -$4,800,000 | 1 Breach | $112M`
  },
  {
    id: "LIQUIDITY_FAIL",
    domainId: "liquidity_risk",
    title: "Daily Liquidity Ratios",
    resultHint: "LCR Breach",
    fileName: "LCR_Liquidity_Risk_Q1_Breach.csv",
    fileType: "CSV",
    fileSizeKb: 88,
    isStructured: true,
    description: "LCR falls below the 100% floor.",
    content: `Target Host Environment: Production (PRD-IP9)
Control Operational Date: 2026-03-10
Author: CashMgmtDept

Date | High Quality Liquid Assets (HQLA) | Net Outflows | Liquidity Coverage Ratio (LCR) | Cash Inflow Cap Status
2026-03-08 | $120,000,000 | $130,000,000 | 92.3% | Within Limits
2026-03-09 | $140,000,000 | $120,000,000 | 116.6% | Within Limits`
  },
  {
    id: "APP_PASS",
    domainId: "app_technology",
    title: "Server Logs & Backup State",
    resultHint: "Compliant",
    fileName: "System_Log_Production_Environment.txt",
    fileType: "TXT",
    fileSizeKb: 4,
    isStructured: false,
    description: "Production backup and logging evidence.",
    content: `Target Host Environment: Production (PRD-IP9)
Control Operational Date: 2026-02-20
Backup status: SUCCESS
Backup Duration: Last Backup Run Duration
Logging Production Levels: INFO

[2026-02-20 01:00:00] INFO DB Backup triggered automatically
[2026-02-20 01:07:44] INFO SQL compressed stream write successful. Backup status: SUCCESS`
  },
  {
    id: "OUT_OF_WINDOW",
    domainId: "app_technology",
    title: "Historical Evidence",
    resultHint: "Out of Window",
    fileName: "Archive_Ledger_2025.txt",
    fileType: "TXT",
    fileSizeKb: 3,
    isStructured: false,
    description: "A valid-looking file outside Q1 2026.",
    content: `Target Host Environment: Production (PRD-IP9)
Control Operational Date: 2025-10-15
Backup status: SUCCESS
Logging Production Levels: INFO
System Log Audit`
  }
];

module.exports = { domains, rules, templates };
