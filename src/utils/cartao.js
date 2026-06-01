const TIPOS_CARTAO = {
  credito: 'Crédito',
  debito: 'Débito',
  credit: 'Crédito',
  debit: 'Débito',
};

/**
 * Formata o tipo do cartão para exibição (somente UI).
 * Valores internos permanecem: credito | debito
 */
export function formatarTipoCartao(tipo) {
  if (tipo === undefined || tipo === null || tipo === '') {
    return '';
  }

  const chave = String(tipo)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (TIPOS_CARTAO[chave]) {
    return TIPOS_CARTAO[chave];
  }

  if (chave === 'selecione') {
    return '';
  }

  return chave.charAt(0).toUpperCase() + chave.slice(1);
}

/**
 * Label amigável para listas e selects de cartão.
 * Ex.: "Pic Pay - Crédito"
 */
export function formatarNomeCartao(cartao) {
  if (!cartao || typeof cartao !== 'object') {
    return 'Sem cartão';
  }

  const nome = String(cartao.nome ?? '').trim() || 'Sem nome';
  const tipo = formatarTipoCartao(cartao.tipo_cartao);

  return tipo ? `${nome} - ${tipo}` : nome;
}

/**
 * Mapa id → cartão para resolução em listagens de contas.
 */
export function buildCartoesMap(cartoes = []) {
  if (!Array.isArray(cartoes)) {
    return {};
  }

  return cartoes.reduce((acc, cartao) => {
    if (cartao?.id !== undefined && cartao?.id !== null) {
      acc[String(cartao.id)] = cartao;
    }
    return acc;
  }, {});
}

/**
 * Resolve label a partir do id do cartão (campo tipo_cartao nas contas).
 * Não altera ids — apenas exibição.
 */
export function formatarLabelCartaoPorId(cartaoId, cartoesOuMapa) {
  if (cartaoId === undefined || cartaoId === null || cartaoId === '') {
    return '-';
  }

  const mapa = Array.isArray(cartoesOuMapa) ? buildCartoesMap(cartoesOuMapa) : cartoesOuMapa || {};
  const cartao = mapa[String(cartaoId)];

  if (cartao) {
    return formatarNomeCartao(cartao);
  }

  const tipoDireto = formatarTipoCartao(cartaoId);
  if (tipoDireto && tipoDireto !== String(cartaoId)) {
    return tipoDireto;
  }

  return '-';
}
