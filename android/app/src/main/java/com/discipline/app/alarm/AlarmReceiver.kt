package com.discipline.app.alarm

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.discipline.app.MainActivity
import com.discipline.app.R
import com.discipline.app.widget.ScheduleWidget

/** Fired by AlarmManager at a task's time. Shows a reminder or rings an alarm. */
class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val ctx = context.applicationContext
        // Bare intents (used only for cancellation) carry no task id — ignore.
        val taskId = intent.getStringExtra(AlarmScheduler.EXTRA_TASK_ID) ?: return
        val label = intent.getStringExtra(AlarmScheduler.EXTRA_LABEL).orEmpty().ifBlank { "Ta tâche" }
        val time = intent.getStringExtra(AlarmScheduler.EXTRA_TIME).orEmpty()
        val isAlarm = intent.getBooleanExtra(AlarmScheduler.EXTRA_IS_ALARM, false)

        Notifications.ensureChannels(ctx)
        if (isAlarm) showAlarm(ctx, taskId, label, time) else showReminder(ctx, taskId, label, time)

        // Re-arm the next occurrence (tomorrow) and refresh the widget.
        AlarmScheduler.rescheduleAll(ctx)
        ScheduleWidget.refresh(ctx)
    }

    private fun openAppIntent(ctx: Context): PendingIntent {
        val intent = Intent(ctx, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        return PendingIntent.getActivity(ctx, 0, intent, immutableFlags())
    }

    private fun showReminder(ctx: Context, id: String, label: String, time: String) {
        val n = NotificationCompat.Builder(ctx, Notifications.CHANNEL_REMINDER)
            .setSmallIcon(R.drawable.ic_stat_flame)
            .setContentTitle(label)
            .setContentText(if (time.isNotEmpty()) "$time — c'est le moment." else "C'est le moment.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(openAppIntent(ctx))
            .build()
        notify(ctx, id.hashCode(), n)
    }

    private fun showAlarm(ctx: Context, id: String, label: String, time: String) {
        val full = Intent(ctx, AlarmRingActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra(AlarmScheduler.EXTRA_TASK_ID, id)
            putExtra(AlarmScheduler.EXTRA_LABEL, label)
            putExtra(AlarmScheduler.EXTRA_TIME, time)
        }
        val fullPi = PendingIntent.getActivity(ctx, id.hashCode(), full, immutableFlags())

        val n = NotificationCompat.Builder(ctx, Notifications.CHANNEL_ALARM)
            .setSmallIcon(R.drawable.ic_stat_flame)
            .setContentTitle("⏰ $label")
            .setContentText(if (time.isNotEmpty()) "$time — debout !" else "C'est l'heure !")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setOngoing(true)
            .setAutoCancel(true)
            .setFullScreenIntent(fullPi, true)
            .setContentIntent(fullPi)
            .build()
        notify(ctx, id.hashCode(), n)
    }

    private fun notify(ctx: Context, id: Int, n: android.app.Notification) {
        if (NotificationManagerCompat.from(ctx).areNotificationsEnabled()) {
            try {
                NotificationManagerCompat.from(ctx).notify(id, n)
            } catch (_: SecurityException) {
                // POST_NOTIFICATIONS not granted yet — nothing else to do.
            }
        }
    }

    private fun immutableFlags(): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        else PendingIntent.FLAG_UPDATE_CURRENT
}
