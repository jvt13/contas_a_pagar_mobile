package expo.modules.notificationcapture

import android.app.NotificationManager
import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationCaptureModule : Module() {
  private val contextOrNull
    get() = try {
      appContext.reactContext
    } catch (_: Throwable) {
      null
    }

  override fun definition() = ModuleDefinition {
    Name("NotificationCapture")

    Function("isSupported") {
      true
    }

    Function("isNotificationAccessEnabled") {
      try {
        isListenerEnabled()
      } catch (t: Throwable) {
        Log.e(TAG, "isNotificationAccessEnabled falhou", t)
        false
      }
    }

    AsyncFunction("openNotificationAccessSettings") {
      try {
        openListenerSettings()
      } catch (t: Throwable) {
        Log.e(TAG, "openNotificationAccessSettings falhou", t)
        false
      }
    }

    Function("isCaptureEnabled") {
      try {
        val ctx = contextOrNull ?: return@Function false
        NotificationDraftStore.isCaptureEnabled(ctx)
      } catch (_: Throwable) {
        false
      }
    }

    AsyncFunction("setCaptureEnabled") { enabled: Boolean ->
      try {
        val ctx = contextOrNull ?: return@AsyncFunction false
        NotificationDraftStore.setCaptureEnabled(ctx, enabled)
      } catch (_: Throwable) {
        false
      }
    }

    AsyncFunction("syncFilterConfig") { config: Map<String, Any?> ->
      try {
        val ctx = contextOrNull ?: return@AsyncFunction false
        val modo = when (val v = config["modoAprendizado"]) {
          is Boolean -> v
          is Number -> v.toInt() != 0
          else -> NotificationDraftStore.isModoAprendizado(ctx)
        }
        val pacotes = toStringList(config["pacotesPermitidos"])
        val aliases = toStringList(config["aliasesBancarios"])
        NotificationDraftStore.syncFilterConfig(ctx, modo, pacotes, aliases)
      } catch (t: Throwable) {
        Log.e(TAG, "syncFilterConfig falhou", t)
        false
      }
    }

    Function("getDrafts") {
      try {
        val ctx = contextOrNull ?: return@Function "[]"
        NotificationDraftStore.getDraftsJson(ctx)
      } catch (_: Throwable) {
        "[]"
      }
    }

    AsyncFunction("updateDraftStatus") { id: String, status: String ->
      try {
        val ctx = contextOrNull ?: return@AsyncFunction false
        NotificationDraftStore.updateDraftStatus(ctx, id, status)
      } catch (_: Throwable) {
        false
      }
    }

    AsyncFunction("deleteDraft") { id: String ->
      try {
        val ctx = contextOrNull ?: return@AsyncFunction false
        NotificationDraftStore.deleteDraft(ctx, id)
      } catch (_: Throwable) {
        false
      }
    }

    AsyncFunction("clearDrafts") {
      try {
        val ctx = contextOrNull ?: return@AsyncFunction false
        NotificationDraftStore.clearDrafts(ctx)
      } catch (_: Throwable) {
        false
      }
    }

    Function("getLastError") {
      try {
        val ctx = contextOrNull ?: return@Function null
        val msg = NotificationDraftStore.getLastError(ctx) ?: return@Function null
        val at = NotificationDraftStore.getLastErrorAt(ctx)
        mapOf(
          "message" to msg,
          "at" to (at ?: "")
        )
      } catch (_: Throwable) {
        null
      }
    }

    AsyncFunction("clearLastError") {
      try {
        val ctx = contextOrNull ?: return@AsyncFunction false
        NotificationDraftStore.clearLastError(ctx)
        true
      } catch (_: Throwable) {
        false
      }
    }
  }

  /**
   * Abre a tela especial de Acesso a notificações (Notification Listener).
   * Nunca usa ACTION_APPLICATION_DETAILS_SETTINGS (Informações do app).
   */
  private fun openListenerSettings(): Boolean {
    val ctx = contextOrNull ?: return false
    val component = ComponentName(ctx, NotificationCaptureService::class.java)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val detail = Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).apply {
        putExtra(
          Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
          component.flattenToString()
        )
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      if (startSafely(detail)) {
        return true
      }
    }

    val listIntent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      val key = ":settings:fragment_args_key"
      val value = component.flattenToString()
      putExtra(key, value)
      putExtra(
        ":settings:show_fragment_args",
        Bundle().apply { putString(key, value) }
      )
    }
    if (startSafely(listIntent)) {
      return true
    }

    val plain = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    return startSafely(plain)
  }

  private fun startSafely(intent: Intent): Boolean {
    return try {
      val activity = try {
        appContext.currentActivity
      } catch (_: Throwable) {
        null
      }
      val ctx = contextOrNull ?: return false
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        ctx.startActivity(intent)
      }
      true
    } catch (_: Exception) {
      false
    }
  }

  private fun isListenerEnabled(): Boolean {
    val ctx = contextOrNull ?: return false
    val component = ComponentName(ctx, NotificationCaptureService::class.java)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      try {
        val nm = ctx.getSystemService(NotificationManager::class.java)
        if (nm != null && nm.isNotificationListenerAccessGranted(component)) {
          return true
        }
      } catch (_: Exception) {
        // fallback Secure abaixo
      }
    }

    val flat = try {
      Settings.Secure.getString(ctx.contentResolver, "enabled_notification_listeners")
    } catch (_: Throwable) {
      null
    }
    if (flat.isNullOrBlank()) {
      return false
    }

    val targetFlat = component.flattenToString()
    val pkg = ctx.packageName
    val className = NotificationCaptureService::class.java.name

    return flat.split(":").any { entry ->
      try {
        if (entry.equals(targetFlat, ignoreCase = true)) {
          return@any true
        }
        val cn = ComponentName.unflattenFromString(entry) ?: return@any false
        cn.packageName.equals(pkg, ignoreCase = true) &&
          cn.className.equals(className, ignoreCase = true)
      } catch (_: Throwable) {
        false
      }
    }
  }

  private fun toStringList(value: Any?): List<String> {
    return try {
      when (value) {
        is List<*> -> value.mapNotNull { it?.toString()?.trim() }.filter { it.isNotEmpty() }
        is Array<*> -> value.mapNotNull { it?.toString()?.trim() }.filter { it.isNotEmpty() }
        else -> emptyList()
      }
    } catch (_: Throwable) {
      emptyList()
    }
  }

  companion object {
    private const val TAG = "NotificationCaptureMod"
  }
}
