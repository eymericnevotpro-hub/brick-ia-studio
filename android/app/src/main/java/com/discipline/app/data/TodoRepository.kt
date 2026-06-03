package com.discipline.app.data

import android.content.Context
import org.json.JSONArray

/** SharedPreferences-backed store for the editable to-do list. */
object TodoRepository {

    private const val PREFS = "discipline"
    private const val KEY_TODOS = "todos"
    private const val KEY_SEEDED = "todos_seeded"

    private fun prefs(ctx: Context) =
        ctx.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun load(ctx: Context): List<Todo> {
        val p = prefs(ctx)
        if (!p.getBoolean(KEY_SEEDED, false)) {
            val seed = listOf(
                Todo(text = "Boire un grand verre d'eau"),
                Todo(text = "Ranger mon bureau 2 min"),
                Todo(text = "Noter 1 victoire d'aujourd'hui"),
            )
            save(ctx, seed)
            p.edit().putBoolean(KEY_SEEDED, true).apply()
            return seed
        }
        val raw = p.getString(KEY_TODOS, null) ?: return emptyList()
        return runCatching {
            val arr = JSONArray(raw)
            (0 until arr.length()).map { Todo.fromJson(arr.getJSONObject(it)) }
        }.getOrDefault(emptyList())
    }

    fun save(ctx: Context, todos: List<Todo>) {
        val arr = JSONArray()
        todos.forEach { arr.put(it.toJson()) }
        prefs(ctx).edit().putString(KEY_TODOS, arr.toString()).apply()
    }

    fun add(ctx: Context, text: String) {
        val t = text.trim()
        if (t.isEmpty()) return
        save(ctx, load(ctx) + Todo(text = t))
    }

    fun toggle(ctx: Context, id: String) {
        save(ctx, load(ctx).map { if (it.id == id) it.copy(done = !it.done) else it })
    }

    fun updateText(ctx: Context, id: String, text: String) {
        save(ctx, load(ctx).map { if (it.id == id) it.copy(text = text.trim()) else it })
    }

    fun remove(ctx: Context, id: String) {
        save(ctx, load(ctx).filter { it.id != id })
    }

    /** Remove all completed items. */
    fun clearDone(ctx: Context) {
        save(ctx, load(ctx).filterNot { it.done })
    }
}
