package com.example.data

import android.content.Context
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers

class RulesRepository(private val ruleDao: RuleDao) {

    val allRules: Flow<List<ValidationRule>> = ruleDao.getAllRulesFlow()
    val allEvidence: Flow<List<EvidenceFile>> = ruleDao.getAllEvidenceFlow()

    fun getRulesByDomain(domainId: String): Flow<List<ValidationRule>> {
        return ruleDao.getRulesByDomainFlow(domainId)
    }

    fun getEvidenceByDomain(domainId: String): Flow<List<EvidenceFile>> {
        return ruleDao.getEvidenceForDomainFlow(domainId)
    }

    suspend fun updateRule(rule: ValidationRule) = withContext(Dispatchers.IO) {
        ruleDao.updateRule(rule)
    }

    suspend fun insertEvidence(file: EvidenceFile): Long = withContext(Dispatchers.IO) {
        ruleDao.insertEvidence(file)
    }

    suspend fun deleteEvidence(id: Long) = withContext(Dispatchers.IO) {
        ruleDao.deleteEvidenceById(id)
    }

    suspend fun clearAllEvidence() = withContext(Dispatchers.IO) {
        ruleDao.clearAllEvidence()
    }

    suspend fun resetRulesToDefault() = withContext(Dispatchers.IO) {
        ruleDao.deleteAllRules()
        seedDefaultRules()
    }

    suspend fun seedDefaultRulesIfNeeded() = withContext(Dispatchers.IO) {
        // Query rules directly. If empty, seed them
        val existingRules = ruleDao.getAllRulesFlow().firstOrNull() ?: emptyList()
        if (existingRules.isEmpty()) {
            seedDefaultRules()
        }
    }

    private suspend fun seedDefaultRules() {
        val defaultRules = listOf(
            // --- Global Standard QA Rules (Tier 1) ---
            ValidationRule(
                domainId = "standard_qa",
                ruleId = "STD_EMPTY_FILE",
                title = "Evidence Size & Completeness Check",
                description = "Checks that the submitted evidence document is fully legible and is not a zero-size or corrupt placeholder.",
                ruleType = "presence",
                targetField = "Evidence Contents",
                expectedValue = "Has Extractable Content",
                weight = 15
            ),
            ValidationRule(
                domainId = "standard_qa",
                ruleId = "STD_DATE_RANGE",
                title = "Testing Period Range Validation",
                description = "Verifies extracted audit timestamps reside strictly within the active Q1 2026 fiscal control testing window (Jan 1, 2026 - Mar 31, 2026).",
                ruleType = "date_window",
                targetField = "Control Operational Date",
                expectedValue = "2026-01-01 to 2026-03-31",
                weight = 25
            ),
            ValidationRule(
                domainId = "standard_qa",
                ruleId = "STD_HOST_SCOPE",
                title = "Authorized System Scope Check",
                description = "Verifies the host environment or system name in headers matches authorized production nodes (e.g. PRD-IP9 / ProdCluster).",
                ruleType = "value_assertion",
                targetField = "Target Host Environment",
                expectedValue = "Production (PRD-IP9)",
                weight = 15
            ),

            // --- Cybersecurity Access Review Rules (Tier 2) ---
            ValidationRule(
                domainId = "cybersecurity",
                ruleId = "CYBER_01_HEADERS",
                title = "Access Grid Layout Validation",
                description = "Verifies that the uploaded user access ledger contains necessary headers: 'User ID', 'Status', 'MFA Enabled', and 'Last Login Date' to assess controls.",
                ruleType = "presence",
                targetField = "Grid Columns",
                expectedValue = "User ID, Status, MFA Enabled, Last Login Date",
                weight = 20
            ),
            ValidationRule(
                domainId = "cybersecurity",
                ruleId = "CYBER_02_MFA_STATE",
                title = "MFA Compliance Audit",
                description = "Automates scan of the MFA column in Active Directory pulls to assure no active accounts show security settings as FALSE or DISABLED.",
                ruleType = "value_assertion",
                targetField = "MFA Enabled Status",
                expectedValue = "TRUE / Yes",
                weight = 30
            ),
            ValidationRule(
                domainId = "cybersecurity",
                ruleId = "CYBER_03_INACTIVE_ACC",
                title = "Zombie Account Proscription",
                description = "Checks that any account listed with Status 'Inactive' has indeed not logged in within the previous 90 days of review, preventing legacy logins.",
                ruleType = "value_assertion",
                targetField = "Inactive Dormancy Scope",
                expectedValue = "Last Login > 90 Days Ago",
                weight = 20
            ),

            // --- Credit Risk Underwriting Rules (Tier 2) ---
            ValidationRule(
                domainId = "credit_risk",
                ruleId = "CREDIT_01_DTI_LIMIT",
                title = "Debt-to-Income Regulatory Cap",
                description = "Analyzes credit files to ensure customer DTI (Debt-to-Income) rates within underwriting worksheets do not exceed the policy credit ceiling of 43%.",
                ruleType = "value_assertion",
                targetField = "Debt-to-Income (DTI)",
                expectedValue = "<= 43.0%",
                weight = 30
            ),
            ValidationRule(
                domainId = "credit_risk",
                ruleId = "CREDIT_02_INC_VERIFY",
                title = "Income Source Verification Verification",
                description = "Scans borrower lists to ensure every approved borrower has positive Income Verification marked ('Verified' / 'Source Verified').",
                ruleType = "value_assertion",
                targetField = "Income Verification Flag",
                expectedValue = "Verified",
                weight = 25
            ),
            ValidationRule(
                domainId = "credit_risk",
                ruleId = "CREDIT_03_APP_OVERRIDE",
                title = "Authority Approval Sign-off",
                description = "Confirms any exception applicant with Credit Score < 620 possesses a valid risk committee approval hash/override key in the exceptions column.",
                ruleType = "value_assertion",
                targetField = "Senior Underwriter Override Key",
                expectedValue = "Valid SRO Signing Hash",
                weight = 20
            ),

            // --- Market Risk & VaR (Tier 2) ---
            ValidationRule(
                domainId = "market_risk",
                ruleId = "MKT_01_VAR_LIMIT",
                title = "Daily VaR Breaches Check",
                description = "Asserts that total trading asset losses do not exceed standard portfolio VaR (Value-at-Risk) thresholds ($4.5 million ceiling) for more than 2 consecutive days.",
                ruleType = "value_assertion",
                targetField = "VaR Daily Limit Exception Count",
                expectedValue = "0 Breaches",
                weight = 35
            ),
            ValidationRule(
                domainId = "market_risk",
                ruleId = "MKT_02_SHOCK_PARAMS",
                title = "Rate Shock Matrix completeness",
                description = "Confirms that rate-shock spreadsheet files show evidence of stress tests across all standard ranges (e.g. -200bps, -100bps, +100bps, +200bps).",
                ruleType = "presence",
                targetField = "Shock Curves Evaluated",
                expectedValue = "Full Shock Grid Populated",
                weight = 20
            ),

            // --- Liquidity & Stress (Tier 2) ---
            ValidationRule(
                domainId = "liquidity_risk",
                ruleId = "LIQ_01_LCR_RATIO",
                title = "LCR Compliance Floor",
                description = "Verifies Liquidity Coverage Ratio (LCR) reports show daily ratios strictly above the banking regulatory floor of 100%.",
                ruleType = "value_assertion",
                targetField = "Liquidity Coverage Ratio (LCR)",
                expectedValue = ">= 100%",
                weight = 40
            ),
            ValidationRule(
                domainId = "liquidity_risk",
                ruleId = "LIQ_02_CASH_CAP",
                title = "Cash Inflow Capture Cap",
                description = "Checks that corporate inflow limits do not exceed 75% of total outflows during stressed liquidity runs, upholding safe buffer projections.",
                ruleType = "value_assertion",
                targetField = "Stressed Liquidity Cap Ratio",
                expectedValue = "<= 75%",
                weight = 25
            ),

            // --- Application Technology controls (Tier 2) ---
            ValidationRule(
                domainId = "app_technology",
                ruleId = "APP_01_BACKUP_FREQ",
                title = "Continuous Backup Schedule Verification",
                description = "Confirms server backups were triggered and ran successfully within the trailing 7-day window. Look for 'Backup status = SUCCESS'.",
                ruleType = "value_assertion",
                targetField = "Last Backup Run Duration",
                expectedValue = "SUCCESS / Within 7 Days",
                weight = 35
            ),
            ValidationRule(
                domainId = "app_technology",
                ruleId = "APP_02_LOGS_LEVEL",
                title = "Production Debug Log Suppression",
                description = "Audits system configurations to confirm that root production loggers suppress verbose/debug parameters, protecting performance and security data.",
                ruleType = "value_assertion",
                targetField = "Logging Production Levels",
                expectedValue = "INFO or ERROR Only (No DEBUG)",
                weight = 20
            )
        )
        ruleDao.insertRules(defaultRules)
    }

    companion object {
        @Volatile
        private var INSTANCE: RulesRepository? = null

        fun getRepository(context: Context): RulesRepository {
            return INSTANCE ?: synchronized(this) {
                val db = AppDatabase.getDatabase(context)
                val repo = RulesRepository(db.ruleDao())
                INSTANCE = repo
                repo
            }
        }
    }
}
