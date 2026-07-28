package expo.modules.notificationcapture

import android.app.Notification
import android.content.pm.PackageManager
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * Serviço nativo que captura notificações postadas no aparelho.
 * Só persiste rascunhos locais quando a captura experimental está ativa
 * e a notificação passa pelos filtros locais (sem envio ao servidor).
 */
class NotificationCaptureService : NotificationListenerService() {

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    if (sbn == null) return
    val context = applicationContext

    if (!NotificationDraftStore.isCaptureEnabled(context)) {
      return
    }

    // Ignora notificações do próprio app
    if (sbn.packageName == context.packageName) {
      return
    }

    val notification = sbn.notification ?: return
    val extras = notification.extras ?: return

    val titulo = NotificationDraftStore.sanitizeText(
      extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
    ).ifBlank { null }

    val texto = NotificationDraftStore.sanitizeText(
      extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
    )

    val bigText = NotificationDraftStore.sanitizeText(
      extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
    )

    val textoUtil = when {
      bigText.isNotBlank() && (texto.isBlank() || bigText.contains(texto)) -> bigText
      texto.isNotBlank() && bigText.isNotBlank() -> "$texto $bigText"
      texto.isNotBlank() -> texto
      bigText.isNotBlank() -> bigText
      else -> ""
    }

    val combinado = listOfNotNull(titulo, textoUtil.ifBlank { null })
      .joinToString(" ")
      .let { NotificationDraftStore.sanitizeText(it) }

    if (combinado.isBlank()) {
      return
    }

    val textoNorm = normalize(combinado)

    if (temSinaisIgnorar(textoNorm)) {
      return
    }

    if (!temSinaisTransacao(textoNorm)) {
      return
    }

    val pacote = sbn.packageName ?: return
    val appOrigem = resolverNomeApp(pacote)
    val pacotesPermitidos = NotificationDraftStore.getPacotesPermitidos(context)
    val aliases = NotificationDraftStore.getAliasesBancarios(context)
    val modoAprendizado = NotificationDraftStore.isModoAprendizado(context)

    val pacoteConhecido = pacotesPermitidos.contains(pacote.lowercase())
    val aliasMatch = aliases.any { alias ->
      alias.isNotBlank() && (
        textoNorm.contains(alias) ||
          normalize(appOrigem ?: "").contains(alias) ||
          normalize(titulo ?: "").contains(alias)
        )
    }

    // Sem pacotes cadastrados: em modo aprendizado aceita qualquer notificação
    // com sinais de transação (para descobrir pacotes reais no teste).
    val permitido = when {
      pacoteConhecido -> true
      aliasMatch -> true
      pacotesPermitidos.isEmpty() && modoAprendizado -> true
      modoAprendizado -> true
      else -> false
    }

    if (!permitido) {
      return
    }

    // Prefere big text sanitizado para o parser; senão o combinado
    val textoParaSalvar = when {
      textoUtil.isNotBlank() -> textoUtil
      else -> combinado
    }

    val whenMs = if (sbn.postTime > 0) sbn.postTime else System.currentTimeMillis()

    NotificationDraftStore.tryAddDraft(
      context = context,
      pacoteOrigem = pacote,
      appOrigem = appOrigem,
      titulo = titulo,
      textoSanitizado = textoParaSalvar,
      recebidoEmMillis = whenMs,
    )
  }

  private fun resolverNomeApp(packageName: String): String? {
    return try {
      val pm = packageManager
      val info = if (Build.VERSION.SDK_INT >= 33) {
        pm.getApplicationInfo(packageName, PackageManager.ApplicationInfoFlags.of(0))
      } else {
        @Suppress("DEPRECATION")
        pm.getApplicationInfo(packageName, 0)
      }
      pm.getApplicationLabel(info)?.toString()
    } catch (_: Exception) {
      null
    }
  }

  private fun normalize(texto: String): String {
    return texto
      .lowercase(LocalePt)
      .replace(Regex("[àáâãä]"), "a")
      .replace(Regex("[èéêë]"), "e")
      .replace(Regex("[ìíîï]"), "i")
      .replace(Regex("[òóôõö]"), "o")
      .replace(Regex("[ùúûü]"), "u")
      .replace("ç", "c")
  }

  private fun temSinaisIgnorar(textoNorm: String): Boolean {
    val padroes = listOf(
      "codigo", "código", "token", "verificacao", "verificação",
      "login", "acesso", "senha", "otp", "autentic",
      "promocao", "promoção", "propaganda", "oferta imperdivel",
      "oferta imperdível", "abra o app para", "nao compartilhe",
      "não compartilhe", "security code", "codigo de seguranca",
      "código de segurança",
    )
    // Segurança sem valor: se parece OTP/login e não tem R$, ignora
    val temIgnorar = padroes.any { textoNorm.contains(it) }
    if (!temIgnorar) return false
    val temValor = Regex("""r\$\s*\d|rs\s*\d|\d+,\d{2}""").containsMatchIn(textoNorm)
    // Token/OTP/login sempre ignora; promoção só se sem valor de compra clara
    val critico = listOf(
      "codigo", "código", "token", "otp", "senha", "login",
      "verificacao", "verificação", "nao compartilhe", "não compartilhe",
      "security code", "codigo de seguranca", "código de segurança",
    ).any { textoNorm.contains(it) }
    if (critico) return true
    return !temValor
  }

  private fun temSinaisTransacao(textoNorm: String): Boolean {
    val temValor = Regex("""r\$\s*\d|rs\s*\d|\d{1,3}(?:\.\d{3})*,\d{2}""").containsMatchIn(textoNorm)
    val sinais = listOf(
      "compra", "aprovad", "cartao", "cartão", "card",
      "credito", "crédito", "debito", "débito", "pix",
      "pagamento", "transferencia", "transferência",
      "recebido", "enviado", "pagou", "pagamos",
    )
    val temSinal = sinais.any { textoNorm.contains(it) }
    // Exige valor monetário E pelo menos um sinal de transação (em dúvida, não cria)
    return temValor && temSinal
  }

  companion object {
    private val LocalePt = java.util.Locale("pt", "BR")
  }
}
