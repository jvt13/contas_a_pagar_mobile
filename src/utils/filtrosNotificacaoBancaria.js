/**
 * Filtros locais de segurança para notificações bancárias (camada JS).
 * Complementa filtros nativos. Em dúvida, preferir não processar.
 */

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

const SINAIS_IGNORAR_CRITICOS = [
  'codigo',
  'token',
  'otp',
  'verificacao',
  'login',
  'acesso',
  'senha',
  'nao compartilhe',
  'security code',
  'codigo de seguranca',
];

/** Propaganda/loteria: descartar mesmo com R$. */
const SINAIS_PROMO_HARD = [
  'concorra',
  'premio',
  'premios',
  'promocao',
  'oferta',
  'ganhe',
  'recarregue',
  'recarga pode',
  'sorteio',
  'cashback disponivel',
  'invista',
  'investimento',
  'cripto',
  'negocie cripto',
  'emprestimo',
  'limite aprovado',
  'cartao transporte',
  'sem pagar mais nada',
  'todas as semanas',
  'lotofacil',
  'loteria',
  'pague com saldo ou cartao',
];

const PIX_RECEBIDO = [
  'pix recebido',
  'voce recebeu um pix',
  'voce acaba de receber um pix',
  'acaba de receber um pix',
  'receber um pix',
  'recebeu pix',
  'valor recebido',
];

const PIX_SAIDA = [
  'pix enviado',
  'pix realizado',
  'pix pago',
  'voce pagou com pix',
  'pagamento pix realizado',
  'pagamento via pix',
];

function temValorMonetario(textoNorm) {
  return /r\$\s*\d|rs\s*\d|\d{1,3}(?:\.\d{3})*,\d{2}/.test(textoNorm);
}

function temEventoTransacionalForte(textoNorm) {
  return (
    /compra\s+no\s+debito\s+aprovad/.test(textoNorm) ||
    /compra\s+no\s+credito\s+aprovad/.test(textoNorm) ||
    /compra\s+aprovad/.test(textoNorm) ||
    /compra\s+de\s+r\$/.test(textoNorm) ||
    /voce\s+pagou\s+r\$/.test(textoNorm) ||
    /pagamento\s+aprovado/.test(textoNorm) ||
    /pagamento\s+realizado/.test(textoNorm) ||
    /debito\s+aprovad/.test(textoNorm) ||
    /credito\s+aprovad/.test(textoNorm) ||
    /pix\s+(enviado|realizado|pago)/.test(textoNorm) ||
    /voce\s+pagou\s+com\s+pix/.test(textoNorm) ||
    /pagamento\s+(pix\s+realizado|via\s+pix)/.test(textoNorm) ||
    /transacao\s+aprovad/.test(textoNorm) ||
    /autorizacao\s+aprovad/.test(textoNorm) ||
    /foi\s+aprovad/.test(textoNorm)
  );
}

/**
 * @returns {{ aceitar: boolean, motivo?: string }}
 */
export function avaliarNotificacaoBancaria({ titulo, textoSanitizado } = {}) {
  const textoNorm = normalizar(`${titulo || ''} ${textoSanitizado || ''}`);

  if (!textoNorm.trim()) {
    return { aceitar: false, motivo: 'sem_texto' };
  }

  if (SINAIS_IGNORAR_CRITICOS.some((s) => textoNorm.includes(s))) {
    return { aceitar: false, motivo: 'sinal_seguranca' };
  }

  if (SINAIS_PROMO_HARD.some((s) => textoNorm.includes(s))) {
    return { aceitar: false, motivo: 'promocao' };
  }

  const pixRecebido = PIX_RECEBIDO.some((s) => textoNorm.includes(s));
  const pixSaida = PIX_SAIDA.some((s) => textoNorm.includes(s));
  if (pixRecebido && !pixSaida) {
    return { aceitar: false, motivo: 'pix_recebido' };
  }

  if (!temValorMonetario(textoNorm)) {
    return { aceitar: false, motivo: 'sem_valor' };
  }

  if (!temEventoTransacionalForte(textoNorm)) {
    return { aceitar: false, motivo: 'sem_evento_transacional' };
  }

  return { aceitar: true };
}

export default avaliarNotificacaoBancaria;
