/**
 * Parser local de mensagens bancárias (texto colado).
 * Puro: sem I/O, sem persistência, sem envio ao backend.
 * O texto bruto NÃO deve entrar no DTO retornado.
 */

import { listarBancos } from './bancos';
import { formatarDataBR } from './util';

const ALIASES_BANCO = [
  { slug: 'nubank', nomes: ['nubank', 'nu bank', 'roxinho'] },
  { slug: 'inter', nomes: ['inter', 'banco inter'] },
  { slug: 'itau', nomes: ['itau', 'itaú', 'banco itau', 'banco itaú'] },
  { slug: 'bradesco', nomes: ['bradesco'] },
  { slug: 'santander', nomes: ['santander'] },
  { slug: 'bb', nomes: ['banco do brasil', 'banco brasil', ' bb '] },
  { slug: 'caixa', nomes: ['caixa', 'caixa economica', 'caixa econômica'] },
  { slug: 'picpay', nomes: ['picpay', 'pic pay', 'picpay card'] },
  { slug: 'sicoob', nomes: ['sicoob'] },
  { slug: 'sicredi', nomes: ['sicredi'] },
];

const ALIASES_EXTRA = [
  { slug: 'outro', nome: 'Mercado Pago', nomes: ['mercado pago', 'mercadopago'] },
  { slug: 'outro', nome: 'C6', nomes: ['c6 bank', 'c6bank', ' c6 '] },
];

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function dataLocalParaISO(ano, mes1a12, dia) {
  const d = new Date(ano, mes1a12 - 1, dia);
  if (
    d.getFullYear() !== ano ||
    d.getMonth() !== mes1a12 - 1 ||
    d.getDate() !== dia
  ) {
    return null;
  }
  return `${ano}-${pad2(mes1a12)}-${pad2(dia)}`;
}

function isoParaBR(iso) {
  if (!iso) {
    return null;
  }
  return formatarDataBR(iso);
}

function formatarValorDisplay(valor) {
  if (valor == null || Number.isNaN(valor)) {
    return null;
  }
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatarValorBackend(valor) {
  if (valor == null || Number.isNaN(valor)) {
    return null;
  }
  return Number(valor).toFixed(2);
}

/**
 * Extrai candidatos a valor monetário.
 * Retorna { valor, ambiguidades[] }.
 */
function extrairValor(texto) {
  const ambiguidades = [];
  const candidatos = [];

  const reComMoeda =
    /(?:r\$|rs)\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+)/gi;
  // Valores com centavos (evita IDs longos sem moeda)
  const reSemMoeda = /(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g;

  let match;
  while ((match = reComMoeda.exec(texto)) !== null) {
    candidatos.push({ raw: match[1], prioridade: 2, index: match.index });
  }
  while ((match = reSemMoeda.exec(texto)) !== null) {
    candidatos.push({ raw: match[1], prioridade: 1, index: match.index });
  }

  if (candidatos.length === 0) {
    return { valor: null, ambiguidades };
  }

  const parseRaw = (raw) => {
    const limpo = String(raw).replace(/\./g, '').replace(',', '.');
    const n = parseFloat(limpo);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const parseados = candidatos
    .map((c) => ({ ...c, valor: parseRaw(c.raw) }))
    .filter((c) => c.valor != null);

  if (parseados.length === 0) {
    return { valor: null, ambiguidades };
  }

  const unicos = [...new Set(parseados.map((c) => c.valor))];
  if (unicos.length > 1) {
    ambiguidades.push('multiplos_valores');
  }

  parseados.sort((a, b) => {
    if (b.prioridade !== a.prioridade) {
      return b.prioridade - a.prioridade;
    }
    return a.index - b.index;
  });

  return { valor: parseados[0].valor, ambiguidades };
}

function extrairBanco(textoNorm, textoOriginal, metadados = {}) {
  const catalogo = listarBancos();
  const pacote = String(metadados?.pacote || metadados?.pacoteOrigem || '').toLowerCase();
  const bancoInferido = normalizar(metadados?.bancoInferido || metadados?.appName || '');

  if (
    pacote === 'com.mercadopago.wallet' ||
    bancoInferido.includes('mercado pago') ||
    textoNorm.includes('mercado pago')
  ) {
    return {
      nome: 'Mercado Pago',
      slug: 'mercado_pago',
      confianca: 0.95,
    };
  }

  if (pacote === 'com.picpay' || bancoInferido.includes('picpay')) {
    const picPay = catalogo.find((b) => b.slug === 'picpay');
    return {
      nome: picPay?.nome || 'PicPay',
      slug: 'picpay',
      confianca: 0.98,
    };
  }

  for (const alias of ALIASES_BANCO) {
    for (const nome of alias.nomes) {
      const chave = normalizar(nome).trim();
      if (!chave) {
        continue;
      }
      if (textoNorm.includes(chave)) {
        const banco = catalogo.find((b) => b.slug === alias.slug);
        return {
          nome: banco?.nome || alias.nomes[0],
          slug: alias.slug,
          confianca: 0.9,
        };
      }
    }
  }

  for (const banco of catalogo) {
    const nome = normalizar(banco.nome);
    const slug = normalizar(banco.slug);
    if (textoNorm.includes(nome) || textoNorm.includes(slug)) {
      return { nome: banco.nome, slug: banco.slug, confianca: 0.85 };
    }
  }

  for (const extra of ALIASES_EXTRA) {
    for (const nome of extra.nomes) {
      if (textoNorm.includes(normalizar(nome))) {
        return { nome: extra.nome, slug: null, confianca: 0.7 };
      }
    }
  }

  // Fallback: procura nomes do catálogo no texto original sem normalizar demais
  void textoOriginal;

  return { nome: null, slug: null, confianca: 0 };
}

function extrairTipoEForma(textoNorm) {
  let tipo = 'desconhecido';
  let formaPagamento = 'desconhecida';

  const temPix = /\bpix\b/.test(textoNorm);
  const temCredito =
    /cartao de credito|\bcredito\b|no credito|proxima fatura|cartao mercado pago/.test(textoNorm);
  const temDebito = /cartao de debito|\bdebito\b|no debito/.test(textoNorm);
  // "Card" (ex.: PicPay Card) e "cartão" sem qualificador → crédito (usuário revisa)
  const temCartaoGenerico = /\bcartao\b|\bcard\b/.test(textoNorm);
  const temTransferencia = /\btransferencia\b|\bted\b|\bdoc\b/.test(textoNorm);
  const temPagamento = /\bpagamento\b|\bpagou\b/.test(textoNorm);
  const temRecebimento = /\brecebimento\b|\brecebido\b|\brecebeu\b/.test(textoNorm);
  const temCompra = /\bcompra\b|\baprovad|\btransacao aprovada|\bpagou\b/.test(textoNorm);

  if (temPix) {
    tipo = 'pix';
    formaPagamento = 'pix';
  } else if (temTransferencia) {
    tipo = 'transferencia';
    formaPagamento = 'transferencia';
  } else if (temRecebimento) {
    tipo = 'recebimento';
    formaPagamento = 'desconhecida';
  } else if (temPagamento && !temCompra && !temCartaoGenerico) {
    tipo = 'pagamento';
    formaPagamento = temCredito
      ? 'cartao_credito'
      : temDebito
        ? 'cartao_debito'
        : 'desconhecida';
  } else if (temCompra || temCredito || temDebito || temCartaoGenerico) {
    tipo = 'compra';
    if (temDebito && !temCredito) {
      formaPagamento = 'cartao_debito';
    } else if (temCredito && !temDebito) {
      formaPagamento = 'cartao_credito';
    } else if (temCredito && temDebito) {
      formaPagamento = 'desconhecida';
    } else if (temCartaoGenerico) {
      formaPagamento = 'cartao_credito';
    }
  }

  return { tipo, formaPagamento, ambiguoForma: temCredito && temDebito };
}

const MESES_PT = {
  jan: 1,
  janeiro: 1,
  fev: 2,
  fevereiro: 2,
  mar: 3,
  marco: 3,
  abr: 4,
  abril: 4,
  mai: 5,
  maio: 5,
  jun: 6,
  junho: 6,
  jul: 7,
  julho: 7,
  ago: 8,
  agosto: 8,
  set: 9,
  setembro: 9,
  out: 10,
  outubro: 10,
  nov: 11,
  novembro: 11,
  dez: 12,
  dezembro: 12,
};

const RE_MES_PT =
  'jan(?:eiro)?|fev(?:ereiro)?|mar(?:co)?|abr(?:il)?|mai(?:o)?|jun(?:ho)?|jul(?:ho)?|ago(?:sto)?|set(?:embro)?|out(?:ubro)?|nov(?:embro)?|dez(?:embro)?';

function extrairDataHoraFallback(metadados = {}) {
  const raw =
    metadados?.recebidoEm ??
    metadados?.postTime ??
    metadados?.postTimeMillis ??
    metadados?.timestamp;

  if (raw == null || raw === '') {
    return { dataISO: null, hora: null };
  }

  let value = raw;
  if (typeof value === 'number' && value > 0 && value < 1e12) {
    value *= 1000;
  }

  const data = new Date(value);
  if (Number.isNaN(data.getTime())) {
    return { dataISO: null, hora: null };
  }

  return {
    dataISO: dataLocalParaISO(data.getFullYear(), data.getMonth() + 1, data.getDate()),
    hora: `${pad2(data.getHours())}:${pad2(data.getMinutes())}`,
  };
}

function extrairDataHora(texto, textoNorm, metadados = {}) {
  const avisos = [];
  const agora = new Date();
  const anoAtual = agora.getFullYear();
  let dataISO = null;
  let hora = null;

  if (/\bhoje\b/.test(textoNorm)) {
    dataISO = dataLocalParaISO(anoAtual, agora.getMonth() + 1, agora.getDate());
  } else if (/\bontem\b/.test(textoNorm)) {
    const ontem = new Date(agora);
    ontem.setDate(ontem.getDate() - 1);
    dataISO = dataLocalParaISO(
      ontem.getFullYear(),
      ontem.getMonth() + 1,
      ontem.getDate()
    );
  }

  // Datas textuais PT: "14 de jul.", "14 de julho", "14 jul", "14/jul", "14 de jul. de 2026"
  if (!dataISO) {
    const reTextual = new RegExp(
      `\\b(\\d{1,2})\\s*(?:de\\s+)?(${RE_MES_PT})\\.?(?:\\s*(?:de\\s+)?(\\d{2,4}))?\\b`,
      'i'
    );
    const mTxt = textoNorm.match(reTextual);
    if (mTxt) {
      const dia = parseInt(mTxt[1], 10);
      const mesKey = normalizar(mTxt[2]).replace(/\./g, '');
      const mes = MESES_PT[mesKey];
      let ano = mTxt[3] ? parseInt(mTxt[3], 10) : anoAtual;
      if (ano < 100) {
        ano += 2000;
      }
      if (mes) {
        const iso = dataLocalParaISO(ano, mes, dia);
        if (iso) {
          dataISO = iso;
        } else {
          avisos.push('Data textual inválida ignorada.');
        }
      }
    }
  }

  // dd/mm/aaaa ou dd-mm-aaaa ou dd/mm (evita capturar hora hh:mm)
  if (!dataISO) {
    const reData = /\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/;
    const mData = texto.match(reData);
    if (mData) {
      const dia = parseInt(mData[1], 10);
      const mes = parseInt(mData[2], 10);
      let ano = mData[3] ? parseInt(mData[3], 10) : anoAtual;
      if (ano < 100) {
        ano += 2000;
      }
      // Descarta se parece hora (mes > 12 e sem ano) — ex. falso positivo raro
      const iso = dataLocalParaISO(ano, mes, dia);
      if (iso) {
        dataISO = iso;
      } else {
        avisos.push('Data inválida ignorada.');
      }
    }
  }

  // às 14:32 | as 14:32 | 14h32 | 14:32
  const reHora =
    /(?:as|às)\s*(\d{1,2})[:h](\d{2})|\b(\d{1,2})h(\d{2})\b|\b(\d{1,2}):(\d{2})\b/i;
  const mHora = texto.match(reHora);
  if (mHora) {
    const h = parseInt(mHora[1] || mHora[3] || mHora[5], 10);
    const min = parseInt(mHora[2] || mHora[4] || mHora[6], 10);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      hora = `${pad2(h)}:${pad2(min)}`;
    }
  }

  if (!dataISO) {
    const fallback = extrairDataHoraFallback(metadados);
    dataISO = fallback.dataISO;
    hora = hora || fallback.hora;
  }

  return { dataISO, hora, avisos };
}

function sanitizarEstabelecimento(nome) {
  return String(nome || '')
    .replace(/\s+foi(?:\s+aprovad[ao])?\.?\s*$/i, '')
    .replace(/\s+aprovad[ao]\.?\s*$/i, '')
    .replace(/\*/g, ' ')
    .replace(/[.\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function estabelecimentoValido(nome) {
  const n = normalizar(nome);
  if (!n || n.length < 2) {
    return false;
  }
  if (
    /\bnubank\b|\binter\b|\bpicpay\b|\bcartao\b|\bcard\b|\bcredito\b|\bdebito\b|\bpix\b|\baprovad/.test(
      n
    )
  ) {
    return false;
  }
  if (/^\d+$/.test(n)) {
    return false;
  }
  return true;
}

function extrairEstabelecimento(texto, textoNorm) {
  const padroes = [
    // Mercado Pago: "Você pagou R$ 1 a JIM.COM ...\nO valor vai entrar..."
    /voce\s+pagou\s+r\$\s*[\d.,]+\s+a\s+([^\r\n]+)/i,
    /você\s+pagou\s+r\$\s*[\d.,]+\s+a\s+([^\r\n]+)/i,
    // Genérico: "Compra aprovada de R$ X em ESTABELECIMENTO"
    /compra\s+aprovad[ao]\s+de\s+r\$\s*[\d.,]+\s+em\s+(.+?)(?:\.|$)/i,
    // PicPay débito: "Compra de R$ 1,00 em Mp *jvtech foi APROVADA."
    /(?:compra|pagamento)\s+de\s+r\$\s*[\d.,]+\s+em\s+(.+?)\s+foi\s+APROVAD[AO]\.?/i,
    // PicPay / similares: "em Pg *dom Cashbacker APROVADA"
    /\bem\s+(.+?)\s+APROVAD[AO]/i,
    // "Compra de R$ X em ESTABELECIMENTO"
    /(?:compra|pagamento)\s+de\s+r\$\s*[\d.,]+\s+em\s+(.+?)(?:\s+APROVAD|\s+às|\s+as\b|\.|$)/i,
    /(?:compra|pagamento)\s+(?:aprovad[ao]\s+)?(?:em|no|na)\s+([A-Za-zÀ-ú0-9*][A-Za-zÀ-ú0-9\s.*&'-]{2,50})/i,
    /\bem\s+([A-Za-zÀ-ú0-9*][A-Za-zÀ-ú0-9\s.*&'-]{2,50})(?:\s+no\s+valor|\s+de\s+R\$|\s+às|\s+as\b|\.|$)/i,
  ];

  for (const re of padroes) {
    const m = texto.match(re);
    if (m?.[1]) {
      let nome = m[1].trim();
      nome = nome.split(/\s+(?:no valor|de R\$|em \d|às |as |\d{1,2}\/|\d{1,2}\s+de\s+)/i)[0].trim();
      nome = sanitizarEstabelecimento(nome);
      if (estabelecimentoValido(nome)) {
        return nome;
      }
    }
  }

  void textoNorm;
  return null;
}

function montarDescricao({ tipo, bancoNome, estabelecimento, formaPagamento }) {
  if (estabelecimento) {
    return estabelecimento;
  }

  const partes = [];
  if (tipo === 'pix') {
    partes.push('PIX');
  } else if (tipo === 'compra') {
    partes.push('Compra');
  } else if (tipo === 'pagamento') {
    partes.push('Pagamento');
  } else if (tipo === 'transferencia') {
    partes.push('Transferência');
  } else if (tipo === 'recebimento') {
    partes.push('Recebimento');
  } else {
    partes.push('Lançamento');
  }

  if (formaPagamento === 'cartao_credito') {
    partes.push('cartão');
  } else if (formaPagamento === 'cartao_debito') {
    partes.push('débito');
  }

  if (bancoNome) {
    partes.push(bancoNome);
  }

  return partes.join(' ').trim() || null;
}

function calcularConfianca({
  valor,
  dataISO,
  bancoSlug,
  tipo,
  formaPagamento,
  descricao,
  estabelecimento,
  ambiguidades,
}) {
  let score = 0;
  const camposDetectados = [];
  const camposFaltantes = [];

  if (valor != null) {
    score += 0.3;
    camposDetectados.push('valor');
  } else {
    camposFaltantes.push('valor');
  }

  if (dataISO) {
    score += 0.2;
    camposDetectados.push('data');
  } else {
    camposFaltantes.push('data');
  }

  if (bancoSlug) {
    score += 0.15;
    camposDetectados.push('banco');
  } else {
    camposFaltantes.push('banco');
  }

  if (tipo && tipo !== 'desconhecido') {
    score += 0.15;
    camposDetectados.push('tipo');
  } else {
    camposFaltantes.push('tipo');
  }

  if (formaPagamento && formaPagamento !== 'desconhecida') {
    score += 0.1;
    camposDetectados.push('formaPagamento');
  } else {
    camposFaltantes.push('formaPagamento');
  }

  if (estabelecimento || descricao) {
    score += 0.1;
    camposDetectados.push(estabelecimento ? 'estabelecimento' : 'descricao');
  } else {
    camposFaltantes.push('descricao');
  }

  camposFaltantes.push('cartao', 'categoria');

  if (ambiguidades.includes('multiplos_valores')) {
    score = Math.max(0, score - 0.1);
  }

  // Cartão e categoria continuam manuais; não anunciar confiança total.
  score = Math.round(Math.min(0.9, Math.max(0, score)) * 100) / 100;

  let nivel = 'baixa';
  if (score >= 0.75) {
    nivel = 'boa';
  } else if (score >= 0.45) {
    nivel = 'revisar';
  }

  return { score, nivel, camposDetectados, camposFaltantes };
}

/**
 * @param {string} texto
 * @param {object} [metadados] pacote/app/timestamp da origem local
 * @returns {object} PreLancamento (sem texto bruto)
 */
export function parseMensagemBancaria(texto, metadados = {}) {
  const textoOriginal = String(texto || '').trim();
  const avisos = [];
  const ambiguidades = [];

  if (!textoOriginal) {
    return {
      origem: 'mensagem_colada',
      banco: { nome: null, slug: null, confianca: 0 },
      transacao: {
        tipo: 'desconhecido',
        formaPagamento: 'desconhecida',
        valor: null,
        dataISO: null,
        hora: null,
        descricao: null,
        estabelecimento: null,
      },
      sugestoes: {
        nome: null,
        tipo_cartao: null,
        categoria: null,
        subcategoria: null,
        vencimento: null,
        data_lancamento: null,
        valorDisplay: null,
        valorBackend: null,
      },
      confianca: {
        score: 0,
        nivel: 'baixa',
        camposDetectados: [],
        camposFaltantes: ['valor', 'banco', 'data', 'tipo', 'formaPagamento', 'descricao', 'cartao', 'categoria'],
        ambiguidades: [],
      },
      avisos: ['Cole uma mensagem bancária para interpretar.'],
    };
  }

  const textoNorm = normalizar(textoOriginal);

  const { valor, ambiguidades: ambValor } = extrairValor(textoOriginal);
  ambiguidades.push(...ambValor);

  const banco = extrairBanco(textoNorm, textoOriginal, metadados);
  const { tipo, formaPagamento, ambiguoForma } = extrairTipoEForma(textoNorm);
  if (ambiguoForma) {
    ambiguidades.push('forma_pagamento_ambigua');
  }

  const { dataISO, hora, avisos: avisosData } = extrairDataHora(
    textoOriginal,
    textoNorm,
    metadados
  );
  avisos.push(...avisosData);

  const estabelecimento = extrairEstabelecimento(textoOriginal, textoNorm);
  const descricao = montarDescricao({
    tipo,
    bancoNome: banco.nome,
    estabelecimento,
    formaPagamento,
  });

  if (!valor) {
    avisos.push('Não foi possível identificar o valor. Cole uma mensagem que contenha o valor (ex.: R$ 42,90).');
  }
  if (ambValor.includes('multiplos_valores')) {
    avisos.push('Há mais de um valor na mensagem. Foi usado o mais provável — revise antes de salvar.');
  }
  if (!banco.slug && !banco.nome) {
    avisos.push('Banco não identificado. Selecione o cartão manualmente.');
  } else if (!banco.slug && banco.nome) {
    avisos.push(`Banco "${banco.nome}" reconhecido, mas sem cartão cadastrado correspondente automático.`);
  }
  if (formaPagamento === 'desconhecida') {
    avisos.push('Forma de pagamento não ficou clara. Revise o cartão (crédito/débito).');
  }
  avisos.push('Revise cartão e categoria antes de salvar.');

  const confianca = calcularConfianca({
    valor,
    dataISO,
    bancoSlug: banco.slug,
    tipo,
    formaPagamento,
    descricao,
    estabelecimento,
    ambiguidades,
  });
  confianca.ambiguidades = [...new Set(ambiguidades)];

  if (confianca.nivel === 'baixa' && valor != null) {
    avisos.push('Confiança baixa na interpretação. Revise todos os campos com cuidado.');
  }

  const dataBR = isoParaBR(dataISO);

  return {
    origem: 'mensagem_colada',
    banco: {
      nome: banco.nome,
      slug: banco.slug,
      confianca: banco.confianca,
    },
    transacao: {
      tipo,
      formaPagamento,
      valor,
      dataISO,
      hora,
      descricao,
      estabelecimento,
    },
    sugestoes: {
      nome: descricao,
      tipo_cartao: null,
      categoria: null,
      subcategoria: null,
      vencimento: null,
      data_lancamento: dataBR,
      valorDisplay: formatarValorDisplay(valor),
      valorBackend: formatarValorBackend(valor),
    },
    confianca,
    avisos: [...new Set(avisos)],
  };
}

export default parseMensagemBancaria;
