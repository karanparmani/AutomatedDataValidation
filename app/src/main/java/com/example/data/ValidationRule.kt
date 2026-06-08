package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "validation_rules")
data class ValidationRule(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val domainId: String,          // Matches RiskDomain.id
    val ruleId: String,            // Unique string ID used by parsers, e.g. "CYBER_01_MFA"
    val title: String,
    val description: String,
    val ruleType: String,          // "presence", "value_assertion", "date_window", "format_match"
    val targetField: String,       // Column name or label, e.g. "MFA Enabled"
    val expectedValue: String,     // Expected assertion, e.g. "TRUE"
    val weight: Int,               // Weight (0 to 100)
    val isActive: Boolean = true
)
