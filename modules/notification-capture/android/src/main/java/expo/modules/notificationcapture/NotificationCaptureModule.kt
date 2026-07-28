package expo.modules.notificationcapture

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.Exceptions

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
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
      true
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

  private fun isListenerEnabled(): Boolean {
    val pkgName = context.packageName
    val flat = Settings.Secure.getString(
      context.contentResolver,
      "enabled_notification_listeners"
    )
    if (flat.isNullOrBlank()) {
      return false
    }
    val names = flat.split(":").mapNotNull {
      ComponentName.unflattenFromString(it)
    }
    return names.any { it.packageName == pkgName }
  }

  private fun toStringList(value: Any?): List<String> {
    return when (value) {
      is List<*> -> value.mapNotNull { it?.toString()?.trim() }.filter { it.isNotEmpty() }
      is Array<*> -> value.mapNotNull { it?.toString()?.trim() }.filter { it.isNotEmpty() }
      else -> emptyList()
    }
  }
}
