/**
 * Regras de competência para cartão de crédito.
 *
 * Cartão:
 * - vencimento: dia de pagamento da fatura (ex.: 01)
 * - dia_util: dia de fechamento da fatura (ex.: 22)
 *
 * Conta:
 * - vencimento: data completa (dd/MM/yyyy) da parcela/fatura
 *
 * Regra:
 * 1. Compra até o fechamento do mês → fatura fecha no mês corrente.
 * 2. Compra após o fechamento → fatura fecha no mês seguinte.
 * 3. Pagamento = dia de vencimento no mês seguinte ao fechamento.
 */

function parseDia(value) {
  const dia = parseInt(String(value), 10);
  if (Number.isNaN(dia) || dia < 1 || dia > 31) {
    return null;
  }
  return dia;
}

function dataLocal(ano, mesIndex0, dia) {
  const ultimoDia = new Date(ano, mesIndex0 + 1, 0).getDate();
  const diaAjustado = Math.min(dia, ultimoDia);
  const date = new Date(ano, mesIndex0, diaAjustado);
  if (
    date.getFullYear() !== ano ||
    date.getMonth() !== mesIndex0 ||
    date.getDate() !== diaAjustado
  ) {
    return null;
  }
  return date;
}

function formatarDataLocal(date) {
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

function inicioDoDia(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function avancarMes(ano, mesIndex0) {
  let mes = mesIndex0 + 1;
  let year = ano;
  if (mes > 11) {
    mes = 0;
    year += 1;
  }
  return { ano: year, mesIndex0: mes };
}

/**
 * Fallback legado: usa apenas dia de vencimento (sem fechamento).
 */
function calcularVencimentoSomenteDiaPagamento(diaVencimento, dataReferencia) {
  const ref = inicioDoDia(dataReferencia);
  let ano = ref.getFullYear();
  let mesIndex = ref.getMonth();

  let vencimentoAtual = dataLocal(ano, mesIndex, diaVencimento);
  if (!vencimentoAtual) {
    return null;
  }

  if (ref > inicioDoDia(vencimentoAtual)) {
    const next = avancarMes(ano, mesIndex);
    ano = next.ano;
    mesIndex = next.mesIndex0;
    vencimentoAtual = dataLocal(ano, mesIndex, diaVencimento);
  }

  return vencimentoAtual;
}

/**
 * Próximo fechamento futuro (inclui o próprio dia do fechamento).
 * @returns {Date|null}
 */
export function calcularProximoFechamentoContaCartaoDate(cartao, dataReferencia = new Date()) {
  const diaFechamento = parseDia(cartao?.dia_util);
  if (!diaFechamento) {
    return null;
  }

  const ref = inicioDoDia(dataReferencia);
  let anoFechamento = ref.getFullYear();
  let mesFechamentoIndex = ref.getMonth();
  let fechamento = dataLocal(anoFechamento, mesFechamentoIndex, diaFechamento);

  if (!fechamento) {
    return null;
  }

  if (ref > inicioDoDia(fechamento)) {
    const next = avancarMes(anoFechamento, mesFechamentoIndex);
    anoFechamento = next.ano;
    mesFechamentoIndex = next.mesIndex0;
    fechamento = dataLocal(anoFechamento, mesFechamentoIndex, diaFechamento);
  }

  return fechamento;
}

export function calcularProximoFechamentoContaCartao(cartao, dataReferencia = new Date()) {
  const date = calcularProximoFechamentoContaCartaoDate(cartao, dataReferencia);
  return date ? formatarDataLocal(date) : null;
}

/**
 * Calcula vencimento da conta para cartão de crédito (competência por fechamento).
 * @param {object} cartao - { vencimento, dia_util, tipo_cartao }
 * @param {Date} dataReferencia - geralmente "hoje"
 * @returns {Date|null}
 */
export function calcularVencimentoContaCartaoDate(cartao, dataReferencia = new Date()) {
  const diaVencimento = parseDia(cartao?.vencimento);
  const diaFechamento = parseDia(cartao?.dia_util);

  if (!diaVencimento) {
    return null;
  }

  const ref = inicioDoDia(dataReferencia);

  if (!diaFechamento) {
    return calcularVencimentoSomenteDiaPagamento(diaVencimento, ref);
  }

  const fechamento = calcularProximoFechamentoContaCartaoDate(cartao, ref);
  if (!fechamento) {
    return null;
  }

  const anoFechamento = fechamento.getFullYear();
  const mesFechamentoIndex = fechamento.getMonth();

  // Regra financeira genérica:
  // - vencimento > fechamento: paga no mesmo mês do fechamento.
  // - vencimento <= fechamento: paga no mês seguinte ao fechamento.
  const pagamento =
    diaVencimento > diaFechamento
      ? { ano: anoFechamento, mesIndex0: mesFechamentoIndex }
      : avancarMes(anoFechamento, mesFechamentoIndex);

  return dataLocal(pagamento.ano, pagamento.mesIndex0, diaVencimento);
}

export function calcularVencimentoContaCartao(cartao, dataReferencia = new Date()) {
  const date = calcularVencimentoContaCartaoDate(cartao, dataReferencia);
  return date ? formatarDataLocal(date) : null;
}

/** Retorna YYYY-MM-DD (uso no backend / web). */
export function calcularVencimentoContaCartaoISO(cartao, dataReferencia = new Date()) {
  const date = calcularVencimentoContaCartaoDate(cartao, dataReferencia);
  if (!date) {
    return null;
  }
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();
  return `${ano}-${mes}-${dia}`;
}

/**
 * Débito ou lançamento manual: usa mês/ano do filtro da tela principal.
 */
export function calcularVencimentoContaDebito(diaVencimento, mesIndex0, ano, dataReferencia = new Date()) {
  const dia = parseDia(diaVencimento);
  const mesIndex = parseInt(String(mesIndex0), 10);
  const year = parseInt(String(ano), 10);

  if (dia === null || Number.isNaN(mesIndex) || Number.isNaN(year)) {
    return null;
  }

  const date = dataLocal(year, mesIndex, dia);
  if (!date) {
    return null;
  }

  const ref = inicioDoDia(dataReferencia);
  if (ref > inicioDoDia(date)) {
    const next = avancarMes(year, mesIndex);
    const nextDate = dataLocal(next.ano, next.mesIndex0, dia);
    return nextDate ? formatarDataLocal(nextDate) : null;
  }

  return formatarDataLocal(date);
}

export function calcularVencimentoPorCartao(cartao, { mesIndex0, ano, dataReferencia = new Date() } = {}) {
  if (!cartao) {
    return null;
  }

  const tipo = String(cartao.tipo_cartao || '').toLowerCase();

  if (tipo === 'credito') {
    return calcularVencimentoContaCartao(cartao, dataReferencia);
  }

  return calcularVencimentoContaDebito(cartao.vencimento, mesIndex0, ano, dataReferencia);
}

/**
 * Sugere vencimento da conta ao escolher um cartão (data de hoje / regra de fatura).
 */
export function obterVencimentoSugeridoPorCartao(cartao, { mesIndex0, ano, dataReferencia = new Date() } = {}) {
  const mes = parseInt(String(mesIndex0), 10);
  const year = parseInt(String(ano), 10);

  return calcularVencimentoPorCartao(cartao, {
    mesIndex0: Number.isNaN(mes) ? new Date().getMonth() : mes,
    ano: Number.isNaN(year) ? new Date().getFullYear() : year,
    dataReferencia,
  });
}

/** Converte dd/MM/yyyy para Date (uso no date picker). */
export function parseDataBRparaDate(dataBR) {
  const match = String(dataBR || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return new Date();
  }

  const dia = parseInt(match[1], 10);
  const mes = parseInt(match[2], 10) - 1;
  const ano = parseInt(match[3], 10);
  const date = new Date(ano, mes, dia);

  if (
    Number.isNaN(date.getTime()) ||
    date.getDate() !== dia ||
    date.getMonth() !== mes ||
    date.getFullYear() !== ano
  ) {
    return new Date();
  }

  return date;
}

export function extrairMesAnoCompetencia(dataBR) {
  const match = String(dataBR || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }

  return {
    mesIndex0: String(parseInt(match[2], 10) - 1),
    ano: match[3],
  };
}

/** Parseia data de referência para testes (dd/MM/yyyy). */
export function parseDataReferenciaBR(dataBR) {
  const match = String(dataBR || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return new Date();
  }
  return new Date(parseInt(match[3], 10), parseInt(match[2], 10) - 1, parseInt(match[1], 10));
}
