import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  getPostgresConfig,
  isProductionEnvironment,
  loadDotEnv,
} from '../src/database/postgres-config.js';

export { loadDotEnv, isProductionEnvironment };

/**
 * Mesma configuração do pool da API; encerra o processo se faltar credencial.
 */
export function getPostgresEnv() {
  try {
    return getPostgresConfig();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Resolve pg_dump / pg_restore no PATH ou instalação padrão do PostgreSQL (Windows).
 */
export function resolvePostgresBinary(name) {
  const fromEnv = process.env[`${name.toUpperCase()}_PATH`] || process.env.PG_BIN;
  if (fromEnv) {
    const candidate = fromEnv.includes(path.sep) ? fromEnv : path.join(fromEnv, `${name}.exe`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], {
    encoding: 'utf8',
  });
  if (which.status === 0 && which.stdout.trim()) {
    return which.stdout.trim().split('\n')[0].trim();
  }

  if (process.platform === 'win32') {
    const baseDir = process.env['ProgramFiles'] || 'C:\\Program Files';
    const root = path.join(baseDir, 'PostgreSQL');
    if (fs.existsSync(root)) {
      const versions = fs
        .readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
        .reverse();
      for (const version of versions) {
        const candidate = path.join(root, version, 'bin', `${name}.exe`);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  }

  return name;
}
