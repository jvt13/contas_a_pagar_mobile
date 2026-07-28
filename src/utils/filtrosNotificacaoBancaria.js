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

const SINAIS_TRANSACAO = [
  'compra',
  'aprovad',
  'cartao',
  'card',
  'credito',
  'debito',
  'pix',
  'pagamento',
  'transferencia',
  'recebido',
  'enviado',
  'pagou',
];

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

const SINAIS_IGNORAR_PROMO = [
  'promocao',
  'propaganda',
  'cashback promocional',
  'oferta imperdivel',
  'abra o app para',
];

function temValorMonetario(textoNorm) {
  return /r\$\s*\d|rs\s*\d|\d{1,3}(?:\.\d{3})*,\d{2}/.test(textoNorm);
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

  if (
    SINAIS_IGNORAR_PROMO.some((s) => textoNorm.includes(s)) &&
    !temValorMonetario(textoNorm)
  ) {
    return { aceitar: false, motivo: 'promocao' };
  }

  if (!temValorMonetario(textoNorm)) {
    return { aceitar: false, motivo: 'sem_valor' };
  }

  if (!SINAIS_TRANSACAO.some((s) => textoNorm.includes(s))) {
    return { aceitar: false, motivo: 'sem_sinal_transacao' };
  }

  return { aceitar: true };
}

export default avaliarNotificacaoBancaria;
