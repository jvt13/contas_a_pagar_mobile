# OrganizeContas — Backup e Restore do PostgreSQL

> Procedimentos para o banco **`contas_a_pagar`** do backend `api-contas-a-pagar`.
> Não altera schema, endpoints nem o app mobile.

---

## 1. Onde ficam os arquivos

| Item | Caminho |
|------|---------|
| Script de backup | `api-contas-a-pagar/scripts/backup-database.js` |
| Helper de env | `api-contas-a-pagar/scripts/postgres-env.js` |
| Backups gerados | `api-contas-a-pagar/backups/` |
| Formato | `organizecontas_YYYY-MM-DD_HH-mm-ss.dump` (custom, `pg_dump -Fc`) |
| Git | `api-contas-a-pagar/backups/` está no `.gitignore` |

---

## 2. Pré-requisitos

1. **Cliente PostgreSQL** com `pg_dump` e `pg_restore` (no Windows, o script tenta localizar em `C:\Program Files\PostgreSQL\<versão>\bin\`; opcional: `PG_BIN` ou `PG_DUMP_PATH` no `.env`).
2. **Credenciais** via ambiente ou arquivo local:
   - Copie `api-contas-a-pagar/.env.example` → `api-contas-a-pagar/.env`
   - Defina `PGPASSWORD` (ou `POSTGRES_PASSWORD`)
3. Servidor PostgreSQL acessível (`PGHOST`, padrão `localhost`).

Variáveis suportadas (padrão libpq):

| Variável | Alternativa | Padrão |
|----------|-------------|--------|
| `PGHOST` | `POSTGRES_HOST` | `localhost` |
| `PGPORT` | `POSTGRES_PORT` | `5432` |
| `PGUSER` | `POSTGRES_USER` | `postgres` |
| `PGPASSWORD` | `POSTGRES_PASSWORD` | **obrigatória** |
| `PGDATABASE` | `POSTGRES_DB` | `contas_a_pagar` |

**Nenhuma senha fica hardcoded nos scripts de backup.**

---

## 3. Como gerar backup

No diretório do backend:

```bash
cd api-contas-a-pagar
npm run backup
```

Equivalente:

```bash
node scripts/backup-database.js
```

Saída esperada:

```text
api-contas-a-pagar/backups/organizecontas_2026-06-15_14-30-00.dump
```

### Quando executar backup

- Antes de limpar dados manualmente no banco
- Antes de migrations ou scripts destrutivos
- Antes de testes que alteram usuários/organizações em massa
- Periodicamente em ambiente de staging (se houver dados reais)
- **Após** marcos importantes de dados de produção (via cron/agendador externo — não incluído neste MVP)

---

## 4. Como restaurar (manual — não automatizado)

> **Atenção:** restore **substitui** objetos do banco de destino. Leia os riscos na seção 6.

### 4.1 Parar a API (recomendado)

Encerre o processo Node que usa o pool (`npm start` / PM2) para evitar conexões ativas durante o restore.

### 4.2 Restore completo (banco já existe, sobrescreve dados)

Substitua `CAMINHO_DO_DUMP` pelo arquivo em `backups/`.

**Linux / macOS / Git Bash:**

```bash
cd api-contas-a-pagar
export PGPASSWORD="sua_senha"

pg_restore \
  -h localhost \
  -p 5432 \
  -U postgres \
  -d contas_a_pagar \
  --clean \
  --if-exists \
  --no-owner \
  --role=postgres \
  backups/organizecontas_YYYY-MM-DD_HH-mm-ss.dump
```

**Windows (PowerShell):**

```powershell
cd api-contas-a-pagar
$env:PGPASSWORD = "sua_senha"

pg_restore `
  -h localhost `
  -p 5432 `
  -U postgres `
  -d contas_a_pagar `
  --clean `
  --if-exists `
  --no-owner `
  --role=postgres `
  backups\organizecontas_YYYY-MM-DD_HH-mm-ss.dump
```

Flags usadas:

| Flag | Motivo |
|------|--------|
| `--clean` | Remove objetos antes de recriar |
| `--if-exists` | Evita erro se objeto não existir |
| `--no-owner` | Ignora dono original do dump (útil em dev) |
| `--role=postgres` | Aplica objetos como usuário local |

### 4.3 Restore em banco vazio (primeira instalação)

Se o banco `contas_a_pagar` não existir:

```bash
createdb -h localhost -U postgres contas_a_pagar
pg_restore -h localhost -U postgres -d contas_a_pagar --no-owner backups/organizecontas_....dump
```

### 4.4 Validar após restore

1. Subir a API: `npm start`
2. Login com usuário conhecido do backup
3. Conferir Home e relatórios do mês

---

## 5. Seed de desenvolvimento

O script `scripts/seed-minimo.js` cria usuário/cartões de teste.

**Bloqueado** quando:

- `NODE_ENV=production`, ou
- `APP_ENV=production`

Em produção, use **restore de backup**, não seed.

---

## 6. Riscos

| Risco | Mitigação |
|-------|-----------|
| Perda total de dados sem backup | `npm run backup` antes de operações destrutivas |
| Restore sobrescreve dados atuais | Confirmar arquivo `.dump` correto; parar API |
| Backups no disco local | Copiar dumps importantes para storage externo (nuvem, NAS) |
| Credenciais em `.env` | `.env` no `.gitignore`; não commitar dumps |
| `pg_dump` ausente no PATH | Instalar PostgreSQL client tools |
| Pool da API com senha hardcoded | Resolvido: `postgres-config.js` + `.env` (ver seção 8) |
| Seed em produção | Bloqueio por `NODE_ENV` / `APP_ENV` |

---

## 7. Referência rápida

```bash
# Backup
cd api-contas-a-pagar && npm run backup

# Restore (exemplo)
pg_restore -h localhost -U postgres -d contas_a_pagar --clean --if-exists --no-owner backups/organizecontas_....dump
```

---

## 8. Configuração PostgreSQL (`postgres-config.js`)

A conexão da API, scripts de backup e `seed-minimo.js` usam **`api-contas-a-pagar/src/database/postgres-config.js`**:

| Função | Descrição |
|--------|-----------|
| `loadDotEnv()` | Carrega `api-contas-a-pagar/.env` sem sobrescrever variáveis já definidas no shell |
| `getPostgresConfig()` | Monta `{ host, port, user, database, password }` a partir de `PG*` / `POSTGRES_*` |
| `isProductionEnvironment()` | `true` se `NODE_ENV=production` ou `APP_ENV=production` |

**Regras de segurança:**

- `PGPASSWORD` (ou `POSTGRES_PASSWORD`) é **obrigatória** — não há fallback embutido.
- Se a senha estiver ausente, a API e `npm run backup` encerram com mensagem clara antes de conectar.
- Defaults permitidos apenas para dev local: `localhost`, porta `5432`, usuário `postgres`, banco `contas_a_pagar`.
- Consumidores: `conexao.js` (pool), `estrutura.js` (setup), `scripts/postgres-env.js` (re-export para backup/seed).

Exemplo mínimo em `api-contas-a-pagar/.env` (copiar de `.env.example`):

```env
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=sua_senha_local
PGDATABASE=contas_a_pagar
```
