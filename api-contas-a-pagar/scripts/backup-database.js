/**
 * Backup manual do banco PostgreSQL (formato custom pg_dump -Fc).
 *
 * Uso: npm run backup
 * Saída: api-contas-a-pagar/backups/organizecontas_YYYY-MM-DD_HH-mm-ss.dump
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPostgresEnv, resolvePostgresBinary } from './postgres-env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function formatTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function main() {
  const pg = getPostgresEnv();
  const backupsDir = path.join(projectRoot, 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });

  const filename = `organizecontas_${formatTimestamp()}.dump`;
  const outputPath = path.join(backupsDir, filename);

  console.log(`Gerando backup de "${pg.database}" em ${pg.host}:${pg.port}...`);

  const pgDump = resolvePostgresBinary('pg_dump');

  const result = spawnSync(
    pgDump,
    [
      '-Fc',
      '-f',
      outputPath,
      '-h',
      pg.host,
      '-p',
      String(pg.port),
      '-U',
      pg.user,
      pg.database,
    ],
    {
      env: {
        ...process.env,
        PGPASSWORD: pg.password,
      },
      stdio: 'inherit',
    }
  );

  if (result.error) {
    console.error(
      'Falha ao executar pg_dump. Verifique se o cliente PostgreSQL está instalado e no PATH.'
    );
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  const stats = fs.statSync(outputPath);
  console.log(`Backup concluído: ${outputPath}`);
  console.log(`Tamanho: ${(stats.size / 1024).toFixed(1)} KB`);
}

main();
