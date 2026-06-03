package com.discipline.app.alarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

object Notifications {
    const val CHANNEL_REMINDER = "reminders"
    const val CHANNEL_ALARM = "alarms"

    fun ensureChannels(ctx: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = ctx.getSystemService(NotificationManager::class.java)

        val reminder = NotificationChannel(
            CHANNEL_REMINDER,
            "Rappels",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Rappels de tes tâches sur l'écran verrouillé"
        }

        // Silent channel: the full-screen AlarmRingActivity plays the sound and
        // vibration, so the notification itself must not ring (no double audio).
        val alarm = NotificationChannel(
            CHANNEL_ALARM,
            "Alarmes",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Alarmes sonores pour les tâches importantes"
            setSound(null, null)
            enableVibration(false)
            setBypassDnd(true)
        }

        nm.createNotificationChannel(reminder)
        nm.createNotificationChannel(alarm)
    }
}

