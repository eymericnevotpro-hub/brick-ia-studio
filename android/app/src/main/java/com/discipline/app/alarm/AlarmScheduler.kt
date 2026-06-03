package com.discipline.app.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.discipline.app.MainActivity
import com.discipline.app.data.ScheduleRepository
import com.discipline.app.data.Task
import org.json.JSONArray
import java.util.Calendar

/**
 * Arms one exact alarm per task (notification or ringing) at its next
 * occurrence. Re-run it after any schedule change, after each fire, and on
 * boot — it always cancels the previous set first.
 */
object AlarmScheduler {

    const val EXTRA_TASK_ID = "task_id"
    const val EXTRA_LABEL = "label"
    const val EXTRA_TIME = "time"
    const val EXTRA_IS_ALARM = "is_alarm"

    private const val PREFS = "discipline"
    private const val KEY_SCHEDULED = "scheduled_ids"

    fun rescheduleAll(ctx: Context) {
        val app = ctx.applicationContext
        Notifications.ensureChannels(app)
        val am = app.getSystemService(AlarmManager::class.java)
        val tasks = ScheduleRepository.loadTasks(app)

        cancelPrevious(app, am)

        val scheduledNow = JSONArray()
        for (task in tasks) {
            if (!task.remind && !task.alarm) continue
            val triggerAt = nextTrigger(task)
            val op = operationIntent(app, task)
            if (task.alarm) {
                val info = AlarmManager.AlarmClockInfo(triggerAt, showIntent(app))
                am.setAlarmClock(info, op)
            } else {
                if (canExact(am)) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, op)
                } else {
                    am.set(AlarmManager.RTC_WAKEUP, triggerAt, op)
                }
            }
            scheduledNow.put(task.id)
        }
        app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(KEY_SCHEDULED, scheduledNow.toString()).apply()
    }

    private fun cancelPrevious(ctx: Context, am: AlarmManager) {
        val raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_SCHEDULED, "[]") ?: "[]"
        val ids = runCatching {
            val a = JSONArray(raw)
            (0 until a.length()).map { a.getString(it) }
        }.getOrDefault(emptyList())
        for (id in ids) {
            am.cancel(operationIntentForId(ctx, id))
        }
    }

    private fun nextTrigger(task: Task): Long {
        val cal = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, task.hour)
            set(Calendar.MINUTE, task.minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        if (cal.timeInMillis <= System.currentTimeMillis() + 1000) {
            cal.add(Calendar.DAY_OF_MONTH, 1)
        }
        return cal.timeInMillis
    }

    private fun requestCode(id: String): Int = id.hashCode()

    private fun operationIntent(ctx: Context, task: Task): PendingIntent {
        val intent = Intent(ctx, AlarmReceiver::class.java).apply {
            putExtra(EXTRA_TASK_ID, task.id)
            putExtra(EXTRA_LABEL, task.label)
            putExtra(EXTRA_TIME, task.timeLabel())
            putExtra(EXTRA_IS_ALARM, task.alarm)
        }
        return PendingIntent.getBroadcast(ctx, requestCode(task.id), intent, piFlags())
    }

    private fun operationIntentForId(ctx: Context, id: String): PendingIntent {
        val intent = Intent(ctx, AlarmReceiver::class.java)
        return PendingIntent.getBroadcast(ctx, requestCode(id), intent, piFlags())
    }

    private fun showIntent(ctx: Context): PendingIntent {
        val intent = Intent(ctx, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        return PendingIntent.getActivity(ctx, 1, intent, piFlags())
    }

    private fun piFlags(): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        else PendingIntent.FLAG_UPDATE_CURRENT

    private fun canExact(am: AlarmManager): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) am.canScheduleExactAlarms() else true
}
