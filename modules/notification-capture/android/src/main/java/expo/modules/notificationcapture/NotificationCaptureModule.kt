package expo.modules.notificationcapture

import android.app.NotificationManager
import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NotificationCaptureModule : Module() {
  private val context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("NotificationCapture")

    Function("isSupported") {
      true
    }

    Function("isNotificationAccessEnabled") {
      isListenerEnabled()
    }

    AsyncFunction("openNotificationAccessSettings") {
      openListenerSettings()
    }

    Function("isCaptureEnabled") {
      NotificationDraftStore.isCaptureEnabled(context)
    }

    AsyncFunction("setCaptureEnabled") { enabled: Boolean ->
      NotificationDraftStore.setCaptureEnabled(context, enabled)
      true
    }

    AsyncFunction("syncFilterConfig") { config: Map<String, Any?> ->
      val modo = when (val v = config["modoAprendizado"]) {
        is Boolean -> v
        is Number -> v.toInt() != 0
        else -> NotificationDraftStore.isModoAprendizado(context)
      }
      val pacotes = toStringList(config["pacotesPermitidos"])
      val aliases = toStringList(config["aliasesBancarios"])
      NotificationDraftStore.syncFilterConfig(context, modo, pacotes, aliases)
      true
    }

    Function("getDrafts") {
      NotificationDraftStore.getDraftsJson(context)
    }

    AsyncFunction("updateDraftStatus") { id: String, status: String ->
      NotificationDraftStore.updateDraftStatus(context, id, status)
    }

    AsyncFunction("deleteDraft") { id: String ->
      NotificationDraftStore.deleteDraft(context, id)
    }

    AsyncFunction("clearDrafts") {
      NotificationDraftStore.clearDrafts(context)
      true
    }
  }

  /**
   * Abre a tela especial de Acesso a notificações (Notification Listener).
   * Nunca usa ACTION_APPLICATION_DETAILS_SETTINGS (Informações do app).
   */
  private fun openListenerSettings(): Boolean {
    val component = ComponentName(context, NotificationCaptureService::class.java)

    // API 30+: tela detalhada só do nosso listener
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

    // Lista geral de apps com acesso a notificações (+ highlight em alguns OEMs)
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

    // Último recurso: mesma action sem extras (alguns ROMs rejeitam extras)
    val plain = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    return startSafely(plain)
  }

  private fun startSafely(intent: Intent): Boolean {
    return try {
      val activity = appContext.currentActivity
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        context.startActivity(intent)
      }
      true
    } catch (_: Exception) {
      false
    }
  }

  private fun isListenerEnabled(): Boolean {
    val component = ComponentName(context, NotificationCaptureService::class.java)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      try {
        val nm = context.getSystemService(NotificationManager::class.java)
        if (nm != null && nm.isNotificationListenerAccessGranted(component)) {
          return true
        }
      } catch (_: Exception) {
        // fallback Secure abaixo
      }
    }

    val flat = Settings.Secure.getString(
      context.contentResolver,
      "enabled_notification_listeners"
    )
    if (flat.isNullOrBlank()) {
      return false
    }

    val targetFlat = component.flattenToString()
    val pkg = context.packageName
    val className = NotificationCaptureService::class.java.name

    return flat.split(":").any { entry ->
      if (entry.equals(targetFlat, ignoreCase = true)) {
        return@any true
      }
      val cn = ComponentName.unflattenFromString(entry) ?: return@any false
      cn.packageName.equals(pkg, ignoreCase = true) &&
        cn.className.equals(className, ignoreCase = true)
    }
  }

  private fun toStringList(value: Any?): List<String> {
    return when (value) {
      is List<*> -> value.mapNotNull { it?.toString()?.trim() }.filter { it.isNotEmpty() }
      is Array<*> -> value.mapNotNull { it?.toString()?.trim() }.filter { it.isNotEmpty() }
      else -> emptyList()
    }
  }
}
