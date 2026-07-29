package expo.modules.notificationcapture

import android.app.Notification
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * Serviço nativo de captura experimental.
 * Regra absoluta: nenhuma exceção pode escapar — o app não pode cair
 * por causa do NotificationListenerService.
 */
class NotificationCaptureService : NotificationListenerService() {

  override fun onCreate() {
    try {
      super.onCreate()
    } catch (t: Throwable) {
      Log.e(TAG, "onCreate falhou", t)
    }
  }

  override fun onListenerConnected() {
    try {
      super.onListenerConnected()
    } catch (t: Throwable) {
      Log.e(TAG, "onListenerConnected falhou", t)
      NotificationDraftStore.recordLastError(applicationContext, "onListenerConnected: ${t.message}")
    }
  }

  override fun onListenerDisconnected() {
    try {
      super.onListenerDisconnected()
    } catch (t: Throwable) {
      Log.e(TAG, "onListenerDisconnected falhou", t)
    }
  }

  override fun onDestroy() {
    try {
      super.onDestroy()
    } catch (t: Throwable) {
      Log.e(TAG, "onDestroy falhou", t)
    }
  }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    try {
      processNotificationPosted(sbn)
    } catch (t: Throwable) {
      Log.e(TAG, "Erro ao processar notificação", t)
      try {
        NotificationDraftStore.recordLastError(
          applicationContext,
          "onNotificationPosted: ${t.javaClass.simpleName}: ${t.message}"
        )
      } catch (_: Throwable) {
        // ignore
      }
    }
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification?) {
    // Não processamos remoções; apenas evita crash se o sistema chamar.
    try {
      // no-op
    } catch (t: Throwable) {
      Log.e(TAG, "onNotificationRemoved falhou", t)
    }
  }

  private fun processNotificationPosted(sbn: StatusBarNotification?) {
    if (sbn == null) return

    val context = try {
      applicationContext
    } catch (_: Throwable) {
      return
    } ?: return

    // Captura desativada no app: sair imediatamente (mesmo com permissão Android).
    if (!NotificationDraftStore.isCaptureEnabled(context)) {
      return
    }

    val pacote = try {
      sbn.packageName
    } catch (_: Throwable) {
      null
    }
    if (pacote.isNullOrBlank()) return

    // Ignora notificações do próprio app
    val meuPacote = try {
      context.packageName
    } catch (_: Throwable) {
      null
    }
    if (meuPacote != null && pacote == meuPacote) {
      return
    }

    val notification = try {
      sbn.notification
    } catch (t: Throwable) {
      Log.w(TAG, "Falha ao ler notification de $pacote", t)
      null
    } ?: return

    val extras = try {
      notification.extras
    } catch (t: Throwable) {
      Log.w(TAG, "Falha ao ler extras de $pacote", t)
      null
    }

    val titulo = safeExtraText(extras, Notification.EXTRA_TITLE).ifBlank { null }
    val texto = safeExtraText(extras, Notification.EXTRA_TEXT)
    val bigText = safeExtraText(extras, Notification.EXTRA_BIG_TEXT)

    val textoUtil = when {
      bigText.isNotBlank() && (texto.isBlank() || bigText.contains(texto)) -> bigText
      texto.isNotBlank() && bigText.isNotBlank() -> {
        val joined = "$texto $bigText"
        if (joined.length > 800) joined.take(800) else joined
      }
      texto.isNotBlank() -> texto
      bigText.isNotBlank() -> bigText
      else -> ""
    }

    val combinado = NotificationDraftStore.sanitizeText(
      listOfNotNull(titulo, textoUtil.ifBlank { null }).joinToString(" ")
    )
    if (combinado.isBlank()) return

    val textoNorm = normalize(combinado)

    if (temSinaisIgnorar(textoNorm)) return
    if (!temSinaisTransacao(textoNorm)) return

    val appOrigem = resolverNomeApp(pacote)
    val pacotesPermitidos = NotificationDraftStore.getPacotesPermitidos(context)
    val aliases = NotificationDraftStore.getAliasesBancarios(context)
    val modoAprendizado = NotificationDraftStore.isModoAprendizado(context)

    val pacoteLower = pacote.lowercase()
    val pacoteConhecido = pacotesPermitidos.contains(pacoteLower)
    val aliasMatch = aliases.any { alias ->
      alias.isNotBlank() && (
        textoNorm.contains(alias) ||
          normalize(appOrigem ?: "").contains(alias) ||
          normalize(titulo ?: "").contains(alias)
        )
    }

    val permitido = when {
      pacoteConhecido -> true
      aliasMatch -> true
      pacotesPermitidos.isEmpty() && modoAprendizado -> true
      modoAprendizado -> true
      else -> false
    }
    if (!permitido) return

    val textoParaSalvar = when {
      textoUtil.isNotBlank() -> textoUtil
      else -> combinado
    }

    val whenMs = try {
      val post = sbn.postTime
      if (post > 0L) post else System.currentTimeMillis()
    } catch (_: Throwable) {
      System.currentTimeMillis()
    }

    NotificationDraftStore.tryAddDraft(
      context = context,
      pacoteOrigem = pacote,
      appOrigem = appOrigem,
      titulo = titulo,
      textoSanitizado = textoParaSalvar,
      recebidoEmMillis = whenMs,
    )
  }

  private fun safeExtraText(extras: Bundle?, key: String): String {
    if (extras == null) return ""
    return try {
      val value = extras.get(key)
      val raw = when (value) {
        null -> ""
        is CharSequence -> value.toString()
        else -> value.toString()
      }
      NotificationDraftStore.sanitizeText(raw)
    } catch (t: Throwable) {
      Log.w(TAG, "Falha ao ler extra $key", t)
      ""
    }
  }

  private fun resolverNomeApp(packageName: String): String? {
    return try {
      val pm = packageManager ?: return null
      val info = if (Build.VERSION.SDK_INT >= 33) {
        pm.getApplicationInfo(packageName, PackageManager.ApplicationInfoFlags.of(0))
      } else {
        @Suppress("DEPRECATION")
        pm.getApplicationInfo(packageName, 0)
      }
      pm.getApplicationLabel(info)?.toString()
    } catch (_: Throwable) {
      null
    }
  }

  private fun normalize(texto: String): String {
    return try {
      texto
        .lowercase(LocalePt)
        .replace('à', 'a').replace('á', 'a').replace('â', 'a').replace('ã', 'a').replace('ä', 'a')
        .replace('è', 'e').replace('é', 'e').replace('ê', 'e').replace('ë', 'e')
        .replace('ì', 'i').replace('í', 'i').replace('î', 'i').replace('ï', 'i')
        .replace('ò', 'o').replace('ó', 'o').replace('ô', 'o').replace('õ', 'o').replace('ö', 'o')
        .replace('ù', 'u').replace('ú', 'u').replace('û', 'u').replace('ü', 'u')
        .replace('ç', 'c')
    } catch (_: Throwable) {
      try {
        texto.lowercase()
      } catch (_: Throwable) {
        texto
      }
    }
  }

  private fun temSinaisIgnorar(textoNorm: String): Boolean {
    return try {
      val critico = listOf(
        "codigo", "token", "otp", "senha", "login",
        "verificacao", "nao compartilhe", "security code", "codigo de seguranca",
      )
      if (critico.any { textoNorm.contains(it) }) {
        return true
      }

      val promo = listOf(
        "promocao", "propaganda", "oferta imperdivel", "abra o app para",
      )
      val temPromo = promo.any { textoNorm.contains(it) }
      if (!temPromo) return false

      val temValor = textoNorm.contains("r$") || textoNorm.contains("rs ") ||
        textoNorm.contains(Regex("""\d+,\d{2}"""))
      !temValor
    } catch (_: Throwable) {
      // Em dúvida, ignorar (não processar)
      true
    }
  }

  private fun temSinaisTransacao(textoNorm: String): Boolean {
    return try {
      val temValor = textoNorm.contains("r$") ||
        textoNorm.contains("rs ") ||
        Regex("""\d{1,3}(?:\.\d{3})*,\d{2}""").containsMatchIn(textoNorm)
      if (!temValor) return false

      val sinais = listOf(
        "compra", "aprovad", "cartao", "card",
        "credito", "debito", "pix",
        "pagamento", "transferencia",
        "recebido", "enviado", "pagou", "pagamos",
      )
      sinais.any { textoNorm.contains(it) }
    } catch (_: Throwable) {
      false
    }
  }

  companion object {
    private const val TAG = "NotificationCapture"
    private val LocalePt = java.util.Locale("pt", "BR")
  }
}
