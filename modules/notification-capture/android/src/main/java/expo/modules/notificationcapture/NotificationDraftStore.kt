package expo.modules.notificationcapture

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Persistência local de rascunhos capturados (SharedPreferences).
 * Nada é enviado ao servidor.
 */
object NotificationDraftStore {
  private const val PREFS = "organizecontas_notification_capture"
  private const val KEY_CAPTURE_ENABLED = "capture_enabled"
  private const val KEY_MODO_APRENDIZADO = "modo_aprendizado"
  private const val KEY_PACKAGES = "pacotes_permitidos"
  private const val KEY_ALIASES = "aliases_bancarios"
  private const val KEY_DRAFTS = "drafts"
  private const val MAX_DRAFTS = 50
  private const val MAX_TEXT_LEN = 500

  private fun prefs(context: Context): SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun isCaptureEnabled(context: Context): Boolean =
    prefs(context).getBoolean(KEY_CAPTURE_ENABLED, false)

  fun setCaptureEnabled(context: Context, enabled: Boolean) {
    prefs(context).edit().putBoolean(KEY_CAPTURE_ENABLED, enabled).apply()
  }

  fun isModoAprendizado(context: Context): Boolean =
    prefs(context).getBoolean(KEY_MODO_APRENDIZADO, true)

  fun setModoAprendizado(context: Context, enabled: Boolean) {
    prefs(context).edit().putBoolean(KEY_MODO_APRENDIZADO, enabled).apply()
  }

  fun getPacotesPermitidos(context: Context): Set<String> =
    readStringSet(prefs(context).getString(KEY_PACKAGES, "[]"))

  fun getAliasesBancarios(context: Context): List<String> =
    readStringList(prefs(context).getString(KEY_ALIASES, "[]"))

  fun syncFilterConfig(
    context: Context,
    modoAprendizado: Boolean,
    pacotes: List<String>,
    aliases: List<String>,
  ) {
    val packagesJson = JSONArray(pacotes.map { it.trim().lowercase() }.filter { it.isNotEmpty() })
    val aliasesJson = JSONArray(aliases.map { it.trim().lowercase() }.filter { it.isNotEmpty() })
    prefs(context).edit()
      .putBoolean(KEY_MODO_APRENDIZADO, modoAprendizado)
      .putString(KEY_PACKAGES, packagesJson.toString())
      .putString(KEY_ALIASES, aliasesJson.toString())
      .apply()
  }

  fun getDraftsJson(context: Context): String =
    prefs(context).getString(KEY_DRAFTS, "[]") ?: "[]"

  fun getDrafts(context: Context): JSONArray {
    return try {
      JSONArray(getDraftsJson(context))
    } catch (_: Exception) {
      JSONArray()
    }
  }

  fun updateDraftStatus(context: Context, id: String, status: String): Boolean {
    val allowed = setOf("pendente", "importado", "ignorado")
    if (!allowed.contains(status)) return false
    val drafts = getDrafts(context)
    var found = false
    for (i in 0 until drafts.length()) {
      val item = drafts.optJSONObject(i) ?: continue
      if (item.optString("id") == id) {
        item.put("status", status)
        found = true
        break
      }
    }
    if (!found) return false
    prefs(context).edit().putString(KEY_DRAFTS, drafts.toString()).apply()
    return true
  }

  fun deleteDraft(context: Context, id: String): Boolean {
    val drafts = getDrafts(context)
    val next = JSONArray()
    var found = false
    for (i in 0 until drafts.length()) {
      val item = drafts.optJSONObject(i) ?: continue
      if (item.optString("id") == id) {
        found = true
        continue
      }
      next.put(item)
    }
    if (!found) return false
    prefs(context).edit().putString(KEY_DRAFTS, next.toString()).apply()
    return true
  }

  fun clearDrafts(context: Context) {
    prefs(context).edit().putString(KEY_DRAFTS, "[]").apply()
  }

  fun tryAddDraft(
    context: Context,
    pacoteOrigem: String,
    appOrigem: String?,
    titulo: String?,
    textoSanitizado: String,
    recebidoEmMillis: Long,
  ): Boolean {
    val texto = sanitizeText(textoSanitizado)
    if (texto.isBlank()) return false

    val minuto = recebidoEmMillis / 60_000L
    val id = sha256Hex("$pacoteOrigem|${titulo.orEmpty()}|$texto|$minuto")

    val drafts = getDrafts(context)
    for (i in 0 until drafts.length()) {
      val item = drafts.optJSONObject(i) ?: continue
      if (item.optString("id") == id) {
        return false
      }
    }

    val agoraIso = toIso(System.currentTimeMillis())
    val recebidoIso = toIso(recebidoEmMillis)

    val draft = JSONObject().apply {
      put("id", id)
      put("origem", "notification_listener")
      put("pacoteOrigem", pacoteOrigem)
      put("appOrigem", appOrigem ?: JSONObject.NULL)
      put("titulo", titulo ?: JSONObject.NULL)
      put("textoSanitizado", texto)
      put("recebidoEm", recebidoIso)
      put("preLancamento", JSONObject.NULL)
      put("status", "pendente")
      put("criadoEm", agoraIso)
    }

    val next = JSONArray()
    next.put(draft)
    for (i in 0 until drafts.length()) {
      if (next.length() >= MAX_DRAFTS) break
      next.put(drafts.get(i))
    }

    prefs(context).edit().putString(KEY_DRAFTS, next.toString()).apply()
    return true
  }

  fun sanitizeText(raw: String?): String {
    if (raw.isNullOrBlank()) return ""
    val collapsed = raw
      .replace(Regex("[\\u0000-\\u001F\\u007F]"), " ")
      .replace(Regex("\\s+"), " ")
      .trim()
    return if (collapsed.length <= MAX_TEXT_LEN) {
      collapsed
    } else {
      collapsed.substring(0, MAX_TEXT_LEN)
    }
  }

  private fun toIso(millis: Long): String {
    val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    sdf.timeZone = TimeZone.getTimeZone("UTC")
    return sdf.format(Date(millis))
  }

  private fun sha256Hex(input: String): String {
    val digest = MessageDigest.getInstance("SHA-256").digest(input.toByteArray(Charsets.UTF_8))
    return digest.joinToString("") { "%02x".format(it) }
  }

  private fun readStringSet(raw: String?): Set<String> {
    return try {
      val arr = JSONArray(raw ?: "[]")
      buildSet {
        for (i in 0 until arr.length()) {
          val v = arr.optString(i).trim().lowercase()
          if (v.isNotEmpty()) add(v)
        }
      }
    } catch (_: Exception) {
      emptySet()
    }
  }

  private fun readStringList(raw: String?): List<String> {
    return try {
      val arr = JSONArray(raw ?: "[]")
      buildList {
        for (i in 0 until arr.length()) {
          val v = arr.optString(i).trim().lowercase()
          if (v.isNotEmpty()) add(v)
        }
      }
    } catch (_: Exception) {
      emptyList()
    }
  }
}
