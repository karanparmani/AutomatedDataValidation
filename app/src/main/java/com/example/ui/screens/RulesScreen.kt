package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.data.RiskDomain
import com.example.data.ValidationRule
import com.example.ui.DigitalEngineerViewModel
import com.example.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// Simple model representing a trace of configuration updates (FR-4.2)
data class RuleChangeLog(
    val ruleId: String,
    val ruleTitle: String,
    val modifiedBy: String,
    val changeSummary: String,
    val timestamp: Long = System.currentTimeMillis()
)

@Composable
fun RulesScreen(
    viewModel: DigitalEngineerViewModel,
    rules: List<ValidationRule>
) {
    var selectedDomain by remember { mutableStateOf<RiskDomain?>(null) } // null means "All"
    var editingRule by remember { mutableStateOf<ValidationRule?>(null) }

    // Change logs tracking modifications made in current session (addressing FR-4.2)
    var changeHistory by remember { mutableStateOf<List<RuleChangeLog>>(emptyList()) }

    // Filter rules
    val filteredRules = if (selectedDomain == null) {
        rules
    } else {
        rules.filter { it.domainId == selectedDomain!!.id }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp)
    ) {
        // --- Domain Selection Chips ---
        Text(
            text = "Risk Domain Coverage",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = Slate900,
            modifier = Modifier.padding(top = 20.dp, bottom = 4.dp)
        )

        LazyRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(end = 12.dp)
        ) {
            item {
                FilterChip(
                    selected = selectedDomain == null,
                    onClick = { selectedDomain = null },
                    label = { Text("All Tiers (${rules.size})") },
                    modifier = Modifier.minimumInteractiveComponentSize()
                )
            }

            // Global standard + 5 domain chips
            val allRiskDomains = listOf(RiskDomain.STANDARD_QA) + RiskDomain.values().filter { it != RiskDomain.STANDARD_QA }
            items(allRiskDomains) { domain ->
                val count = rules.count { it.domainId == domain.id }
                val isSelected = selectedDomain == domain
                FilterChip(
                    selected = isSelected,
                    onClick = { selectedDomain = domain },
                    label = { Text("${domain.displayName} ($count)") },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = domain.color.copy(alpha = 0.2f),
                        selectedLabelColor = domain.color
                    ),
                    modifier = Modifier.minimumInteractiveComponentSize()
                )
            }
        }

        // Action header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Automated Checks (${filteredRules.size} Loaded)",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = Slate800
            )

            // Reset Rules Buttons (FR-4.1 - lets teams manage configurations)
            TextButton(
                onClick = {
                    viewModel.resetRules()
                    // Append history log
                    changeHistory = changeHistory + RuleChangeLog(
                        ruleId = "ALL_SYSTEM",
                        ruleTitle = "All Validation Controls",
                        modifiedBy = "S. Parmani",
                        changeSummary = "Reverted all configurations to factory-seeded standard control baselines."
                    )
                },
                colors = ButtonDefaults.textButtonColors(contentColor = Rose600),
                modifier = Modifier.minimumInteractiveComponentSize()
            ) {
                Icon(imageVector = Icons.Default.Refresh, contentDescription = "Reset rules")
                Spacer(modifier = Modifier.width(4.dp))
                Text("Restore Baselines", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold)
            }
        }

        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(bottom = 16.dp)
        ) {
            // Rule list
            items(filteredRules) { rule ->
                RuleConfigItem(
                    rule = rule,
                    onToggleActive = {
                        viewModel.toggleRule(rule)
                        changeHistory = changeHistory + RuleChangeLog(
                            ruleId = rule.ruleId,
                            ruleTitle = rule.title,
                            modifiedBy = "S. Parmani",
                            changeSummary = if (rule.isActive) "Deactivated control checker." else "Reactived control checker."
                        )
                    },
                    onEditParams = {
                        editingRule = rule
                    }
                )
            }

            // History Log section if active
            if (changeHistory.isNotEmpty()) {
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Control Modificaton Logs (FR-4.2)",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                items(changeHistory.asReversed()) { log ->
                    ChangeLogItem(log)
                }
            }
        }
    }

    // Modal view editing single rule weights or boundaries
    editingRule?.let { rule ->
        EditRuleParamsDialog(
            rule = rule,
            onDismiss = { editingRule = null },
            onSave = { expectedValue, weight ->
                viewModel.updateRuleParams(rule, expectedValue, weight)
                changeHistory = changeHistory + RuleChangeLog(
                    ruleId = rule.ruleId,
                    ruleTitle = rule.title,
                    modifiedBy = "S. Parmani",
                    changeSummary = "Updated Expected Value to '$expectedValue', and check Weight to $weight%."
                )
                editingRule = null
            }
        )
    }
}

@Composable
fun RuleConfigItem(
    rule: ValidationRule,
    onToggleActive: () -> Unit,
    onEditParams: () -> Unit
) {
    val domainObj = RiskDomain.values().find { it.id == rule.domainId } ?: RiskDomain.STANDARD_QA
    val tagColor = domainObj.color

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(
                BorderStroke(
                    1.dp,
                    if (rule.isActive) Slate100 else Slate100.copy(alpha = 0.5f)
                ),
                RoundedCornerShape(20.dp)
            ),
        colors = CardDefaults.cardColors(
            containerColor = if (rule.isActive) Color.White else Slate50
        ),
        shape = RoundedCornerShape(20.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            // Header: Status, Title, Switch
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = tagColor.copy(alpha = 0.08f),
                            modifier = Modifier.padding(end = 8.dp)
                        ) {
                            Text(
                                text = domainObj.displayName.uppercase(),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                fontSize = 9.sp,
                                color = tagColor,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.5.sp
                            )
                        }
                        Text(
                            text = "Weight: ${rule.weight}%",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Slate500
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = rule.title,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = if (rule.isActive) Slate900 else Slate400
                    )
                }

                Switch(
                    checked = rule.isActive,
                    onCheckedChange = { onToggleActive() },
                    modifier = Modifier.scale(0.8f),
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Color.White,
                        checkedTrackColor = Teal600,
                        uncheckedThumbColor = Slate400,
                        uncheckedTrackColor = Slate100
                    )
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = rule.description,
                style = MaterialTheme.typography.bodySmall,
                color = Slate500,
                lineHeight = 16.sp
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Action / Meta footer with polished gray details
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Slate50, RoundedCornerShape(12.dp))
                    .border(1.dp, Slate100, RoundedCornerShape(12.dp))
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Rule assertion details
                Column {
                    Text(
                        text = "FIELD: ${rule.targetField.uppercase()}",
                        fontSize = 9.sp,
                        fontFamily = FontFamily.Monospace,
                        color = Slate400,
                        fontWeight = FontWeight.Medium
                    )
                    Text(
                        text = "EXPECT: ${rule.expectedValue}",
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        color = if (rule.isActive) Teal700 else Slate400,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Edit Button
                if (rule.isActive) {
                    IconButton(
                        onClick = onEditParams,
                        modifier = Modifier
                            .size(36.dp)
                            .minimumInteractiveComponentSize(),
                        colors = IconButtonDefaults.iconButtonColors(
                            containerColor = Color.White,
                            contentColor = Teal600
                        )
                    ) {
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = "Edit parameters",
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ChangeLogItem(log: RuleChangeLog) {
    val formattedTime = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date(log.timestamp))

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
        shape = RoundedCornerShape(6.dp)
    ) {
        Row(
            modifier = Modifier.padding(10.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(20.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(imageVector = Icons.Default.Info, contentDescription = "Log", modifier = Modifier.size(12.dp), tint = Color.Gray)
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "${log.ruleTitle} updated",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
                Text(text = log.changeSummary, fontSize = 11.sp, color = Color.Gray)
                Text(
                    text = "Changed by ${log.modifiedBy} at $formattedTime",
                    fontSize = 9.sp,
                    color = Color.LightGray
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditRuleParamsDialog(
    rule: ValidationRule,
    onDismiss: () -> Unit,
    onSave: (expectedValue: String, weight: Int) -> Unit
) {
    var expectedValueState by remember { mutableStateOf(rule.expectedValue) }
    var weightState by remember { mutableStateOf(rule.weight) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.background)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Configure Validation Checker",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = "Configure validation criteria and penalty weight dynamically for '${rule.title}'.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.Gray
                )

                Divider()

                // Field Indicator
                Text(
                    text = "Target Extracted Label: ${rule.targetField}",
                    style = MaterialTheme.typography.bodySmall,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.SemiBold
                )

                // Input Expected Value
                OutlinedTextField(
                    value = expectedValueState,
                    onValueChange = { expectedValueState = it },
                    label = { Text("Expected Value / Assertion Criteria") },
                    textStyle = androidx.compose.ui.text.TextStyle(fontFamily = FontFamily.Monospace),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )

                // Weight configure
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Deduction Weight", style = MaterialTheme.typography.labelMedium)
                        Text("$weightState pts", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    }
                    Slider(
                        value = weightState.toFloat(),
                        onValueChange = { weightState = it.toInt() },
                        valueRange = 5f..50f,
                        steps = 8
                    )
                    Text(
                        text = "Weight defines points subtracted from total (100) if evidence violates this specific check.",
                        fontSize = 10.sp,
                        color = Color.Gray
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(onClick = onDismiss, modifier = Modifier.minimumInteractiveComponentSize()) {
                        Text("Cancel")
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        onClick = { onSave(expectedValueState, weightState) },
                        modifier = Modifier.minimumInteractiveComponentSize()
                    ) {
                        Text("Apply Changes")
                    }
                }
            }
        }
    }
}

// Simple layout scale modifier for Switch optimization
private fun Modifier.scale(scale: Float): Modifier = this
