package com.discipline.app.widget

import android.content.Context
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.items
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextDecoration
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.discipline.app.MainActivity
import com.discipline.app.data.TodoRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

private val ORANGE = Color(0xFFFF6A1A)
private val INK = Color(0xFF1A1208)
private val CREAM = Color(0xFFFFF4E8)
private val MUTED = Color(0xFF6B5D4F)

private val TODO_ID = ActionParameters.Key<String>("todo_id")

class TodoWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val todos = TodoRepository.load(context)
        provideContent {
            Column(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(CREAM)
                    .cornerRadius(20.dp)
                    .padding(14.dp),
            ) {
                Row(
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .clickable(actionStartActivity<MainActivity>(actionParametersOf(OPEN_TAB to "todo"))),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "✅ À faire",
                        style = TextStyle(color = ColorProvider(ORANGE), fontSize = 14.sp, fontWeight = FontWeight.Bold),
                    )
                    Spacer(GlanceModifier.width(8.dp))
                    Text(
                        "＋",
                        style = TextStyle(color = ColorProvider(MUTED), fontSize = 16.sp, fontWeight = FontWeight.Bold),
                    )
                }
                Spacer(GlanceModifier.height(8.dp))

                if (todos.isEmpty()) {
                    Text(
                        "Rien à faire. Touche ＋ pour ajouter.",
                        style = TextStyle(color = ColorProvider(MUTED), fontSize = 13.sp),
                    )
                } else {
                    LazyColumn {
                        items(todos, itemId = { it.id.hashCode().toLong() }) { todo ->
                            Row(
                                modifier = GlanceModifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp)
                                    .clickable(
                                        actionRunCallback<ToggleTodoAction>(
                                            actionParametersOf(TODO_ID to todo.id),
                                        ),
                                    ),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    if (todo.done) "☑" else "☐",
                                    style = TextStyle(
                                        color = ColorProvider(if (todo.done) ORANGE else MUTED),
                                        fontSize = 18.sp,
                                    ),
                                )
                                Spacer(GlanceModifier.width(10.dp))
                                Text(
                                    todo.text,
                                    style = TextStyle(
                                        color = ColorProvider(if (todo.done) MUTED else INK),
                                        fontSize = 14.sp,
                                        textDecoration = if (todo.done) TextDecoration.LineThrough else TextDecoration.None,
                                    ),
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    companion object {
        val OPEN_TAB = ActionParameters.Key<String>("open_tab")

        fun refresh(ctx: Context) {
            CoroutineScope(Dispatchers.Default).launch {
                TodoWidget().updateAll(ctx.applicationContext)
            }
        }
    }
}

/** Toggles one to-do item straight from the widget, then redraws it. */
class ToggleTodoAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        val id = parameters[TODO_ID] ?: return
        TodoRepository.toggle(context, id)
        TodoWidget().update(context, glanceId)
    }
}

class TodoWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TodoWidget()
}
