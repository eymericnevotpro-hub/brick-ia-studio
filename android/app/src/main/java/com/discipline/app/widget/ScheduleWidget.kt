package com.discipline.app.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.defaultWeight
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.discipline.app.MainActivity
import com.discipline.app.data.ScheduleRepository
import com.discipline.app.data.Task
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.Calendar

private val ORANGE = Color(0xFFFF6A1A)
private val INK = Color(0xFF1A1208)
private val CREAM = Color(0xFFFFF4E8)
private val MUTED = Color(0xFF6B5D4F)

/** Snapshot rendered by the widget — computed off the shared repository. */
private data class WidgetData(
    val headline: String,
    val sub: String,
    val done: Int,
    val total: Int,
    val now: Boolean,
)

private fun buildData(ctx: Context): WidgetData {
    val tasks = ScheduleRepository.loadTasks(ctx)
    val done = ScheduleRepository.doneToday(ctx)
    if (tasks.isEmpty()) {
        return WidgetData("Aucune tâche", "Ouvre l'app pour planifier", 0, 0, false)
    }
    val cal = Calendar.getInstance()
    val nowMin = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)

    val current: Task? = tasks.firstOrNull { nowMin in it.startMinutes until it.endMinutes }
    val next: Task? = tasks.firstOrNull { it.startMinutes > nowMin }
    val focus = current ?: next

    val headline = focus?.let { "${it.timeLabel()}  ${it.label}" } ?: "Journée terminée 🎉"
    val sub = when {
        current != null -> "● Maintenant"
        next != null -> "À venir"
        else -> "Repose-toi, tu l'as méritée."
    }
    return WidgetData(headline, sub, done.size, tasks.size, current != null)
}

class ScheduleWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val data = buildData(context)
        provideContent { WidgetUi(data) }
    }

    companion object {
        /** Redraw every placed widget after the schedule or completion changes. */
        fun refresh(ctx: Context) {
            CoroutineScope(Dispatchers.Default).launch {
                ScheduleWidget().updateAll(ctx.applicationContext)
            }
        }
    }
}

class ScheduleWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = ScheduleWidget()
}

@androidx.compose.runtime.Composable
private fun WidgetUi(data: WidgetData) {
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(CREAM)
            .cornerRadius(20.dp)
            .padding(16.dp)
            .clickable(actionStartActivity<MainActivity>()),
        verticalAlignment = Alignment.Top,
    ) {
        Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                "🔥 Discipline",
                style = TextStyle(color = ColorProvider(ORANGE), fontSize = 13.sp, fontWeight = FontWeight.Bold),
            )
            Spacer(GlanceModifier.defaultWeight())
            Text(
                "${data.done}/${data.total}",
                style = TextStyle(color = ColorProvider(MUTED), fontSize = 13.sp, fontWeight = FontWeight.Medium),
            )
        }

        Spacer(GlanceModifier.height(10.dp))

        Text(
            data.sub,
            style = TextStyle(
                color = ColorProvider(if (data.now) ORANGE else MUTED),
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
            ),
        )
        Spacer(GlanceModifier.height(4.dp))
        Text(
            data.headline,
            style = TextStyle(color = ColorProvider(INK), fontSize = 18.sp, fontWeight = FontWeight.Bold),
        )
    }
}
