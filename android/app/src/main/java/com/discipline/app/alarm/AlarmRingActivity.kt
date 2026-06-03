package com.discipline.app.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Full-screen, ringing alarm shown over the lock screen. */
class AlarmRingActivity : ComponentActivity() {

    private var player: MediaPlayer? = null
    private var vibrator: Vibrator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        showOverLockScreen()

        val label = intent.getStringExtra(AlarmScheduler.EXTRA_LABEL) ?: "Ta tâche"
        val time = intent.getStringExtra(AlarmScheduler.EXTRA_TIME).orEmpty()
        val taskId = intent.getStringExtra(AlarmScheduler.EXTRA_TASK_ID).orEmpty()

        startRinging()

        setContent {
            AlarmScreen(
                label = label,
                time = time,
                onStop = { stopAndFinish() },
                onSnooze = {
                    snooze(taskId, label, time)
                    stopAndFinish()
                },
            )
        }
    }

    private fun showOverLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
            )
        }
    }

    private fun startRinging() {
        val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
        runCatching {
            player = MediaPlayer().apply {
                setDataSource(this@AlarmRingActivity, uri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build(),
                )
                isLooping = true
                prepare()
                start()
            }
        }

        val pattern = longArrayOf(0, 600, 600)
        vibrator = vibratorOf(this)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(pattern, 0)
        }
    }

    private fun snooze(taskId: String, label: String, time: String) {
        val am = getSystemService(AlarmManager::class.java)
        val intent = Intent(this, AlarmReceiver::class.java).apply {
            putExtra(AlarmScheduler.EXTRA_TASK_ID, taskId.ifBlank { "snooze" })
            putExtra(AlarmScheduler.EXTRA_LABEL, label)
            putExtra(AlarmScheduler.EXTRA_TIME, time)
            putExtra(AlarmScheduler.EXTRA_IS_ALARM, true)
        }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val pi = PendingIntent.getBroadcast(this, (taskId + "snooze").hashCode(), intent, flags)
        val triggerAt = System.currentTimeMillis() + 5 * 60 * 1000
        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi)
    }

    private fun stopAndFinish() {
        runCatching { player?.stop(); player?.release() }
        player = null
        vibrator?.cancel()
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        runCatching { player?.release() }
        vibrator?.cancel()
    }

    companion object {
        private fun vibratorOf(ctx: Context): Vibrator =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                (ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                ctx.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }
    }
}

@Composable
private fun AlarmScreen(
    label: String,
    time: String,
    onStop: () -> Unit,
    onSnooze: () -> Unit,
) {
    val orange = Color(0xFFFF6A1A)
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(0.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Text("⏰", fontSize = 72.sp)
            if (time.isNotEmpty()) {
                Text(
                    time,
                    fontSize = 64.sp,
                    fontWeight = FontWeight.Bold,
                    color = orange,
                )
            }
            Text(
                label,
                fontSize = 22.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 12.dp, bottom = 48.dp),
            )
            Button(
                onClick = onStop,
                colors = ButtonDefaults.buttonColors(containerColor = orange),
                shape = RoundedCornerShape(999.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp),
            ) {
                Text("J'y vais", fontSize = 20.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
            }
            OutlinedButton(
                onClick = onSnooze,
                shape = RoundedCornerShape(999.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp)
                    .height(56.dp),
            ) {
                Text("Encore 5 minutes", fontSize = 16.sp)
            }
        }
    }
}
