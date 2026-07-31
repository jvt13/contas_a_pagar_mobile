/**
 * Catálogo de apps/bancos para captura experimental de notificações.
 *
 * Pacotes validados por teste real: PicPay (com.picpay), Mercado Pago (com.mercadopago.wallet).
 * Demais pacotes são base preparada — pendentes de validação prática.
 */

function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export const APPS_BANCARIOS_NOTIFICACAO = [
  {
    nome: 'PicPay',
    slug: 'picpay',
    aliases: ['picpay', 'pic pay', 'picpay card'],
    pacotes: ['com.picpay'],
    formasSuportadas: ['cartao_credito', 'cartao_debito', 'pix'],
    validado: true,
  },
  {
    nome: 'Mercado Pago',
    slug: 'mercado_pago',
    aliases: ['mercado pago', 'mercadopago'],
    pacotes: ['com.mercadopago.wallet'],
    formasSuportadas: ['cartao_credito', 'cartao_debito', 'pix'],
    validado: true,
  },
  {
    nome: 'Nubank',
    slug: 'nubank',
    aliases: ['nubank', 'nu', 'roxinho', 'ultravioleta'],
    pacotes: ['com.nu.production'],
    formasSuportadas: ['cartao_credito', 'cartao_debito', 'pix'],
    validado: false,
  },
  {
    nome: 'Itaú',
    slug: 'itau',
    aliases: ['itau', 'itaú', 'banco itau', 'banco itaú'],
    pacotes: ['com.itau', 'com.itau.iti'],
    formasSuportadas: ['cartao_credito', 'cartao_debito', 'pix'],
    validado: false,
  },
  {
    nome: 'Bradesco',
    slug: 'bradesco',
    aliases: ['bradesco'],
    pacotes: ['com.bradesco'],
    formasSuportadas: ['cartao_credito', 'cartao_debito', 'pix'],
    validado: false,
  },
  {
    nome: 'Santander',
    slug: 'santander',
    aliases: ['santander'],
    pacotes: ['com.santander.app'],
    formasSuportadas: ['cartao_credito', 'cartao_debito', 'pix'],
    validado: false,
  },
  {
    nome: 'Banco do Brasil',
    slug: 'bb',
    aliases: ['banco do brasil', 'banco brasil', 'bb'],
    pacotes: ['br.com.bb.android'],
    formasSuportadas: ['cartao_credito', 'cartao_debito', 'pix'],
    validado: false,
  },
  {
    nome: 'Inter',
    slug: 'inter',
    aliases: ['inter', 'banco inter'],
    pacotes: ['br.com.intermedium'],
    formasSuportadas: ['cartao_credito', 'cartao_debito', 'pix'],
    validado: false,
  },
  {
    nome: 'C6 Bank',
    slug: 'c6',
    aliases: ['c6', 'c6 bank', 'c6bank'],
    pacotes: ['com.c6bank.app'],
    formasSuportadas: ['cartao_credito', 'cartao_debito', 'pix'],
    validado: false,
  },
  {
    nome: 'Caixa',
    slug: 'caixa',
    aliases: ['caixa', 'caixa tem', 'caixa economica', 'caixa econômica'],
    pacotes: ['br.gov.caixa.tem', 'br.gov.caixa.superapp'],
    formasSuportadas: ['cartao_debito', 'pix'],
    validado: false,
  },
  {
    nome: 'Neon',
    slug: 'neon',
    aliases: ['neon'],
    pacotes: ['br.com.neon'],
    formasSuportadas: ['cartao_credito', 'cartao_debito', 'pix'],
    validado: false,
  },
  {
    nome: 'Sicredi',
    slug: 'sicredi',
    aliases: ['sicredi'],
    pacotes: ['br.com.sicredimobi.smart', 'br.com.sicredi.app'],
    formasSuportadas: ['cartao_credito', 'cartao_debito', 'pix'],
    validado: false,
  },
  {
    nome: 'Sicoob',
    slug: 'sicoob',
    aliases: ['sicoob'],
    pacotes: ['br.com.sicoobnet'],
    formasSuportadas: ['cartao_credito', 'cartao_debito', 'pix'],
    validado: false,
  },
  {
    nome: 'Safra',
    slug: 'safra',
    aliases: ['safra', 'banco safra'],
    pacotes: ['br.livetouch.safra.net'],
    formasSuportadas: ['cartao_credito', 'cartao_debito', 'pix'],
    validado: false,
  },
  {
    nome: 'InfinitePay',
    slug: 'infinitepay',
    aliases: ['infinitepay', 'cloudwalk'],
    pacotes: ['io.cloudwalk.infinitepaydash'],
    formasSuportadas: ['cartao_credito', 'cartao_debito', 'pix'],
    validado: false,
  },
];

function cartaoCorrespondeApp(cartao, app) {
  const slug = String(cartao?.banco_slug || '').trim().toLowerCase();
  const blob = normalizar(
    `${cartao?.nome || ''} ${cartao?.banco_nome || ''} ${cartao?.bancoNome || ''}`
  );

  if (slug && slug === String(app.slug || '').toLowerCase()) {
    return true;
  }

  if (blob.includes(normalizar(app.nome))) {
    return true;
  }

  return (app.aliases || []).some((alias) => {
    const chave = normalizar(alias);
    return chave && blob.includes(chave);
  });
}

/**
 * Monta pacotes permitidos a partir dos cartões cadastrados.
 * @param {array} cartoes
 * @returns {string[]}
 */
export function montarPacotesPermitidosPorCartoes(cartoes = []) {
  const pacotes = new Set();
  const lista = Array.isArray(cartoes) ? cartoes : [];

  for (const cartao of lista) {
    for (const app of APPS_BANCARIOS_NOTIFICACAO) {
      if (!cartaoCorrespondeApp(cartao, app)) {
        continue;
      }
      for (const pkg of app.pacotes || []) {
        const valor = String(pkg || '')
          .trim()
          .toLowerCase();
        if (valor) {
          pacotes.add(valor);
        }
      }
    }
  }

  return [...pacotes];
}

/**
 * Nomes dos bancos monitorados a partir dos cartões cadastrados.
 * @param {array} cartoes
 * @returns {string[]}
 */
export function listarBancosMonitoradosPorCartoes(cartoes = []) {
  const nomes = new Set();
  const lista = Array.isArray(cartoes) ? cartoes : [];

  for (const cartao of lista) {
    for (const app of APPS_BANCARIOS_NOTIFICACAO) {
      if (cartaoCorrespondeApp(cartao, app)) {
        nomes.add(app.nome);
      }
    }
  }

  return [...nomes];
}

export function listarPacotesConhecidos() {
  const set = new Set();
  for (const app of APPS_BANCARIOS_NOTIFICACAO) {
    for (const pkg of app.pacotes || []) {
      if (pkg) {
        set.add(String(pkg).trim().toLowerCase());
      }
    }
  }
  return [...set];
}

export function listarAliasesBancarios() {
  const set = new Set();
  for (const app of APPS_BANCARIOS_NOTIFICACAO) {
    for (const alias of app.aliases || []) {
      if (alias) {
        set.add(String(alias).trim().toLowerCase());
      }
    }
    if (app.nome) {
      set.add(String(app.nome).trim().toLowerCase());
    }
  }
  return [...set];
}

/**
 * Tenta mapear pacote/app/título para um banco do catálogo.
 */
export function resolverAppBancario({ pacoteOrigem, appOrigem, titulo, texto } = {}) {
  const pacote = String(pacoteOrigem || '').toLowerCase();
  const blob = `${appOrigem || ''} ${titulo || ''} ${texto || ''}`.toLowerCase();

  for (const app of APPS_BANCARIOS_NOTIFICACAO) {
    if ((app.pacotes || []).some((p) => String(p).toLowerCase() === pacote)) {
      return app;
    }
  }

  for (const app of APPS_BANCARIOS_NOTIFICACAO) {
    for (const alias of app.aliases || []) {
      if (alias && blob.includes(String(alias).toLowerCase())) {
        return app;
      }
    }
  }

  return null;
}

export default APPS_BANCARIOS_NOTIFICACAO;
