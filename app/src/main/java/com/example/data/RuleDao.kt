package com.example.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

@Dao
interface RuleDao {
    // --- Room operations for Validation Rules ---
    @Query("SELECT * FROM validation_rules ORDER BY domainId ASC, id ASC")
    fun getAllRulesFlow(): Flow<List<ValidationRule>>

    @Query("SELECT * FROM validation_rules WHERE domainId = :domainId ORDER BY id ASC")
    fun getRulesByDomainFlow(domainId: String): Flow<List<ValidationRule>>

    @Query("SELECT * FROM validation_rules WHERE isActive = 1")
    suspend fun getActiveRules(): List<ValidationRule>

    @Query("SELECT * FROM validation_rules WHERE domainId = :domainId AND isActive = 1")
    suspend fun getActiveRulesForDomain(domainId: String): List<ValidationRule>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRule(rule: ValidationRule)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRules(rules: List<ValidationRule>)

    @Update
    suspend fun updateRule(rule: ValidationRule)

    @Query("DELETE FROM validation_rules")
    suspend fun deleteAllRules()

    // --- Room operations for Evidence Logs ---
    @Query("SELECT * FROM evidence_files ORDER BY uploadTime DESC")
    fun getAllEvidenceFlow(): Flow<List<EvidenceFile>>

    @Query("SELECT * FROM evidence_files WHERE riskDomainId = :domainId ORDER BY uploadTime DESC")
    fun getEvidenceForDomainFlow(domainId: String): Flow<List<EvidenceFile>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEvidence(file: EvidenceFile) : Long

    @Query("DELETE FROM evidence_files WHERE id = :id")
    suspend fun deleteEvidenceById(id: Long)

    @Query("DELETE FROM evidence_files")
    suspend fun clearAllEvidence()
}
