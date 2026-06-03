package com.discipline.app

import android.Manifest
import android.app.TimePickerDialog
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.discipline.app.alarm.AlarmScheduler
import com.discipline.app.alarm.Notifications
import com.discipline.app.data.ScheduleRepository
import com.discipline.app.data.Task
import com.discipline.app.ui.DisciplineTheme
import com.discipline.app.widget.ScheduleWidget

class MainActivity : ComponentActivity() {

    private val requestNotif =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        Notifications.ensureChannels(this)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestNotif.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
        AlarmScheduler.rescheduleAll(this)
        ScheduleWidget.refresh(this)

        setContent {
            DisciplineTheme {
                ScheduleScreen()
            }
        }
    }
}

private val ORANGE = Color(0xFFFF6A1A)
private val INK = Color(0xFF1A1208)
private val MUTED = Color(0xFF6B5D4F)

@Composable
private fun ScheduleScreen() {
    val ctx = LocalContext.current

    var tasks by remember { mutableStateOf(ScheduleRepository.loadTasks(ctx)) }
    var done by remember { mutableStateOf(ScheduleRepository.doneToday(ctx)) }
    var editing by remember { mutableStateOf<Task?>(null) }
    val streak = remember(tasks, done) { ScheduleRepository.streak(ctx) }

    fun persist(newTasks: List<Task>) {
        val sorted = newTasks.sortedBy { it.startMinutes }
        tasks = sorted
        ScheduleRepository.saveTasks(ctx, sorted)
        AlarmScheduler.rescheduleAll(ctx)
        ScheduleWidget.refresh(ctx)
    }

    fun toggle(id: String) {
        ScheduleRepository.toggleDone(ctx, id)
        done = ScheduleRepository.doneToday(ctx)
        ScheduleWidget.refresh(ctx)
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        floatingActionButton = {
            FloatingActionButton(onClick = { editing = Task() }, containerColor = ORANGE) {
                Icon(Icons.Filled.Add, contentDescription = "Ajouter", tint = Color.White)
            }
        },
    ) { inner ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(inner)
                .padding(horizontal = 16.dp),
        ) {
            item { Header(done = done.size, total = tasks.size, streak = streak) }
            item { Spacer(Modifier.height(8.dp)) }
            items(tasks, key = { it.id }) { task ->
                TaskRow(
                    task = task,
                    done = done.contains(task.id),
                    onToggle = { toggle(task.id) },
                    onEdit = { editing = task },
                )
                Spacer(Modifier.height(10.dp))
            }
            item { Spacer(Modifier.height(80.dp)) }
        }
    }

    editing?.let { task ->
        val isNew = tasks.none { it.id == task.id }
        TaskEditor(
            task = task,
            isNew = isNew,
            onDismiss = { editing = null },
            onSave = { updated ->
                persist(if (isNew) tasks + updated else tasks.map { if (it.id == updated.id) updated else it })
                editing = null
            },
            onDelete = {
                persist(tasks.filter { it.id != task.id })
                editing = null
            },
        )
    }
}

@Composable
private fun Header(done: Int, total: Int, streak: Int) {
    val pct = if (total > 0) done.toFloat() / total else 0f
    Column(modifier = Modifier.padding(top = 24.dp, bottom = 8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("🔥", fontSize = 30.sp)
            Spacer(Modifier.width(8.dp))
            Column {
                Text("Discipline", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = INK)
                Text("Ton emploi du temps", fontSize = 13.sp, color = MUTED)
            }
            Spacer(Modifier.weight(1f))
            Column(horizontalAlignment = Alignment.End) {
                Text("$streak", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = ORANGE)
                Text(if (streak > 1) "jours de série" else "jour de série", fontSize = 11.sp, color = MUTED)
            }
        }
        Spacer(Modifier.height(16.dp))
        Card(
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(20.dp),
        ) {
            Column(Modifier.padding(18.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Aujourd'hui", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = INK)
                    Spacer(Modifier.weight(1f))
                    Text("$done / $total", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = ORANGE)
                }
                Spacer(Modifier.height(10.dp))
                LinearProgressIndicator(
                    progress = { pct },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(10.dp)
                        .clip(RoundedCornerShape(999.dp)),
                    color = ORANGE,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun TaskRow(task: Task, done: Boolean, onToggle: () -> Unit, onEdit: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(
            containerColor = if (done) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.surface,
        ),
        shape = RoundedCornerShape(18.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(if (done) ORANGE else MaterialTheme.colorScheme.surfaceVariant, CircleShape)
                    .clickable { onToggle() },
                contentAlignment = Alignment.Center,
            ) {
                if (done) {
                    Icon(Icons.Filled.Check, contentDescription = "Fait", tint = Color.White, modifier = Modifier.size(20.dp))
                }
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    task.timeLabel(),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (done) MUTED else ORANGE,
                )
                Text(
                    task.label.ifBlank { "(sans titre)" },
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    color = INK,
                    textDecoration = if (done) TextDecoration.LineThrough else TextDecoration.None,
                )
                Spacer(Modifier.height(2.dp))
                Text("${task.durationMin} min", fontSize = 11.sp, color = MUTED)
            }
            if (task.alarm) {
                Icon(Icons.Filled.Alarm, contentDescription = "Alarme", tint = ORANGE, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
            } else if (task.remind) {
                Icon(Icons.Filled.Notifications, contentDescription = "Rappel", tint = MUTED, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
            }
            IconButton(onClick = onEdit) {
                Icon(Icons.Filled.Edit, contentDescription = "Modifier", tint = MUTED)
            }
        }
    }
}

@Composable
private fun TaskEditor(
    task: Task,
    isNew: Boolean,
    onDismiss: () -> Unit,
    onSave: (Task) -> Unit,
    onDelete: () -> Unit,
) {
    val ctx = LocalContext.current
    var label by remember { mutableStateOf(task.label) }
    var hour by remember { mutableStateOf(task.hour) }
    var minute by remember { mutableStateOf(task.minute) }
    var duration by remember { mutableStateOf(task.durationMin) }
    var remind by remember { mutableStateOf(task.remind) }
    var alarm by remember { mutableStateOf(task.alarm) }

    AlertDialog(
        onDismissRequest = onDismiss,
        confirmButton = {
            Button(
                onClick = {
                    onSave(task.copy(label = label.trim(), hour = hour, minute = minute, durationMin = duration, remind = remind, alarm = alarm))
                },
                enabled = label.isNotBlank(),
            ) { Text(if (isNew) "Ajouter" else "Enregistrer") }
        },
        dismissButton = {
            if (!isNew) {
                TextButton(onClick = onDelete) {
                    Icon(Icons.Filled.Delete, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("Supprimer")
                }
            } else {
                TextButton(onClick = onDismiss) { Text("Annuler") }
            }
        },
        title = { Text(if (isNew) "Nouvelle tâche" else "Modifier la tâche") },
        text = {
            Column {
                OutlinedTextField(
                    value = label,
                    onValueChange = { label = it },
                    label = { Text("Nom de la tâche") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(14.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Heure", fontSize = 14.sp, color = INK)
                    Spacer(Modifier.weight(1f))
                    OutlinedButton(onClick = {
                        TimePickerDialog(ctx, { _, h, m -> hour = h; minute = m }, hour, minute, true).show()
                    }) {
                        Text("%02d:%02d".format(hour, minute), fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Durée", fontSize = 14.sp, color = INK)
                    Spacer(Modifier.weight(1f))
                    OutlinedButton(onClick = { if (duration > 5) duration -= 5 }) { Text("−") }
                    Spacer(Modifier.width(8.dp))
                    Text("$duration min", fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    Spacer(Modifier.width(8.dp))
                    OutlinedButton(onClick = { duration += 5 }) { Text("+") }
                }
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Rappel (notification)", fontSize = 14.sp, color = INK)
                        Text("Sur l'écran verrouillé", fontSize = 11.sp, color = MUTED)
                    }
                    Switch(checked = remind, onCheckedChange = { remind = it })
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Alarme (sonne)", fontSize = 14.sp, color = INK)
                        Text("Plein écran + son + vibration", fontSize = 11.sp, color = MUTED)
                    }
                    Switch(checked = alarm, onCheckedChange = { alarm = it })
                }
            }
        },
    )
}
