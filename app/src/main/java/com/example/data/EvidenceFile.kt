package com.example.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "evidence_files")
data class EvidenceFile(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val fileName: String,
    val fileType: String,              // "PDF", "XLSX", "PNG"
    val fileSizeKb: Int,
    val uploadTime: Long = System.currentTimeMillis(),
    val riskDomainId: String,          // Matches RiskDomain.id
    val alignmentScore: Int,           // 0 to 100
    val status: String,                // "PASSED", "WARNING", "REMEDIATION_REQUIRED"
    val extractedText: String,
    val remediationLogs: String,       // Newline-separated list of feedback or JSON string
    val auditBoardWorkpaperId: String, // E.g. "WP-2026-801"
    val systemAuthor: String,          // E.g. "S. Parmani"
    val processingDurationMs: Long     // Latency trace in MS (e.g. 640ms local, 1200ms Gemini)
)
