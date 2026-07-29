package expo.modules.notificationcapture

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Persistência local de rascunhos capturados (SharedPreferences).
 * Nada é enviado ao servidor. Métodos públicos nunca lançam exceção.
 */
object NotificationDraftStore {
  private const val TAG = "NotificationDraftStore"
  private const val PREFS = "organizecontas_notification_capture"
  private const val KEY_CAPTURE_ENABLED = "capture_enabled"
  private const val KEY_MODO_APRENDIZADO = "modo_aprendizado"
  private const val KEY_PACKAGES = "pacotes_permitidos"
  private const val KEY_ALIASES = "aliases_bancarios"
  private const val KEY_DRAFTS = "drafts"
  private const val KEY_LAST_ERROR = "last_error"
  private const val KEY_LAST_ERROR_AT = "last_error_at"
  private const val MAX_DRAFTS = 50
  private const val MAX_TEXT_LEN = 500
  private const val MAX_ERROR_LEN = 300

  private fun prefs(context: Context): SharedPreferences? {
    return try {
      context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    } catch (t: Throwable) {
      Log.e(TAG, "Falha ao abrir SharedPreferences", t)
      null
    }
  }

  fun isCaptureEnabled(context: Context): Boolean {
    return try {
      prefs(context)?.getBoolean(KEY_CAPTURE_ENABLED, false) ?: false
    } catch (_: Throwable) {
      false
    }
  }

  fun setCaptureEnabled(context: Context, enabled: Boolean): Boolean {
    return try {
      prefs(context)?.edit()?.putBoolean(KEY_CAPTURE_ENABLED, enabled)?.apply()
      true
    } catch (t: Throwable) {
      Log.e(TAG, "setCaptureEnabled falhou", t)
      false
    }
  }

  fun isModoAprendizado(context: Context): Boolean {
    return try {
      prefs(context)?.getBoolean(KEY_MODO_APRENDIZADO, true) ?: true
    } catch (_: Throwable) {
      true
    }
  }

  fun setModoAprendizado(context: Context, enabled: Boolean) {
    try {
      prefs(context)?.edit()?.putBoolean(KEY_MODO_APRENDIZADO, enabled)?.apply()
    } catch (t: Throwable) {
      Log.e(TAG, "setModoAprendizado falhou", t)
    }
  }

  fun getPacotesPermitidos(context: Context): Set<String> {
    return try {
      readStringSet(prefs(context)?.getString(KEY_PACKAGES, "[]"))
    } catch (_: Throwable) {
      emptySet()
    }
  }

  fun getAliasesBancarios(context: Context): List<String> {
    return try {
      readStringList(prefs(context)?.getString(KEY_ALIASES, "[]"))
    } catch (_: Throwable) {
      emptyList()
    }
  }

  fun syncFilterConfig(
    context: Context,
    modoAprendizado: Boolean,
    pacotes: List<String>,
    aliases: List<String>,
  ): Boolean {
    return try {
      val packagesJson = JSONArray(
        pacotes.map { it.trim().lowercase() }.filter { it.isNotEmpty() }
      )
      val aliasesJson = JSONArray(
        aliases.map { it.trim().lowercase() }.filter { it.isNotEmpty() }
      )
      prefs(context)?.edit()
        ?.putBoolean(KEY_MODO_APRENDIZADO, modoAprendizado)
        ?.putString(KEY_PACKAGES, packagesJson.toString())
        ?.putString(KEY_ALIASES, aliasesJson.toString())
        ?.apply()
      true
    } catch (t: Throwable) {
      Log.e(TAG, "syncFilterConfig falhou", t)
      false
    }
  }

  fun getDraftsJson(context: Context): String {
    return try {
      val raw = prefs(context)?.getString(KEY_DRAFTS, "[]") ?: "[]"
      // Valida; se corrompido, reseta
      try {
        JSONArray(raw)
        raw
      } catch (_: Throwable) {
        resetDrafts(context)
        "[]"
      }
    } catch (_: Throwable) {
      "[]"
    }
  }

  fun getDrafts(context: Context): JSONArray {
    return try {
      JSONArray(getDraftsJson(context))
    } catch (_: Throwable) {
      JSONArray()
    }
  }

  fun updateDraftStatus(context: Context, id: String, status: String): Boolean {
    return try {
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
      prefs(context)?.edit()?.putString(KEY_DRAFTS, drafts.toString())?.apply()
      true
    } catch (t: Throwable) {
      Log.e(TAG, "updateDraftStatus falhou", t)
      false
    }
  }

  fun deleteDraft(context: Context, id: String): Boolean {
    return try {
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
      prefs(context)?.edit()?.putString(KEY_DRAFTS, next.toString())?.apply()
      true
    } catch (t: Throwable) {
      Log.e(TAG, "deleteDraft falhou", t)
      false
    }
  }

  fun clearDrafts(context: Context): Boolean {
    return try {
      resetDrafts(context)
      true
    } catch (_: Throwable) {
      false
    }
  }

  fun tryAddDraft(
    context: Context,
    pacoteOrigem: String,
    appOrigem: String?,
    titulo: String?,
    textoSanitizado: String,
    recebidoEmMillis: Long,
  ): Boolean {
    return try {
      val texto = sanitizeText(textoSanitizado)
      if (texto.isBlank()) return false

      val pacote = pacoteOrigem.trim().take(200)
      if (pacote.isEmpty()) return false

      val tituloSafe = titulo?.let { sanitizeText(it) }?.ifBlank { null }
      val minuto = if (recebidoEmMillis > 0) recebidoEmMillis / 60_000L else System.currentTimeMillis() / 60_000L
      val id = sha256Hex("$pacote|${tituloSafe.orEmpty()}|$texto|$minuto")

      val drafts = getDrafts(context)
      for (i in 0 until drafts.length()) {
        val item = drafts.optJSONObject(i) ?: continue
        if (item.optString("id") == id) {
          return false
        }
      }

      val agoraIso = toIso(System.currentTimeMillis())
      val recebidoIso = toIso(if (recebidoEmMillis > 0) recebidoEmMillis else System.currentTimeMillis())

      val draft = JSONObject().apply {
        put("id", id)
        put("origem", "notification_listener")
        put("pacoteOrigem", pacote)
        put("appOrigem", appOrigem?.take(120) ?: JSONObject.NULL)
        put("titulo", tituloSafe ?: JSONObject.NULL)
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
        val item = drafts.opt(i) ?: continue
        next.put(item)
      }

      prefs(context)?.edit()?.putString(KEY_DRAFTS, next.toString())?.apply()
      true
    } catch (t: Throwable) {
      Log.e(TAG, "tryAddDraft falhou", t)
      recordLastError(context, "tryAddDraft: ${t.javaClass.simpleName}: ${t.message}")
      false
    }
  }

  fun sanitizeText(raw: String?): String {
    return try {
      if (raw.isNullOrBlank()) return ""
      val collapsed = buildString(raw.length.coerceAtMost(MAX_TEXT_LEN + 50)) {
        var spaces = 0
        for (ch in raw) {
          val code = ch.code
          if (code in 0..31 || code == 127) {
            if (spaces == 0) {
              append(' ')
              spaces = 1
            }
            continue
          }
          if (ch.isWhitespace()) {
            if (spaces == 0) {
              append(' ')
              spaces = 1
            }
          } else {
            append(ch)
            spaces = 0
          }
          if (length >= MAX_TEXT_LEN) break
        }
      }.trim()
      if (collapsed.length <= MAX_TEXT_LEN) collapsed else collapsed.substring(0, MAX_TEXT_LEN)
    } catch (_: Throwable) {
      ""
    }
  }

  fun recordLastError(context: Context, message: String?) {
    try {
      val msg = (message ?: "erro desconhecido").take(MAX_ERROR_LEN)
      prefs(context)?.edit()
        ?.putString(KEY_LAST_ERROR, msg)
        ?.putString(KEY_LAST_ERROR_AT, toIso(System.currentTimeMillis()))
        ?.apply()
    } catch (_: Throwable) {
      // ignore
    }
  }

  fun getLastError(context: Context): String? {
    return try {
      prefs(context)?.getString(KEY_LAST_ERROR, null)
    } catch (_: Throwable) {
      null
    }
  }

  fun getLastErrorAt(context: Context): String? {
    return try {
      prefs(context)?.getString(KEY_LAST_ERROR_AT, null)
    } catch (_: Throwable) {
      null
    }
  }

  fun clearLastError(context: Context) {
    try {
      prefs(context)?.edit()
        ?.remove(KEY_LAST_ERROR)
        ?.remove(KEY_LAST_ERROR_AT)
        ?.apply()
    } catch (_: Throwable) {
      // ignore
    }
  }

  private fun resetDrafts(context: Context) {
    try {
      prefs(context)?.edit()?.putString(KEY_DRAFTS, "[]")?.apply()
    } catch (t: Throwable) {
      Log.e(TAG, "resetDrafts falhou", t)
    }
  }

  private fun toIso(millis: Long): String {
    return try {
      val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
      sdf.timeZone = TimeZone.getTimeZone("UTC")
      sdf.format(Date(millis.coerceAtLeast(0L)))
    } catch (_: Throwable) {
      ""
    }
  }

  private fun sha256Hex(input: String): String {
    return try {
      val digest = MessageDigest.getInstance("SHA-256").digest(input.toByteArray(Charsets.UTF_8))
      digest.joinToString("") { "%02x".format(it) }
    } catch (_: Throwable) {
      // Fallback estável o bastante para dedupe nesta sessão
      "fallback-${input.hashCode().toUInt().toString(16)}"
    }
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
    } catch (_: Throwable) {
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
    } catch (_: Throwable) {
      emptyList()
    }
  }
}
