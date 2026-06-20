/**
 * Seed mínimo para ambiente de desenvolvimento após limpeza acidental do banco.
 *
 * Cria (idempotente por e-mail):
 * - 1 organização
 * - 1 usuário de teste (senha: teste123)
 * - 2 cartões Nubank (crédito + débito) na organização do usuário
 *
 * Uso: node scripts/seed-minimo.js
 * Não remove dados existentes.
 * Bloqueado em NODE_ENV=production ou APP_ENV=production.
 */
import { isProductionEnvironment } from './postgres-env.js';

if (isProductionEnvironment()) {
  console.error(
    'seed-minimo.js bloqueado: não execute em produção (NODE_ENV ou APP_ENV = production).'
  );
  process.exit(1);
}

const TEST_EMAIL = 'dev.seed@organizecontas.local';
const TEST_PASSWORD = 'teste123';
const TEST_NAME = 'Dev Seed';
const TEST_USERNAME = 'devseed';

async function ensureUserWithOrg(model_users, hashPassword) {
  const existing = await model_users.selectEmail(TEST_EMAIL);
  if (existing?.organizacao_compartilhada) {
    const chave = await model_users.findOrganizationById(existing.organizacao_compartilhada);
    return {
      userId: existing.id,
      orgId: existing.organizacao_compartilhada,
      chave,
      created: false,
    };
  }

  if (existing) {
    const { id: orgId, chave } = await model_users.createOrganization();
    await model_users.updateUserOrganization(existing.id, orgId);
    return { userId: existing.id, orgId, chave, created: false, linked: true };
  }

  const { salt, hash } = hashPassword(TEST_PASSWORD);
  const user = await model_users.insert(TEST_NAME, TEST_USERNAME, TEST_EMAIL, salt, hash, 'seed-script');
  const { id: orgId, chave } = await model_users.createOrganization();
  await model_users.updateUserOrganization(user.id, orgId);
  return { userId: user.id, orgId, chave, created: true };
}

async function ensureCartao(pool, { orgId, userId, banco_slug, tipo_cartao, vencimento, dia_util, limite_credito }) {
  const { rows } = await pool.query(
    `SELECT id FROM tipo_cartao
     WHERE organization = $1 AND banco_slug = $2 AND tipo_cartao = $3
     LIMIT 1`,
    [String(orgId), banco_slug, tipo_cartao]
  );

  if (rows.length > 0) {
    return { id: rows[0].id, created: false };
  }

  const nome = banco_slug.charAt(0).toUpperCase() + banco_slug.slice(1);
  const { rows: inserted } = await pool.query(
    `INSERT INTO tipo_cartao (nome, tipo_cartao, vencimento, dia_util, conta_user, organization, limite_credito, banco_slug)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      nome,
      tipo_cartao,
      vencimento,
      dia_util,
      String(userId),
      String(orgId),
      limite_credito,
      banco_slug,
    ]
  );

  return { id: inserted[0].id, created: true };
}

async function main() {
  const pool = (await import('../src/database/conexao.js')).default;
  const model_users = await import('../src/database/models/query_users.js');
  const { hashPassword } = await import('../src/utils/auth.js');

  console.log('🌱 Seed mínimo OrganizeContas — início');

  const { userId, orgId, chave, created, linked } = await ensureUserWithOrg(model_users, hashPassword);
  console.log(
    created
      ? `✔ Usuário criado: ${TEST_EMAIL} (id ${userId})`
      : linked
        ? `✔ Usuário existente vinculado à nova org: ${TEST_EMAIL} (id ${userId})`
        : `✔ Usuário existente: ${TEST_EMAIL} (id ${userId})`
  );
  console.log(`✔ Organização id=${orgId} chave=${chave}`);

  const credito = await ensureCartao(pool, {
    orgId,
    userId,
    banco_slug: 'nubank',
    tipo_cartao: 'credito',
    vencimento: 10,
    dia_util: 3,
    limite_credito: 5000,
  });
  console.log(
    credito.created
      ? `✔ Cartão crédito Nubank criado (id ${credito.id})`
      : `✔ Cartão crédito Nubank já existia (id ${credito.id})`
  );

  const debito = await ensureCartao(pool, {
    orgId,
    userId,
    banco_slug: 'nubank',
    tipo_cartao: 'debito',
    vencimento: 1,
    dia_util: 1,
    limite_credito: null,
  });
  console.log(
    debito.created
      ? `✔ Cartão débito Nubank criado (id ${debito.id})`
      : `✔ Cartão débito Nubank já existia (id ${debito.id})`
  );

  console.log('\nCredenciais de teste:');
  console.log(`  E-mail: ${TEST_EMAIL}`);
  console.log(`  Senha:  ${TEST_PASSWORD}`);
  console.log(`  Org id (key_share_id): ${orgId}`);
  console.log(`  Chave compartilhamento: ${chave}`);
  console.log('\n🌱 Seed concluído.');

  await pool.end();
}

main().catch((err) => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
