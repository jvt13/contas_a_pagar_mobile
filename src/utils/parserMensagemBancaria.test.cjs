const assert = require('node:assert/strict');
const babel = require('@babel/core');

const originalJsLoader = require.extensions['.js'];
require.extensions['.js'] = (module, filename) => {
  if (filename.includes(`${require('node:path').sep}node_modules${require('node:path').sep}`)) {
    return originalJsLoader(module, filename);
  }

  const result = babel.transformFileSync(filename, {
    babelrc: false,
    configFile: false,
    presets: [require.resolve('babel-preset-expo')],
  });
  module._compile(result.code, filename);
};

const utilPath = require.resolve('./util.js');
require.cache[utilPath] = {
  id: utilPath,
  filename: utilPath,
  loaded: true,
  exports: {
    formatarDataBR: (iso) => {
      if (!iso) return null;
      const [ano, mes, dia] = iso.split('-');
      return `${dia}/${mes}/${ano}`;
    },
  },
};

const { parseMensagemBancaria } = require('./parserMensagemBancaria.js');
const { resolverCartaoSugerido } = require('./mapPreLancamentoParaInitialValues.js');
const {
  montarPacotesPermitidosPorCartoes,
  listarBancosMonitoradosPorCartoes,
} = require('./appsBancariosNotificacao.js');

assert.deepEqual(
  montarPacotesPermitidosPorCartoes([{ nome: 'PicPay - Débito', banco_slug: 'picpay' }]),
  ['com.picpay']
);

const allowlistMpNu = montarPacotesPermitidosPorCartoes([
  { nome: 'Mercado Pago Crédito', banco_slug: 'outro' },
  { nome: 'Nubank', banco_slug: 'nubank' },
]);
assert.equal(allowlistMpNu.includes('com.mercadopago.wallet'), true);
assert.equal(allowlistMpNu.includes('com.nu.production'), true);

assert.deepEqual(montarPacotesPermitidosPorCartoes([]), []);
assert.deepEqual(
  listarBancosMonitoradosPorCartoes([{ nome: 'PicPay - Débito', banco_slug: 'picpay' }]),
  ['PicPay']
);

const recebidoEm = '2026-07-30T00:15:00.000Z';
const dataRecebida = new Date(recebidoEm);
const esperadoDataLocal = [
  dataRecebida.getFullYear(),
  String(dataRecebida.getMonth() + 1).padStart(2, '0'),
  String(dataRecebida.getDate()).padStart(2, '0'),
].join('-');
const esperadoHoraLocal = [
  String(dataRecebida.getHours()).padStart(2, '0'),
  String(dataRecebida.getMinutes()).padStart(2, '0'),
].join(':');

const picPayDebito = parseMensagemBancaria(
  'Compra no débito aprovada\nCompra de R$ 1,00 em Mp *jvtech foi APROVADA.',
  {
    pacote: 'com.picpay',
    bancoInferido: 'PicPay',
    recebidoEm,
  }
);

assert.equal(picPayDebito.transacao.valor, 1);
assert.equal(picPayDebito.banco.slug, 'picpay');
assert.equal(picPayDebito.banco.nome, 'PicPay');
assert.equal(picPayDebito.transacao.formaPagamento, 'cartao_debito');
assert.equal(picPayDebito.transacao.tipo, 'compra');
assert.equal(picPayDebito.transacao.descricao, 'Mp jvtech');
assert.equal(picPayDebito.transacao.dataISO, esperadoDataLocal);
assert.equal(picPayDebito.transacao.hora, esperadoHoraLocal);

const picPayCardAnterior = parseMensagemBancaria(
  'PicPay Card Compra de R$ 99,99 em Pg *dom Cashbacker APROVADA. 14 de jul. às 08:12'
);

assert.equal(picPayCardAnterior.transacao.valor, 99.99);
assert.equal(picPayCardAnterior.banco.slug, 'picpay');
assert.equal(picPayCardAnterior.transacao.formaPagamento, 'cartao_credito');
assert.equal(picPayCardAnterior.transacao.tipo, 'compra');
assert.equal(picPayCardAnterior.transacao.descricao, 'Pg dom Cashbacker');
assert.match(picPayCardAnterior.transacao.dataISO, /^\d{4}-07-14$/);
assert.equal(picPayCardAnterior.transacao.hora, '08:12');

const unicoPicPayDebito = resolverCartaoSugerido(picPayDebito, [
  { id: 7, nome: 'PicPay Débito', banco_slug: 'picpay', tipo_cartao: 'debito' },
  { id: 8, nome: 'Outro cartão', banco_slug: 'nubank', tipo_cartao: 'credito' },
]);
assert.equal(unicoPicPayDebito.id, '7');

const picPayDebitoAmbiguo = resolverCartaoSugerido(picPayDebito, [
  { id: 7, nome: 'PicPay Débito 1', banco_slug: 'picpay', tipo_cartao: 'debito' },
  { id: 9, nome: 'PicPay Débito 2', banco_slug: 'picpay', tipo_cartao: 'debito' },
]);
assert.equal(picPayDebitoAmbiguo.id, null);

const mercadoPago = parseMensagemBancaria(
  'Você pagou R$ 1 a JIM.COM JOSE VITOR OLIVEI\n' +
    'O valor vai entrar na próxima fatura do seu Cartão Mercado Pago.',
  {
    pacote: 'com.mercadopago.wallet',
    bancoInferido: 'Mercado Pago',
    recebidoEm,
  }
);

assert.equal(mercadoPago.transacao.valor, 1);
assert.equal(mercadoPago.banco.slug, 'mercado_pago');
assert.equal(mercadoPago.banco.nome, 'Mercado Pago');
assert.equal(mercadoPago.transacao.formaPagamento, 'cartao_credito');
assert.equal(mercadoPago.transacao.tipo, 'compra');
assert.equal(mercadoPago.transacao.descricao, 'JIM.COM JOSE VITOR OLIVEI');
assert.equal(mercadoPago.transacao.dataISO, esperadoDataLocal);
assert.equal(mercadoPago.transacao.hora, esperadoHoraLocal);
assert.equal(mercadoPago.confianca.nivel, 'boa');
assert.equal(mercadoPago.confianca.camposFaltantes.includes('banco'), false);
assert.equal(mercadoPago.confianca.camposFaltantes.includes('categoria'), true);

const semCartaoMercadoPago = resolverCartaoSugerido(mercadoPago, []);
assert.equal(semCartaoMercadoPago.id, null);

const unicoCartaoMercadoPago = resolverCartaoSugerido(mercadoPago, [
  { id: 15, nome: 'Mercado Pago', banco_slug: 'outro', tipo_cartao: 'credito' },
]);
assert.equal(unicoCartaoMercadoPago.id, '15');

const avisoMercadoPago = parseMensagemBancaria(
  'Você cobriu o valor mínimo. Pague o saldo pendente e evite juros adicionais.',
  {
    pacote: 'com.mercadopago.wallet',
    bancoInferido: 'Mercado Pago',
    recebidoEm,
  }
);
assert.equal(avisoMercadoPago.transacao.valor, null);
assert.equal(avisoMercadoPago.confianca.nivel, 'revisar');
assert.equal(avisoMercadoPago.confianca.camposFaltantes.includes('valor'), true);

const promoRecarga = parseMensagemBancaria(
  'Sua recarga pode te dar prêmios 💰\n' +
    'Recarregue seu cartão transporte e concorra até R$ 1 mil todas as semanas, sem pagar mais nada por isso!',
  { pacote: 'com.picpay', bancoInferido: 'PicPay', recebidoEm }
);
assert.notEqual(promoRecarga.transacao.tipo, 'compra');
assert.notEqual(promoRecarga.confianca.nivel, 'boa');
assert.equal(promoRecarga.transacao.valor, null);
assert.notEqual(promoRecarga.transacao.descricao, 'Compra cartão PicPay');
assert.equal(promoRecarga.confianca.nivel, 'baixa');

const promoLoteria = parseMensagemBancaria(
  'Lotofacil no PicPay hoje!\n' +
    'Concorra a R$ 8.000.000 sem sair de casa. Pague com saldo ou cartão.',
  { pacote: 'com.picpay', bancoInferido: 'PicPay', recebidoEm }
);
assert.notEqual(promoLoteria.transacao.tipo, 'compra');
assert.notEqual(promoLoteria.confianca.nivel, 'boa');
assert.equal(promoLoteria.transacao.valor, null);
assert.notEqual(promoLoteria.transacao.descricao, 'Compra cartão PicPay');
assert.equal(promoLoteria.confianca.nivel, 'baixa');

const pixRecebido = parseMensagemBancaria(
  'Você acaba de receber um PIX!\n' +
    'PIX recebido em 31/07/2026 às 12:40 no valor de R$ 2,00.',
  { pacote: 'com.santander.app', bancoInferido: 'Santander', recebidoEm }
);
assert.notEqual(pixRecebido.transacao.tipo, 'compra');
assert.notEqual(pixRecebido.transacao.tipo, 'pix');
assert.notEqual(pixRecebido.confianca.nivel, 'boa');
assert.equal(pixRecebido.transacao.valor, null);
assert.equal(pixRecebido.confianca.nivel, 'baixa');

console.log('Allowlist + parser + anti-falso-positivo: 15 cenários aprovados.');
