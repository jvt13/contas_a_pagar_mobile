/**
 * Catálogo inicial de apps bancários para captura experimental de notificações.
 * pacotes[] começa vazio — preenchido após aprendizado no aparelho de teste.
 * Não inventar pacotes sem confirmação real.
 */

export const APPS_BANCARIOS_NOTIFICACAO = [
  {
    nome: 'PicPay',
    slug: 'picpay',
    aliases: ['picpay', 'picpay card', 'pic pay'],
    pacotes: [],
  },
  {
    nome: 'Nubank',
    slug: 'nubank',
    aliases: ['nubank', 'nu', 'ultravioleta', 'roxinho'],
    pacotes: [],
  },
  {
    nome: 'Inter',
    slug: 'inter',
    aliases: ['inter', 'banco inter'],
    pacotes: [],
  },
  {
    nome: 'Itaú',
    slug: 'itau',
    aliases: ['itau', 'itaú', 'banco itau', 'banco itaú'],
    pacotes: [],
  },
  {
    nome: 'Santander',
    slug: 'santander',
    aliases: ['santander'],
    pacotes: [],
  },
  {
    nome: 'Bradesco',
    slug: 'bradesco',
    aliases: ['bradesco'],
    pacotes: [],
  },
  {
    nome: 'Banco do Brasil',
    slug: 'bb',
    aliases: ['banco do brasil', 'banco brasil'],
    pacotes: [],
  },
  {
    nome: 'Caixa',
    slug: 'caixa',
    aliases: ['caixa', 'caixa economica', 'caixa econômica'],
    pacotes: [],
  },
];

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
