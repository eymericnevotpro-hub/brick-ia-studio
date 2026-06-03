package com.discipline.app.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * Single source of truth for the schedule, backed by SharedPreferences so the
 * UI process, the widget, and the alarm receivers all read the same data.
 */
object ScheduleRepository {

    private const val PREFS = "discipline"
    private const val KEY_TASKS = "tasks"
    private const val KEY_HISTORY = "history"
    private const val KEY_SEEDED = "seeded"

    private fun prefs(ctx: Context) =
        ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    // ---- tasks ----------------------------------------------------------

    fun loadTasks(ctx: Context): List<Task> {
        val p = prefs(ctx)
        if (!p.getBoolean(KEY_SEEDED, false)) {
            val seed = defaultTasks()
            saveTasks(ctx, seed)
            p.edit().putBoolean(KEY_SEEDED, true).apply()
            return seed
        }
        val raw = p.getString(KEY_TASKS, null) ?: return emptyList()
        return runCatching {
            val arr = JSONArray(raw)
            (0 until arr.length()).map { Task.fromJson(arr.getJSONObject(it)) }
        }.getOrDefault(emptyList()).sortedBy { it.startMinutes }
    }

    fun saveTasks(ctx: Context, tasks: List<Task>) {
        val arr = JSONArray()
        tasks.sortedBy { it.startMinutes }.forEach { arr.put(it.toJson()) }
        prefs(ctx).edit().putString(KEY_TASKS, arr.toString()).apply()
    }

    // ---- daily completion + streak -------------------------------------

    fun todayKey(cal: Calendar = Calendar.getInstance()): String =
        "%04d-%02d-%02d".format(
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH) + 1,
            cal.get(Calendar.DAY_OF_MONTH),
        )

    private fun history(ctx: Context): JSONObject =
        runCatching { JSONObject(prefs(ctx).getString(KEY_HISTORY, "{}") ?: "{}") }
            .getOrDefault(JSONObject())

    fun doneToday(ctx: Context): Set<String> {
        val arr = history(ctx).optJSONArray(todayKey()) ?: return emptySet()
        return (0 until arr.length()).map { arr.getString(it) }.toSet()
    }

    fun toggleDone(ctx: Context, id: String) {
        val h = history(ctx)
        val key = todayKey()
        val current = h.optJSONArray(key)?.let { a ->
            (0 until a.length()).map { a.getString(it) }.toMutableSet()
        } ?: mutableSetOf()
        if (!current.add(id)) current.remove(id)
        h.put(key, JSONArray(current.toList()))
        prefs(ctx).edit().putString(KEY_HISTORY, h.toString()).apply()
    }

    /** Consecutive days (ending today or yesterday) that hit at least half the tasks. */
    fun streak(ctx: Context): Int {
        val total = loadTasks(ctx).size
        if (total == 0) return 0
        val threshold = (total + 1) / 2
        val h = history(ctx)
        val cal = Calendar.getInstance()
        var streak = 0
        var allowSkipToday = true
        for (i in 0 until 365) {
            val key = todayKey(cal)
            val count = h.optJSONArray(key)?.length() ?: 0
            if (count >= threshold) {
                streak++
            } else if (i == 0 && allowSkipToday) {
                // Today not done yet — don't break the streak, just skip it.
                allowSkipToday = false
            } else {
                break
            }
            cal.add(Calendar.DAY_OF_MONTH, -1)
        }
        return streak
    }

    // ---- defaults -------------------------------------------------------

    fun defaultTasks(): List<Task> = listOf(
        Task(label = "Réveil + 10 min sans téléphone", hour = 7, minute = 30, durationMin = 30, alarm = true),
        Task(label = "Sport / mouvement", hour = 8, minute = 0, durationMin = 30),
        Task(label = "Deep work — la tâche la plus importante", hour = 9, minute = 0, durationMin = 120),
        Task(label = "Pause déjeuner", hour = 12, minute = 30, durationMin = 60, remind = false),
        Task(label = "Travail de l'après-midi", hour = 14, minute = 0, durationMin = 120),
        Task(label = "Bilan du jour + plan de demain", hour = 18, minute = 30, durationMin = 15),
        Task(label = "Coucher (écran éteint)", hour = 22, minute = 30, durationMin = 15, alarm = true),
    )
}
