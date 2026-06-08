package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.BuildConfig
import com.example.data.RiskDomain
import com.example.ui.DigitalEngineerViewModel
import com.example.ui.theme.*

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SandboxScreen(viewModel: DigitalEngineerViewModel) {
    val context = LocalContext.current

    // Observe state from VM
    val selectedDomain by viewModel.selectedDomainInSandbox.collectAsState()
    val selectedTemplateId by viewModel.selectedTemplateId.collectAsState()
    val customText by viewModel.customFileText.collectAsState()
    val customFileName by viewModel.customFileName.collectAsState()

    val isProcessing by viewModel.isProcessing.collectAsState()
    val progress by viewModel.processingProgress.collectAsState()
    val logs by viewModel.processingLogs.collectAsState()
    val statusMsg by viewModel.currentStatusMsg.collectAsState()
    val result by viewModel.sandboxResult.collectAsState()

    val listState = rememberLazyListState()

    // Scroll to end of logs as they append
    LaunchedEffect(logs.size) {
        if (logs.isNotEmpty()) {
            listState.animateScrollToItem(logs.size - 1)
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(bottom = 32.dp)
    ) {
        // --- Tab Section Title ---
        item {
            Column(modifier = Modifier.padding(top = 20.dp, bottom = 4.dp)) {
                Text(
                    text = "Operational Validation Sandbox",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.SemiBold,
                    color = Slate900
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Simulate how incoming AuditBoard attachments are intercepted, processed by OCR, scored, and written back securely.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Slate500,
                    lineHeight = 16.sp
                )
            }
        }

        // --- Step 1: Scope & Risk Domain Choice ---
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(BorderStroke(1.dp, Slate100), RoundedCornerShape(24.dp)),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "1. SELECT PIPELINE RISK SCOPE",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = Teal600,
                        letterSpacing = 1.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Dictates which Tier-2 domain rules are loaded alongside Tier-1 QA.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Slate500
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        val scopes = RiskDomain.values().filter { it != RiskDomain.STANDARD_QA }
                        items(scopes) { domain ->
                            val isSelected = selectedDomain == domain
                            FilterChip(
                                selected = isSelected,
                                onClick = { viewModel.setSandboxDomain(domain) },
                                label = { Text(domain.displayName, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium) },
                                leadingIcon = {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(domain.color)
                                    )
                                },
                                enabled = !isProcessing,
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = domain.color.copy(alpha = 0.12f),
                                    selectedLabelColor = domain.color,
                                    containerColor = Slate50,
                                    labelColor = Slate500
                                ),
                                modifier = Modifier.minimumInteractiveComponentSize(),
                                shape = RoundedCornerShape(12.dp),
                                border = FilterChipDefaults.filterChipBorder(
                                    borderColor = if (isSelected) domain.color.copy(alpha = 0.3f) else Slate100,
                                    borderWidth = 1.dp,
                                    enabled = !isProcessing,
                                    selected = isSelected
                                )
                            )
                        }
                    }
                }
            }
        }

        // --- Step 2: Choose Template / Configuration ---
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(BorderStroke(1.dp, Slate100), RoundedCornerShape(24.dp)),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "2. CHOOSE EVIDENCE SPECIMEN TEMPLATE",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = Teal600,
                            letterSpacing = 1.sp
                        )

                        // Mode indicator (Demo vs LLM Live)
                        val key = BuildConfig.GEMINI_API_KEY
                        val hasRealKey = key.isNotEmpty() && key != "MY_GEMINI_API_KEY_DEFAULT_VALUE" && key != "MY_GEMINI_API_KEY"
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = if (hasRealKey) Emerald50 else Slate50,
                            modifier = Modifier.padding(start = 4.dp),
                            border = BorderStroke(1.dp, if (hasRealKey) Emerald500.copy(alpha = 0.15f) else Slate100)
                        ) {
                            Text(
                                text = if (hasRealKey) "LIVE GEMINI API" else "HEURISTIC OFFLINE",
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (hasRealKey) Emerald600 else Slate500
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Horizontal carousel of templates matching the scope
                    val matchingTemplates = viewModel.mockTemplates.filter {
                        it.domainId == selectedDomain.id || it.id == "CUSTOM" || it.id == "OUT_OF_WINDOW"
                    }

                    FlowRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        matchingTemplates.forEach { template ->
                            val isSelected = selectedTemplateId == template.id
                            InputChip(
                                selected = isSelected,
                                onClick = { viewModel.selectTemplate(template.id) },
                                label = { Text(template.title, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Medium) },
                                enabled = !isProcessing,
                                colors = InputChipDefaults.inputChipColors(
                                    selectedContainerColor = Teal50,
                                    selectedLabelColor = Teal700,
                                    containerColor = Slate50,
                                    labelColor = Slate500
                                ),
                                shape = RoundedCornerShape(12.dp),
                                border = InputChipDefaults.inputChipBorder(
                                    borderColor = if (isSelected) Teal600.copy(alpha = 0.3f) else Slate100,
                                    borderWidth = 1.dp,
                                    enabled = !isProcessing,
                                    selected = isSelected
                                ),
                                modifier = Modifier.minimumInteractiveComponentSize()
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Filename Editor
                    OutlinedTextField(
                        value = customFileName,
                        onValueChange = { viewModel.updateCustomFileName(it) },
                        label = { Text("Evidence Attachment Name") },
                        singleLine = true,
                        readOnly = isProcessing,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Teal600,
                            focusedLabelColor = Teal700,
                            unfocusedBorderColor = Slate100,
                            unfocusedContainerColor = Slate50.copy(alpha = 0.5f)
                        )
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Evidence Text Editor
                    OutlinedTextField(
                        value = customText,
                        onValueChange = { viewModel.updateCustomText(it) },
                        label = { Text("Document Extracted Parameters Grid") },
                        textStyle = androidx.compose.ui.text.TextStyle(fontFamily = FontFamily.Monospace, fontSize = 11.sp, color = Slate800),
                        minLines = 4,
                        maxLines = 10,
                        readOnly = isProcessing,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Teal600,
                            focusedLabelColor = Teal700,
                            unfocusedBorderColor = Slate100,
                            unfocusedContainerColor = Slate50.copy(alpha = 0.5f)
                        )
                    )
                }
            }
        }

        // --- Pipeline Action button ---
        item {
            Button(
                onClick = { viewModel.runValidation(context) },
                enabled = !isProcessing && customText.isNotBlank() && customFileName.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .minimumInteractiveComponentSize(),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Teal600,
                    disabledContainerColor = Slate100,
                    disabledContentColor = Slate400
                )
            ) {
                if (isProcessing) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Digital Engineer Running...")
                } else {
                    Icon(imageVector = Icons.Default.PlayArrow, contentDescription = "Run")
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("ENGAGE WEBHOOK PIPELINE", fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                }
            }
        }

        // --- Processing Logs Console (Dynamic Reveal) ---
        if (isProcessing || logs.isNotEmpty()) {
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(BorderStroke(1.dp, Slate800), RoundedCornerShape(20.dp)),
                    colors = CardDefaults.cardColors(containerColor = Slate900),
                    shape = RoundedCornerShape(20.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = "CONSOLE CONCURRENT LOGS",
                                color = Color(0xFF00E5FF),
                                fontFamily = FontFamily.Monospace,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold
                            )
                            if (isProcessing) {
                                Text(
                                    text = statusMsg,
                                    color = Amber500,
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold
                                )
                            } else {
                                Text(
                                    text = "PIPELINE COMPLETED",
                                    color = Emerald500,
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        if (isProcessing) {
                            LinearProgressIndicator(
                                progress = progress,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(4.dp)
                                    .clip(RoundedCornerShape(2.dp)),
                                color = Color(0xFF00E5FF),
                                trackColor = Slate800
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                        }

                        // Thread Crawling Container
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(160.dp)
                        ) {
                            LazyColumn(
                                state = listState,
                                modifier = Modifier.fillMaxSize(),
                                verticalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                items(logs) { logMsg ->
                                    Text(
                                        text = logMsg,
                                        color = if (logMsg.startsWith("✓")) Emerald500
                                        else if (logMsg.startsWith("✗")) Rose500
                                        else if (logMsg.startsWith("🚀") || logMsg.startsWith("✅")) Color.White
                                        else Slate400,
                                        fontFamily = FontFamily.Monospace,
                                        fontSize = 11.sp,
                                        lineHeight = 15.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // --- Step 3: Evidence Evaluation Output (AuditBoard Writeback Simulation) ---
        if (!isProcessing && result != null) {
            item {
                val res = result!!
                val (statusLabel, statusBg, statusTextCol) = when (res.status) {
                    "PASSED" -> Triple("Pass", Emerald50, Emerald600)
                    "WARNING" -> Triple("Warning", Amber50, Amber600)
                    else -> Triple("Fail", Rose50, Rose600)
                }

                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .animateContentSize()
                        .border(BorderStroke(1.dp, Slate100), RoundedCornerShape(24.dp)),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "3. INTERCEPTED RESULTS WRITEBACK",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Teal600,
                                    letterSpacing = 1.sp
                                )
                                Text(
                                    text = "Automatic data feedback synthesized.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Slate500
                                )
                            }

                            // Grade Pill Badge
                            Box(
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(statusBg)
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = statusLabel.uppercase(),
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = statusTextCol
                                )
                            }
                        }

                        Divider(modifier = Modifier.padding(vertical = 12.dp), color = Slate100)

                        // Score Block
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(72.dp)
                                    .clip(CircleShape)
                                    .background(statusTextCol.copy(alpha = 0.08f))
                                    .border(2.dp, statusTextCol, CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = "${res.score}",
                                        style = MaterialTheme.typography.headlineMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = statusTextCol,
                                        lineHeight = 28.sp
                                    )
                                    Text(
                                        text = "SCORE",
                                        fontSize = 8.sp,
                                        color = Slate500,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }

                            Column {
                                Text(
                                    text = "Evidence Alignment Score",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = Slate900
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = when (res.status) {
                                        "PASSED" -> "Excellent! This file passes overall standard and domain-specific checklist metrics seamlessly."
                                        "WARNING" -> "Standard QA validations pass, but notable Tier-2 control variances were parsed."
                                        else -> "Action Required: The system has automatically changed this workpaper status to 'Pending Remediation'."
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Slate500,
                                    lineHeight = 16.sp
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // AuditBoard Writeback comment simulation
                        Text(
                            text = "AuditBoard Record Comments Sent (REST Writeback)",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = Slate500
                        )
                        Spacer(modifier = Modifier.height(6.dp))

                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(Slate50)
                                .border(1.dp, Slate100, RoundedCornerShape(12.dp))
                                .padding(12.dp)
                        ) {
                            Text(
                                text = res.remediationLogs,
                                style = MaterialTheme.typography.bodySmall,
                                fontFamily = FontFamily.Monospace,
                                color = Slate800,
                                lineHeight = 16.sp
                            )
                        }
                    }
                }
            }
        }
    }
}
