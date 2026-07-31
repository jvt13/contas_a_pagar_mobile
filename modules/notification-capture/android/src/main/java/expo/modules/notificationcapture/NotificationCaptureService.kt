package expo.modules.notificationcapture

import android.app.Notification
import android.content.Context
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.text.Normalizer
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class NotificationCaptureService : NotificationListenerService() {
  override fun onCreate() {
    try {
      super.onCreate()
      Log.d("OCNotifListener", "onCreate")
    } catch (t: Throwable) {
      Log.e("OCNotifListener", "onCreate failed", t)
    }
  }

  override fun onListenerConnected() {
    try {
      super.onListenerConnected()
      Log.d("OCNotifListener", "onListenerConnected")
    } catch (t: Throwable) {
      Log.e("OCNotifListener", "onListenerConnected failed", t)
    }
  }

  override fun onListenerDisconnected() {
    try {
      super.onListenerDisconnected()
      Log.d("OCNotifListener", "onListenerDisconnected")
    } catch (t: Throwable) {
      Log.e("OCNotifListener", "onListenerDisconnected failed", t)
    }
  }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    try {
      Log.d("OCNotifListener", "onNotificationPosted")

      val pacote = try {
        sbn?.packageName
      } catch (_: Throwable) {
        null
      }.orEmpty().ifBlank { "unknown.package" }.sanitize(200)

      val prefs = applicationContext.getSharedPreferences(
        "organizecontas_notification_capture",
        Context.MODE_PRIVATE,
      )

      if (!prefs.getBoolean("capture_enabled", false)) {
        Log.d("OCNotifListener", "capture disabled in app")
        return
      }

      val allowedPackages = readAllowedPackages(prefs)
      if (allowedPackages.isEmpty()) {
        Log.d("OCNotifListener", "no allowed packages configured — draft ignored")
        return
      }
      if (!allowedPackages.contains(pacote.lowercase(Locale.ROOT))) {
        Log.d("OCNotifListener", "package not allowed: $pacote")
        return
      }

      val extras = try {
        sbn?.notification?.extras
      } catch (_: Throwable) {
        null
      }

      val title = readExtra(extras, Notification.EXTRA_TITLE, 200)
      val titleBig = readExtra(extras, Notification.EXTRA_TITLE_BIG, 200)
      val text = readExtra(extras, Notification.EXTRA_TEXT, 500)
      val subText = readExtra(extras, Notification.EXTRA_SUB_TEXT, 500)
      val bigText = readExtra(extras, Notification.EXTRA_BIG_TEXT, 1_000)

      val tituloFinal = title.ifBlank { titleBig }.ifBlank { "(sem título)" }
      val textoFinal = text.ifBlank { subText }.ifBlank { "(sem texto)" }
      val notificationText = listOf(title, titleBig, text, subText, bigText)
        .filter { it.isNotBlank() }
        .distinct()
        .joinToString(" ")

      val normalizedText = normalizeForFilter(notificationText)

      // Propaganda/marketing/loteria: descartar mesmo com R$ (ex.: "R$ 1 mil", Lotofácil).
      val hardBlockPromo = listOf(
        "concorra",
        "premio",
        "premios",
        "promocao",
        "oferta",
        "ganhe",
        "recarregue",
        "recarga pode",
        "sorteio",
        "cashback disponivel",
        "invista",
        "investimento",
        "cripto",
        "negocie cripto",
        "emprestimo",
        "limite aprovado",
        "cartao transporte",
        "sem pagar mais nada",
        "todas as semanas",
        "lotofacil",
        "loteria",
        "pague com saldo ou cartao",
      )
      if (hardBlockPromo.any { normalizedText.contains(it) }) {
        Log.d("OCNotifListener", "promotional/lottery notification ignored package=$pacote")
        return
      }

      // PIX recebido = entrada/receita — fora do escopo de despesas nesta versão.
      val pixReceivedSignals = listOf(
        "pix recebido",
        "voce recebeu um pix",
        "voce acaba de receber um pix",
        "acaba de receber um pix",
        "receber um pix",
        "recebeu pix",
        "valor recebido",
      )
      val pixOutboundSignals = listOf(
        "pix enviado",
        "pix realizado",
        "pix pago",
        "voce pagou com pix",
        "pagamento pix realizado",
        "pagamento via pix",
      )
      val isPixReceived = pixReceivedSignals.any { normalizedText.contains(it) }
      val isPixOutbound = pixOutboundSignals.any { normalizedText.contains(it) }
      if (isPixReceived && !isPixOutbound) {
        Log.d("OCNotifListener", "inbound PIX ignored as expense package=$pacote")
        return
      }

      val hasCurrency = Regex("""r\$\s*\d""", RegexOption.IGNORE_CASE)
        .containsMatchIn(notificationText)

      // Exige evento transacional concluído (não basta R$/cartão/pix genérico).
      val strongExpensePatterns = listOf(
        Regex("""compra\s+no\s+debito\s+aprovad"""),
        Regex("""compra\s+no\s+credito\s+aprovad"""),
        Regex("""compra\s+aprovad"""),
        Regex("""compra\s+de\s+r\$"""),
        Regex("""voce\s+pagou\s+r\$"""),
        Regex("""pagamento\s+aprovado"""),
        Regex("""pagamento\s+realizado"""),
        Regex("""debito\s+aprovad"""),
        Regex("""credito\s+aprovad"""),
        Regex("""pix\s+enviado"""),
        Regex("""pix\s+realizado"""),
        Regex("""pix\s+pago"""),
        Regex("""voce\s+pagou\s+com\s+pix"""),
        Regex("""pagamento\s+pix\s+realizado"""),
        Regex("""pagamento\s+via\s+pix"""),
        Regex("""transacao\s+aprovad"""),
        Regex("""autorizacao\s+aprovad"""),
        Regex("""foi\s+aprovad"""),
      )
      val hasStrongExpenseEvent = strongExpensePatterns.any { it.containsMatchIn(normalizedText) }

      if (!hasCurrency || !hasStrongExpenseEvent) {
        Log.d("OCNotifListener", "notification ignored — no strong expense event package=$pacote")
        return
      }

      val postTimeMillis = try {
        sbn?.postTime?.takeIf { it > 0L }
      } catch (_: Throwable) {
        null
      } ?: System.currentTimeMillis()
      val detectedValue = Regex(
        """r\$\s*\d+(?:[.,]\d+)*""",
        RegexOption.IGNORE_CASE,
      ).find(notificationText)?.value.orEmpty().sanitize(60)

      saveNotificationDraft(
        pacote = pacote,
        titulo = tituloFinal,
        texto = textoFinal,
        bigText = bigText,
        subText = subText,
        titleBig = titleBig,
        postTimeMillis = postTimeMillis,
        detectedValue = detectedValue,
        normalizedContent = normalizedText.sanitize(1_700),
      )
    } catch (t: Throwable) {
      Log.e("OCNotifListener", "notification capture failed", t)
    }
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification?) {
    try {
      Log.d("OCNotifListener", "onNotificationRemoved")
    } catch (t: Throwable) {
      Log.e("OCNotifListener", "onNotificationRemoved failed", t)
    }
  }

  override fun onDestroy() {
    try {
      Log.d("OCNotifListener", "onDestroy")
      super.onDestroy()
    } catch (t: Throwable) {
      Log.e("OCNotifListener", "onDestroy failed", t)
    }
  }

  private fun readExtra(extras: Bundle?, key: String, maxLength: Int): String {
    return try {
      extras?.getCharSequence(key)?.toString().orEmpty().sanitize(maxLength)
    } catch (t: Throwable) {
      Log.w("OCNotifListener", "Could not read notification extra=$key", t)
      ""
    }
  }

  private fun String.sanitize(maxLength: Int): String {
    return replace(Regex("[\\p{Cc}\\p{Zl}\\p{Zp}]+"), " ")
      .replace(Regex("\\s+"), " ")
      .trim()
      .take(maxLength)
  }

  private fun normalizeForFilter(value: String): String {
    return try {
      Normalizer.normalize(value, Normalizer.Form.NFD)
        .replace(Regex("\\p{M}+"), "")
        .lowercase(Locale.ROOT)
    } catch (_: Throwable) {
      value.lowercase(Locale.ROOT)
    }
  }

  private fun readAllowedPackages(prefs: android.content.SharedPreferences): Set<String> {
    return try {
      val raw = prefs.getString("pacotes_permitidos", "[]") ?: "[]"
      val arr = JSONArray(raw)
      buildSet {
        for (index in 0 until arr.length()) {
          val value = arr.optString(index).trim().lowercase(Locale.ROOT)
          if (value.isNotEmpty()) add(value)
        }
      }
    } catch (t: Throwable) {
      Log.e("OCNotifListener", "failed to read allowed packages", t)
      emptySet()
    }
  }

  private fun saveNotificationDraft(
    pacote: String,
    titulo: String,
    texto: String,
    bigText: String,
    subText: String,
    titleBig: String,
    postTimeMillis: Long,
    detectedValue: String,
    normalizedContent: String,
  ) {
    val now = System.currentTimeMillis()
    val prefs = applicationContext.getSharedPreferences(
      "organizecontas_notification_capture",
      Context.MODE_PRIVATE,
    )

    val current = try {
      JSONArray(prefs.getString("drafts", "[]") ?: "[]")
    } catch (_: Throwable) {
      JSONArray()
    }

    val formatter = SimpleDateFormat(
      "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
      Locale.US,
    ).apply {
      timeZone = TimeZone.getTimeZone("UTC")
    }
    val recebidoEm = formatter.format(Date(postTimeMillis))
    val criadoEm = formatter.format(Date(now))

    val mensagemOriginal = listOf(titulo, texto, bigText)
      .filter { it.isNotBlank() }
      .distinct()
      .joinToString("\n")
      .take(1_700)

    val normalizedTitle = normalizeForFilter(titulo).sanitize(200)
    val dedupeKey =
      "$pacote|$detectedValue|$normalizedTitle|$normalizedContent|${postTimeMillis / 60_000L}"
    for (index in 0 until current.length()) {
      if (current.optJSONObject(index)?.optString("dedupeKey") == dedupeKey) {
        Log.d("OCNotifListener", "duplicate notification ignored package=$pacote")
        return
      }
    }

    val sourceInfo = when {
      pacote.equals("com.picpay", ignoreCase = true) -> "PicPay" to "PicPay"
      pacote.equals("com.mercadopago.wallet", ignoreCase = true) ->
        "Mercado Pago" to "Mercado Pago"
      pacote.equals("com.nu.production", ignoreCase = true) -> "Nubank" to "Nubank"
      pacote.equals("com.itau", ignoreCase = true) ||
        pacote.equals("com.itau.iti", ignoreCase = true) -> "Itaú" to "Itaú"
      pacote.equals("com.bradesco", ignoreCase = true) -> "Bradesco" to "Bradesco"
      pacote.equals("com.santander.app", ignoreCase = true) -> "Santander" to "Santander"
      pacote.equals("br.com.bb.android", ignoreCase = true) ->
        "Banco do Brasil" to "Banco do Brasil"
      pacote.equals("br.com.intermedium", ignoreCase = true) -> "Inter" to "Inter"
      pacote.equals("com.c6bank.app", ignoreCase = true) -> "C6 Bank" to "C6 Bank"
      pacote.equals("br.gov.caixa.tem", ignoreCase = true) ||
        pacote.equals("br.gov.caixa.superapp", ignoreCase = true) -> "Caixa" to "Caixa"
      pacote.equals("br.com.neon", ignoreCase = true) -> "Neon" to "Neon"
      pacote.equals("br.com.sicredimobi.smart", ignoreCase = true) ||
        pacote.equals("br.com.sicredi.app", ignoreCase = true) -> "Sicredi" to "Sicredi"
      pacote.equals("br.com.sicoobnet", ignoreCase = true) -> "Sicoob" to "Sicoob"
      pacote.equals("br.livetouch.safra.net", ignoreCase = true) -> "Safra" to "Safra"
      pacote.equals("io.cloudwalk.infinitepaydash", ignoreCase = true) ->
        "InfinitePay" to "InfinitePay"
      else -> pacote to null
    }

    val draft = JSONObject().apply {
      put("id", "notification-$postTimeMillis-${System.nanoTime()}")
      put("status", "pendente")
      put("origem", "notification_listener")
      put("pacote", pacote)
      put("pacoteOrigem", pacote)
      put("appName", sourceInfo.first)
      put("appOrigem", sourceInfo.first)
      put("bancoInferido", sourceInfo.second ?: JSONObject.NULL)
      put("titulo", titulo)
      put("texto", texto)
      put("textoSanitizado", mensagemOriginal)
      put("bigText", bigText)
      put("subText", subText)
      put("titleBig", titleBig)
      put("mensagemOriginal", mensagemOriginal)
      put("recebidoEm", recebidoEm)
      put("postTime", recebidoEm)
      put("postTimeMillis", postTimeMillis)
      put("timestamp", postTimeMillis)
      put("preLancamento", JSONObject.NULL)
      put("dedupeKey", dedupeKey)
      put("createdAt", criadoEm)
      put("criadoEm", criadoEm)
    }

    val next = JSONArray().apply {
      put(draft)
      for (index in 0 until current.length()) {
        if (length() >= 30) break
        put(current.opt(index))
      }
    }

    val saved = prefs.edit()
      .putString("drafts", next.toString())
      .commit()

    Log.d(
      "OCNotifListener",
      "notification draft saved=$saved package=$pacote count=${next.length()}",
    )
  }
}
