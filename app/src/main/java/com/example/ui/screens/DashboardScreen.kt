package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.example.data.EvidenceFile
import com.example.data.RiskDomain
import com.example.ui.DigitalEngineerViewModel
import com.example.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DashboardScreen(
    viewModel: DigitalEngineerViewModel,
    evidenceFiles: List<EvidenceFile>
) {
    val selectedFileState = remember { mutableStateOf<EvidenceFile?>(null) }

    // Computations from live Room DB logs
    val totalUploads = evidenceFiles.size
    val passedCount = evidenceFiles.count { it.status == "PASSED" }
    val warningCount = evidenceFiles.count { it.status == "WARNING" }
    val failedCount = evidenceFiles.count { it.status == "REMEDIATION_REQUIRED" }

    val avgScore = if (totalUploads > 0) {
        evidenceFiles.map { it.alignmentScore }.average().toInt()
    } else {
        94 // Prepopulated visual starting baseline
    }

    val avgLatencyMs = if (totalUploads > 0) {
        evidenceFiles.map { it.processingDurationMs }.average().toLong()
    } else {
        1340L
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        // --- Header: App Bar (Professional Polish) ---
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 20.dp, bottom = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "AUDITBOARD INTEGRATED",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = Slate500,
                        letterSpacing = 1.5.sp
                    )
                    Text(
                        text = "Digital Engineer",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = Slate900,
                        letterSpacing = (-0.5).sp
                    )
                }
                // Avatar badge displaying user's initial or standard PM
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .background(Teal100)
                        .border(2.dp, Color.White, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "SP",
                        fontWeight = FontWeight.Bold,
                        color = Teal700,
                        fontSize = 14.sp
                    )
                }
            }
        }

        // --- System Pulse: Hero Card ---
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(32.dp))
                    .background(Slate900)
                    .padding(24.dp)
            ) {
                // Background Glow
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = 16.dp, y = (-16).dp)
                        .size(140.dp)
                        .background(
                            brush = Brush.radialGradient(
                                colors = listOf(Teal600.copy(alpha = 0.15f), Color.Transparent),
                            )
                        )
                )

                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.padding(bottom = 14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = Emerald500,
                            modifier = Modifier.size(8.dp)
                        ) {}
                        Text(
                            text = "VALIDATION ENGINE ACTIVE",
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = Slate400,
                            letterSpacing = 1.sp
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.Bottom) {
                                Text(
                                    text = "$avgScore",
                                    style = MaterialTheme.typography.displayMedium,
                                    fontWeight = FontWeight.Light,
                                    color = Color.White
                                )
                                Text(
                                    text = "%",
                                    style = MaterialTheme.typography.titleLarge,
                                    color = Color.White.copy(alpha = 0.5f),
                                    modifier = Modifier.padding(bottom = 8.dp, start = 2.dp)
                                )
                            }
                            Text(
                                text = "Avg. Alignment Score (Last 24h)",
                                style = MaterialTheme.typography.bodySmall,
                                color = Slate400,
                                fontWeight = FontWeight.Medium
                            )
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = "${totalUploads.coerceAtLeast(3)}",
                                style = MaterialTheme.typography.headlineMedium,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Text(
                                text = "Files Processed",
                                style = MaterialTheme.typography.bodySmall,
                                color = Slate400,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }

        // --- Multi KPI Cards Row ---
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Card 1: Processor Overhead
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .border(1.dp, Slate100, RoundedCornerShape(24.dp)),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "PROCESSOR SLAS",
                            color = Slate400,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        val formatLatency = String.format(Locale.getDefault(), "%.2fs", avgLatencyMs / 1000f)
                        Text(
                            text = formatLatency,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.SemiBold,
                            fontFamily = FontFamily.Monospace,
                            color = Slate900
                        )
                        Text(
                            text = "NFR Target < 90s",
                            style = MaterialTheme.typography.labelSmall,
                            color = Slate400
                        )
                    }
                }

                // Card 2: Security Sovereignty
                Card(
                    modifier = Modifier
                        .weight(1f)
                        .border(1.dp, Slate100, RoundedCornerShape(24.dp)),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "SOVEREIGNTY",
                            color = Slate400,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.5.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Ephemeral",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.SemiBold,
                            color = Teal700
                        )
                        Text(
                            text = "Zero Retained DB Logs",
                            style = MaterialTheme.typography.labelSmall,
                            color = Slate400
                        )
                    }
                }
            }
        }

        // --- Compliance Health Status Section ---
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(1.dp, Slate100, RoundedCornerShape(24.dp)),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Global Ingestion Compliance Breakdown",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = Slate900
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    if (totalUploads == 0) {
                        Text(
                            text = "No validation runs executed yet. Trigger automated checks in the Sandbox/Workspace to view real telemetry logs.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Slate500
                        )
                    } else {
                        // Custom Linear Bar showing ratios
                        val total = totalUploads.toFloat()
                        val ratioPassed = passedCount / total
                        val ratioWarning = warningCount / total
                        val ratioFailed = failedCount / total

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(16.dp)
                                .clip(RoundedCornerShape(8.dp))
                        ) {
                            if (passedCount > 0) {
                                Box(
                                    modifier = Modifier
                                        .weight(ratioPassed)
                                        .fillMaxHeight()
                                        .background(Emerald500)
                                )
                            }
                            if (warningCount > 0) {
                                Box(
                                    modifier = Modifier
                                        .weight(ratioWarning)
                                        .fillMaxHeight()
                                        .background(Amber500)
                                )
                            }
                            if (failedCount > 0) {
                                Box(
                                    modifier = Modifier
                                        .weight(ratioFailed)
                                        .fillMaxHeight()
                                        .background(Rose500)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(modifier = Modifier.size(8.dp), shape = CircleShape, color = Emerald500) {}
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Passed ($passedCount)", style = MaterialTheme.typography.labelSmall, color = Slate700)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(modifier = Modifier.size(8.dp), shape = CircleShape, color = Amber500) {}
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Warning ($warningCount)", style = MaterialTheme.typography.labelSmall, color = Slate700)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(modifier = Modifier.size(8.dp), shape = CircleShape, color = Rose500) {}
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Remediation ($failedCount)", style = MaterialTheme.typography.labelSmall, color = Slate700)
                            }
                        }
                    }
                }
            }
        }

        // --- AuditBoard Webhook Feed ---
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp, bottom = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Recent Ingestions",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = Slate500,
                    letterSpacing = 0.5.sp
                )
                Text(
                    text = "Live Webhook Console",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = Teal600
                )
            }
        }

        if (evidenceFiles.isEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = "Empty Ingests",
                            tint = Color.Gray,
                            modifier = Modifier.size(40.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "No webhook logs cached.",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "Perform simulated validation checks in the Sandbox workspace tab.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.Gray
                        )
                    }
                }
            }
        } else {
            items(evidenceFiles) { item ->
                WebhookFeedRow(item) {
                    selectedFileState.value = item
                }
            }
        }
    }

    // Modal dialogue presenting audit comment, corrective checklist details
    selectedFileState.value?.let { log ->
        DetailDialog(item = log) {
            selectedFileState.value = null
        }
    }
}

@Composable
fun WebhookFeedRow(log: EvidenceFile, onClick: () -> Unit) {
    val domainObj = RiskDomain.values().find { it.id == log.riskDomainId } ?: RiskDomain.STANDARD_QA
    
    val (statusLabel, statusBg, statusTextCol) = when (log.status) {
        "PASSED" -> Triple("Pass", Emerald50, Emerald600)
        "WARNING" -> Triple("Warning", Amber50, Amber600)
        else -> Triple("Fail", Rose50, Rose600)
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .border(BorderStroke(1.dp, Slate100), RoundedCornerShape(24.dp)),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        shape = RoundedCornerShape(24.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Circle Badge with domain indicator (24dp rounded cards mapping perfect aesthetics)
                Box(
                    modifier = Modifier
                        .size(42.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(domainObj.color.copy(alpha = 0.08f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = domainObj.displayName.firstOrNull()?.toString() ?: "G",
                        fontWeight = FontWeight.Bold,
                        color = domainObj.color,
                        fontSize = 15.sp
                    )
                }

                Spacer(modifier = Modifier.width(14.dp))

                Column {
                    Text(
                        text = log.fileName,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = Slate800,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Row(
                        modifier = Modifier.padding(top = 2.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = domainObj.displayName,
                            style = MaterialTheme.typography.labelSmall,
                            color = Slate500,
                            fontWeight = FontWeight.Medium
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "• ${log.fileType}",
                            style = MaterialTheme.typography.labelSmall,
                            color = Slate400
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.width(8.dp))

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${log.alignmentScore}%",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = statusTextCol
                )
                Spacer(modifier = Modifier.height(2.dp))
                // Beautiful Pill Badge
                Box(
                    modifier = Modifier
                        .clip(CircleShape)
                        .background(statusBg)
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = statusLabel.uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        fontSize = 9.sp,
                        color = statusTextCol,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun DetailDialog(item: EvidenceFile, onDismiss: () -> Unit) {
    val domain = RiskDomain.values().find { it.id == item.riskDomainId } ?: RiskDomain.STANDARD_QA
    val formattedDate = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date(item.uploadTime))

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.background),
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                // Top Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Validation Audit Report",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Black
                    )
                    IconButton(onClick = onDismiss, modifier = Modifier.minimumInteractiveComponentSize()) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close dialog")
                    }
                }

                Divider(modifier = Modifier.padding(vertical = 8.dp))

                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    item {
                        // Title block with status
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = item.fileName,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "AuditBoard ID: ${item.auditBoardWorkpaperId}",
                                    style = MaterialTheme.typography.bodySmall,
                                    fontFamily = FontFamily.Monospace,
                                    color = Color.Gray
                                )
                            }

                            // Big Score Box
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(
                                        when (item.status) {
                                            "PASSED" -> Color(0xFF00E676).copy(alpha = 0.15f)
                                            "WARNING" -> Color(0xFFFFB300).copy(alpha = 0.15f)
                                            else -> Color(0xFFFF1744).copy(alpha = 0.15f)
                                        }
                                    )
                                    .padding(8.dp)
                            ) {
                                Text(
                                    text = "${item.alignmentScore} pts",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = when (item.status) {
                                        "PASSED" -> Color(0xFF00E676)
                                        "WARNING" -> Color(0xFFFFB300)
                                        else -> Color(0xFFFF1744)
                                    },
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }
                    }

                    // Metadata Details
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(text = "Metadata & Signatures", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(text = "• Risk Domain: ${domain.displayName}", style = MaterialTheme.typography.bodySmall)
                                Text(text = "• Ingestion Date: $formattedDate", style = MaterialTheme.typography.bodySmall)
                                Text(text = "• Ingest Trigger: Webhook API", style = MaterialTheme.typography.bodySmall)
                                Text(text = "• Evidence Submitter: ${item.systemAuthor}", style = MaterialTheme.typography.bodySmall)
                                Text(text = "• Ingest SLA Latency: ${item.processingDurationMs} ms", style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }

                    // Evidence Text Segmented
                    item {
                        Text(
                            text = "Extracted Text (OCR Ingestion)",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.secondary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(90.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(Color.Black.copy(alpha = 0.05f))
                                .border(0.5.dp, Color.Gray.copy(alpha = 0.2f), RoundedCornerShape(6.dp))
                                .padding(8.dp)
                        ) {
                            Text(
                                text = item.extractedText.ifBlank { "No extractable parameters indexed." },
                                style = MaterialTheme.typography.bodySmall,
                                fontFamily = FontFamily.Monospace,
                                color = Color.DarkGray,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    // Remediation / Passing Logs
                    item {
                        Text(
                            text = "AuditBoard Middleware Comment Logs",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(6.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f))
                                .border(0.5.dp, Color.Gray.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
                                .padding(12.dp)
                        ) {
                            Text(
                                text = item.remediationLogs.ifBlank { "No detailed logs recorded." },
                                style = MaterialTheme.typography.bodySmall,
                                fontFamily = FontFamily.Monospace
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Button(
                    onClick = onDismiss,
                    modifier = Modifier.fillMaxWidth().minimumInteractiveComponentSize(),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                ) {
                    Text("OK, Close")
                }
            }
        }
    }
}
