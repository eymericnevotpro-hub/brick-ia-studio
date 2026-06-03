package com.discipline.app.data

import org.json.JSONObject
import java.util.UUID

/**
 * One slot of the daily schedule.
 *
 * @param remind show a silent lock-screen notification at the slot time
 * @param alarm  ring a full-screen alarm (sound + vibration) at the slot time
 */
data class Task(
    val id: String = UUID.randomUUID().toString(),
    val label: String = "",
    val hour: Int = 9,
    val minute: Int = 0,
    val durationMin: Int = 30,
    val remind: Boolean = true,
    val alarm: Boolean = false,
) {
    /** Minutes since midnight, used for sorting and "current/next" logic. */
    val startMinutes: Int get() = hour * 60 + minute
    val endMinutes: Int get() = startMinutes + durationMin

    fun timeLabel(): String = "%02d:%02d".format(hour, minute)

    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("label", label)
        put("hour", hour)
        put("minute", minute)
        put("durationMin", durationMin)
        put("remind", remind)
        put("alarm", alarm)
    }

    companion object {
        fun fromJson(o: JSONObject): Task = Task(
            id = o.optString("id", UUID.randomUUID().toString()),
            label = o.optString("label", ""),
            hour = o.optInt("hour", 9),
            minute = o.optInt("minute", 0),
            durationMin = o.optInt("durationMin", 30),
            remind = o.optBoolean("remind", true),
            alarm = o.optBoolean("alarm", false),
        )
    }
}
