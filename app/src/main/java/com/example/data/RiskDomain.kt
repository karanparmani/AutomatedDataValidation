package com.example.data

import androidx.compose.ui.graphics.Color

enum class RiskDomain(val id: String, val displayName: String, val color: Color, val description: String) {
    STANDARD_QA("standard_qa", "Global Standard QA", Color(0xFF6200EE), "Baseline Quality Assurance compliance applied to all uploaded audit evidence."),
    CYBERSECURITY("cybersecurity", "Cybersecurity Access", Color(0xFF00E5FF), "Access control reviews, MFA compliance, Active Directory status audits, and session timeout checks."),
    CREDIT_RISK("credit_risk", "Credit Risk Underwriting", Color(0xFFFF9100), "Underwriting parameter matching, credit policy validations, risk rating verification, and approval overrides."),
    MARKET_RISK("market_risk", "Market Risk & VaR", Color(0xFF00E676), "Value-at-Risk parameters, rate shocking tables, hedging validations, and trading desk compliance."),
    LIQUIDITY_RISK("liquidity_risk", "Liquidity & Stress", Color(0xFFD500F9), "LCR reports, stress testing scenario validations, cash flow limits, and banking book checks."),
    APP_TECH("app_technology", "Application Tech Controls", Color(0xFF2979FF), "Server logs, backup validation schedules, database change controls, and system versions.")
}
