/**
 * Mapeia PreLancamento → initialValues do Modal_Nova_Conta.
 * Não persiste texto bruto. Não chama API.
 */

import { inferirBancoDoNome, resolverBancoParaCartao } from './bancos';
import { isCartaoDebito, formatarDataBRHoje } from './tipoCartao';
import { formatarDataBR, validarVencimentoConta } from './util';

const CONFIANCA_BANCO_MIN = 0.75;

function slugDoCartao(cartao) {
  const nomeNormalizado = String(cartao?.nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (nomeNormalizado.includes('mercado pago')) {
    return 'mercado_pago';
  }

  const info = resolverBancoParaCartao(cartao);
  if (info?.slug && info.slug !== 'outro') {
    return info.slug;
  }
  const inferido = inferirBancoDoNome(cartao?.nome);
  return inferido?.slug || cartao?.banco_slug || null;
}

function tipoDesejadoPorForma(formaPagamento) {
  if (formaPagamento === 'cartao_credito') {
    return 'credito';
  }
  if (formaPagamento === 'cartao_debito' || formaPagamento === 'pix') {
    return 'debito';
  }
  return null;
}

/**
 * Seleciona cartão só com match único e confiança alta.
 * @returns {{ id: string|null, avisos: string[] }}
 */
export function resolverCartaoSugerido(preLancamento, cartoes = []) {
  const avisos = [];
  const lista = Array.isArray(cartoes) ? cartoes : [];
  const slug = preLancamento?.banco?.slug || null;
  const confBanco = Number(preLancamento?.banco?.confianca) || 0;
  const forma = preLancamento?.transacao?.formaPagamento || 'desconhecida';

  if (!slug) {
    if (lista.length === 0) {
      avisos.push('Nenhum cartão cadastrado. Cadastre um cartão antes de salvar.');
    }
    return { id: null, avisos };
  }

  if (confBanco < CONFIANCA_BANCO_MIN) {
    avisos.push('Confiança baixa no banco detectado. Selecione o cartão manualmente.');
    return { id: null, avisos };
  }

  let candidatos = lista.filter((c) => slugDoCartao(c) === slug);

  const tipoDesejado = tipoDesejadoPorForma(forma);

  if (tipoDesejado) {
    const filtrados = candidatos.filter(
      (c) => String(c?.tipo_cartao || '').toLowerCase() === tipoDesejado
    );

    if (filtrados.length === 1) {
      return { id: String(filtrados[0].id), avisos };
    }

    if (filtrados.length > 1) {
      avisos.push('Há mais de um cartão compatível. Selecione o cartão manualmente.');
      return { id: null, avisos };
    }

    avisos.push('Nenhum cartão do banco e tipo detectados foi encontrado. Selecione o cartão manualmente.');
    return { id: null, avisos };
  }

  if (candidatos.length === 0) {
    avisos.push('Nenhum cartão cadastrado compatível com o banco detectado.');
    return { id: null, avisos };
  }

  if (candidatos.length > 1) {
    avisos.push('Há mais de um cartão compatível. Selecione o cartão manualmente.');
    return { id: null, avisos };
  }

  return { id: String(candidatos[0].id), avisos };
}

/**
 * @param {object} preLancamento
 * @param {{ cartoes?: array }} opts
 * @returns {{ initialValues: object, avisos: string[] }}
 */
export function mapPreLancamentoParaInitialValues(preLancamento, { cartoes = [] } = {}) {
  const avisos = [...(preLancamento?.avisos || [])];
  const sugestoes = preLancamento?.sugestoes || {};
  const transacao = preLancamento?.transacao || {};

  const nome =
    sugestoes.nome ||
    transacao.descricao ||
    transacao.estabelecimento ||
    null;

  let valorBackend = sugestoes.valorBackend;
  let valorDisplay = sugestoes.valorDisplay;

  if ((valorBackend == null || valorBackend === '') && transacao.valor != null) {
    const n = Number(transacao.valor);
    if (Number.isFinite(n) && !Number.isNaN(n)) {
      valorBackend = n.toFixed(2);
      valorDisplay = n.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  }

  const { id: tipoCartaoId, avisos: avisosCartao } = resolverCartaoSugerido(
    preLancamento,
    cartoes
  );
  avisos.push(...avisosCartao);

  const cartaoSelecionado = tipoCartaoId
    ? (cartoes || []).find((c) => String(c.id) === String(tipoCartaoId))
    : null;
  const ehDebito = cartaoSelecionado ? isCartaoDebito(cartaoSelecionado) : false;

  // data_lancamento: data da mensagem (BR) se válida; senão omitir (hook usa hoje)
  let dataLancamento = sugestoes.data_lancamento || null;
  if (dataLancamento && !validarVencimentoConta(dataLancamento)) {
    if (transacao.dataISO && /^\d{4}-\d{2}-\d{2}$/.test(transacao.dataISO)) {
      dataLancamento = formatarDataBR(transacao.dataISO);
    } else {
      dataLancamento = null;
    }
  }
  if (dataLancamento && !validarVencimentoConta(dataLancamento)) {
    dataLancamento = null;
  }

  // vencimento: só preencher automaticamente para débito (hoje); crédito deixa o modal calcular
  let vencimento = null;
  if (ehDebito) {
    vencimento = formatarDataBRHoje();
  }

  const initialValues = {
    nome: nome || '',
    valor: valorDisplay || (valorBackend != null ? String(valorBackend) : ''),
    valorBackend: valorBackend != null ? String(valorBackend) : '',
    tipo_cartao: tipoCartaoId || '',
    categoria: '',
    subcategoria: '',
    vencimento: vencimento || '',
    data_lancamento: dataLancamento || '',
    parcelado: false,
    recorrente: false,
  };

  avisos.push('Categoria deve ser escolhida manualmente.');

  return {
    initialValues,
    avisos: [...new Set(avisos.filter(Boolean))],
  };
}

export default mapPreLancamentoParaInitialValues;
