// src/database/conexao.js
import pkg from 'pg';
import { getPostgresConfig } from './postgres-config.js';

const { Pool } = pkg;

let poolConfig;

try {
  poolConfig = getPostgresConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('Conectado ao banco de dados PostgreSQL.');
});

pool.on('error', (err) => {
  console.error('Erro no pool de conexões:', err);
});

export default pool;
