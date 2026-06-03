package com.discipline.app.data

import org.json.JSONObject
import java.util.UUID

/** A free-form to-do item (separate from the timed schedule). */
data class Todo(
    val id: String = UUID.randomUUID().toString(),
    val text: String = "",
    val done: Boolean = false,
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("id", id)
        put("text", text)
        put("done", done)
    }

    companion object {
        fun fromJson(o: JSONObject): Todo = Todo(
            id = o.optString("id", UUID.randomUUID().toString()),
            text = o.optString("text", ""),
            done = o.optBoolean("done", false),
        )
    }
}
