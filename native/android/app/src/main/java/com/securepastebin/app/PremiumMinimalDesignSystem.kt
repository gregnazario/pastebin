// Premium minimal design system tokens and reusable Compose components.
package com.securepastebin.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

private val premiumLightColorScheme = lightColorScheme(
    primary = Color(0xFF2B6A86),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFD3E8F2),
    onPrimaryContainer = Color(0xFF0D2B39),
    surface = Color(0xFFF5F7F9),
    onSurface = Color(0xFF1B1F23),
    surfaceVariant = Color(0xFFE7ECF0),
    onSurfaceVariant = Color(0xFF414B55),
    background = Color(0xFFF1F4F7),
    error = Color(0xFFB3261E),
)

private val premiumTypography = Typography(
    titleLarge = Typography().titleLarge.copy(fontWeight = FontWeight.SemiBold),
    titleMedium = Typography().titleMedium.copy(fontWeight = FontWeight.SemiBold),
    titleSmall = Typography().titleSmall.copy(fontWeight = FontWeight.Medium),
    bodyLarge = Typography().bodyLarge.copy(fontWeight = FontWeight.Normal),
    bodyMedium = Typography().bodyMedium.copy(fontWeight = FontWeight.Normal),
    bodySmall = Typography().bodySmall.copy(color = Color(0xFF5B6773)),
)

private val premiumShapes = Shapes(
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(18.dp),
    large = RoundedCornerShape(24.dp),
)

@Composable
fun SecurePastebinPremiumTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = premiumLightColorScheme,
        typography = premiumTypography,
        shapes = premiumShapes,
        content = content,
    )
}

@Composable
fun PremiumMinimalBackdrop(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    val gradient = Brush.linearGradient(
        colors = listOf(
            Color(0xFFF8FAFC),
            Color(0xFFEAF0F5),
        ),
    )

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(gradient),
        content = content,
    )
}

@Composable
fun PremiumSectionCard(
    modifier: Modifier = Modifier,
    title: String? = null,
    contentPadding: Dp = 14.dp,
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        color = Color.White.copy(alpha = 0.88f),
        tonalElevation = 2.dp,
        shadowElevation = 10.dp,
    ) {
        Column(modifier = Modifier.padding(contentPadding)) {
            if (!title.isNullOrBlank()) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
            }
            content()
        }
    }
}

@Composable
fun PremiumPrimaryButton(
    text: String,
    onClick: () -> Unit,
    enabled: Boolean,
    modifier: Modifier = Modifier,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ),
        modifier = modifier,
    ) {
        Text(text)
    }
}
