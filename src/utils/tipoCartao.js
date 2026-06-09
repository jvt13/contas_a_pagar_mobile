/**
 * Regras de tipo de cartão (crédito x débito) — somente classificação e UI.
 * Não altera competência de crédito (ver competenciaCartao.js).
 */

export function isCartaoDebito(cartao) {
  return String(cartao?.tipo_cartao || '').toLowerCase() === 'debito';
}

export function isCartaoCredito(cartao) {
  const tipo = String(cartao?.tipo_cartao || '').toLowerCase();
  return tipo === 'credito' || tipo === '';
}

export function formatarDataBRHoje() {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

/** Campos de cadastro exigidos apenas para crédito. */
export function cartaoCreditoRequerCamposFatura() {
  return true;
}
