package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.*
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.example.ui.DigitalEngineerViewModel
import com.example.ui.screens.DashboardScreen
import com.example.ui.screens.RulesScreen
import com.example.ui.screens.SandboxScreen
import com.example.ui.theme.*

class MainActivity : ComponentActivity() {
  private val viewModel: DigitalEngineerViewModel by viewModels()

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      MyApplicationTheme {
        val selectedTab by viewModel.selectedTab.collectAsState()
        val evidenceFiles by viewModel.evidenceFlow.collectAsState()
        val rules by viewModel.rulesFlow.collectAsState()

        Scaffold(
          modifier = Modifier.fillMaxSize(),
          containerColor = LightBg,
          bottomBar = {
            NavigationBar(
              containerColor = Color.White,
              tonalElevation = 0.dp,
              modifier = Modifier.padding(bottom = 0.dp)
            ) {
              NavigationBarItem(
                selected = selectedTab == 0,
                onClick = { viewModel.setSelectedTab(0) },
                colors = NavigationBarItemDefaults.colors(
                  selectedIconColor = Teal600,
                  selectedTextColor = Teal600,
                  indicatorColor = Teal100.copy(alpha = 0.4f),
                  unselectedIconColor = Slate400,
                  unselectedTextColor = Slate400
                ),
                icon = {
                  Icon(
                    imageVector = if (selectedTab == 0) Icons.Filled.Home else Icons.Default.Home,
                    contentDescription = "Dashboard"
                  )
                },
                label = { Text("Dashboard", style = MaterialTheme.typography.labelSmall) }
              )
              NavigationBarItem(
                selected = selectedTab == 1,
                onClick = { viewModel.setSelectedTab(1) },
                colors = NavigationBarItemDefaults.colors(
                  selectedIconColor = Teal600,
                  selectedTextColor = Teal600,
                  indicatorColor = Teal100.copy(alpha = 0.4f),
                  unselectedIconColor = Slate400,
                  unselectedTextColor = Slate400
                ),
                icon = {
                  Icon(
                    imageVector = if (selectedTab == 1) Icons.Filled.List else Icons.Default.List,
                    contentDescription = "Rules"
                  )
                },
                label = { Text("Configure Rules", style = MaterialTheme.typography.labelSmall) }
              )
              NavigationBarItem(
                selected = selectedTab == 2,
                onClick = { viewModel.setSelectedTab(2) },
                colors = NavigationBarItemDefaults.colors(
                  selectedIconColor = Teal600,
                  selectedTextColor = Teal600,
                  indicatorColor = Teal100.copy(alpha = 0.4f),
                  unselectedIconColor = Slate400,
                  unselectedTextColor = Slate400
                ),
                icon = {
                  Icon(
                    imageVector = if (selectedTab == 2) Icons.Filled.PlayArrow else Icons.Default.PlayArrow,
                    contentDescription = "Specimen Sandbox"
                  )
                },
                label = { Text("Workspace", style = MaterialTheme.typography.labelSmall) }
              )
            }
          }
        ) { innerPadding ->
          Box(
            modifier = Modifier
              .fillMaxSize()
              .padding(innerPadding)
          ) {
            when (selectedTab) {
              0 -> DashboardScreen(viewModel = viewModel, evidenceFiles = evidenceFiles)
              1 -> RulesScreen(viewModel = viewModel, rules = rules)
              2 -> SandboxScreen(viewModel = viewModel)
            }
          }
        }
      }
    }
  }
}
