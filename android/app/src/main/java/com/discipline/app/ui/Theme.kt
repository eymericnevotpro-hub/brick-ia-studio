package com.discipline.app.ui

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DisciplineColors = lightColorScheme(
    primary = Color(0xFFFF6A1A),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFFFE0C7),
    onPrimaryContainer = Color(0xFF7A2E00),
    secondary = Color(0xFFC44A00),
    background = Color(0xFFFFF4E8),
    onBackground = Color(0xFF1A1208),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF1A1208),
    surfaceVariant = Color(0xFFFFEAD6),
    onSurfaceVariant = Color(0xFF6B5D4F),
    outline = Color(0xFFEFE1CE),
)

@Composable
fun DisciplineTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = DisciplineColors, content = content)
}
