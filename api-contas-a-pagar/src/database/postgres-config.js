import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.resolve(__dirname, '../../.env');

/**
 * Carrega .env simples (KEY=VALUE) sem sobrescrever variáveis já definidas no shell.
 */
export function loadDotEnv(filePath = ENV_FILE) {
  if (!filePath || !fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

/**
 * Resolve conexão PostgreSQL a partir de variáveis de ambiente (padrão libpq).
 * Senha obrigatória via PGPASSWORD ou POSTGRES_PASSWORD — nunca hardcoded.
 *
 * @param {{ database?: string }} overrides — ex.: { database: 'postgres' } para CREATE DATABASE
 */
export function getPostgresConfig(overrides = {}) {
  const host = process.env.PGHOST || process.env.POSTGRES_HOST || 'localhost';
  const port = Number(process.env.PGPORT || process.env.POSTGRES_PORT || 5432);
  const user = process.env.PGUSER || process.env.POSTGRES_USER || 'postgres';
  const database =
    overrides.database ||
    process.env.PGDATABASE ||
    process.env.POSTGRES_DB ||
    'contas_a_pagar';
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;

  if (!password) {
    throw new Error(
      'Credencial ausente: defina PGPASSWORD ou POSTGRES_PASSWORD no ambiente ou em api-contas-a-pagar/.env'
    );
  }

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('PGPORT / POSTGRES_PORT inválida.');
  }

  return { host, port, user, database, password };
}

export function isProductionEnvironment() {
  const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase();
  const appEnv = String(process.env.APP_ENV || '').toLowerCase();
  return nodeEnv === 'production' || appEnv === 'production';
}
