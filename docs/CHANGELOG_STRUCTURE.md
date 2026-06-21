# OrganizeContas - Changelog de Estrutura

> Registro histórico de **mudanças estruturais** do projeto OrganizeContas.
> Complementa a seção 14 de `docs/PROJECT_STRUCTURE.md` (tabela resumida) com entradas detalhadas.
> Regras de quando/como registrar: ver abaixo e `docs/AI_DEVELOPMENT_RULES.md` (seção 7).

---

## 1. O que é mudança estrutural

Registrar aqui quando ocorrer **qualquer** um dos itens:

- Criação, remoção, renomeação ou movimentação de arquivo/pasta em `src/`, raiz ou `docs/`.
- Criação ou remoção de **tela** (rota no stack de `App.js`).
- Criação ou remoção de **hook**, **componente reutilizável** ou **util/service**.
- Novo **endpoint** consumido, ou mudança de contrato (payload/resposta/rota) de endpoint existente.
- Mudança em **entidade do backend** refletida no app (campo novo/removido em contas, cartões, limites, users, organizations).
- Mudança nas **chaves do AsyncStorage** (`STORAGE_KEYS` ou `@categorias_custom_<orgId>`).
- Mudança de **convenção crítica** (mês 0-based, formato de datas/valores, eixos de listagem, escopos de grupo, regras de competência).
- Adição/remoção de **dependência** no `package.json` ou mudança nos perfis de build (`eas.json`, `app.config.js`).

**Não registrar** aqui: correções de bug sem impacto estrutural, ajustes de estilo/layout, textos, refatorações internas que não mudam contratos nem arquivos.

---

## 2. Como registrar

1. Adicionar uma entrada no topo da seção 4 (mais recente primeiro), usando o template da seção 3.
2. Adicionar a linha resumida na tabela da seção 14 de `docs/PROJECT_STRUCTURE.md`.
3. Atualizar as seções afetadas de `docs/PROJECT_STRUCTURE.md` (estrutura de pastas, mapa de arquivos, hooks, screens, componentes, services, endpoints, regras de negócio) na **mesma** mudança.

---

## 3. Template de entrada

```markdown
### AAAA-MM-DD — Título curto da mudança

- **Tipo**: [Novo arquivo | Remoção | Renomeação/Movimentação | Nova tela | Novo hook | Novo componente | Novo endpoint | Mudança de contrato | Mudança de convenção | Dependência | Outro]
- **Descrição**: o que mudou e por quê (1–3 frases).
- **Arquivos impactados**:
  - `caminho/arquivo1.js` (criado | removido | alterado | movido de X)
  - `caminho/arquivo2.js`
- **Endpoints afetados**: (se houver) `MÉTODO /rota` — o que mudou.
- **Impacto para consumidores**: telas/hooks/componentes que precisaram ou precisarão de ajuste.
- **Documentação atualizada**: seções alteradas em `PROJECT_STRUCTURE.md`.
```

---

## 4. Histórico

> Entradas em ordem cronológica inversa (mais recente primeiro).

### 2026-06-20 — Fechamento Mensal (MVP)

- **Tipo**: Nova tela + Novo hook + Novo util + Nova chave AsyncStorage.
- **Descrição**: MVP de fechamento mensal: prévia financeira do mês (eixo vencimento), snapshot local por organização com limite, despesas, pagos/pendentes, top categorias e observação opcional. Permite fechar, reabrir e atualizar fechamento com confirmação. **Não bloqueia** edição de contas — registro/conferência apenas. Sem endpoint novo.
- **Arquivos impactados**:
  - `src/screens/FechamentoMensal.js` (criado)
  - `src/hooks/useFechamentoMensal.js` (criado)
  - `src/utils/resumoFinanceiroVencimento.js` (criado)
  - `App.js` (alterado — rota `FechamentoMensal`)
  - `src/components/MenuHeader.js` (alterado — item de menu)
  - `docs/PROJECT_STRUCTURE.md`, `docs/CHANGELOG_STRUCTURE.md` (alterados)
- **Endpoints afetados**: nenhum novo (reutiliza `GET /contas_pendentes`, `GET /contas_pagas`, `POST /contas_lancadas` via `obterLimiteMensal`).
- **Impacto para consumidores**: nenhum nas telas existentes; nova rota no stack e menu; nova chave `@fechamentos_mensais_<orgId>` no AsyncStorage.
- **Documentação atualizada**: `PROJECT_STRUCTURE.md` §4 (hook), §5 (tela), §6 (MenuHeader), §8 (storage), §11, §14.

---

### 2026-06-20 — Metas Financeiras (MVP)

- **Tipo**: Nova tela + Novo hook + Nova chave AsyncStorage.
- **Descrição**: MVP de metas financeiras por categoria: cadastro/edição/exclusão de valor limite mensal recorrente (local), acompanhamento de gasto atual no mês (eixo vencimento) com percentual e faixas de status. Reutiliza endpoints existentes e padrão AsyncStorage de categorias custom; sem endpoint novo.
- **Arquivos impactados**:
  - `src/screens/MetasFinanceiras.js` (criado)
  - `src/hooks/useMetasFinanceiras.js` (criado)
  - `App.js` (alterado — rota `MetasFinanceiras`)
  - `src/components/MenuHeader.js` (alterado — item de menu)
  - `docs/PROJECT_STRUCTURE.md`, `docs/CHANGELOG_STRUCTURE.md` (alterados)
- **Endpoints afetados**: nenhum novo (reutiliza `GET /contas_pendentes`, `GET /contas_pagas`).
- **Impacto para consumidores**: nenhum nas telas existentes; nova rota no stack e menu; nova chave `@metas_financeiras_<orgId>` no AsyncStorage.
- **Documentação atualizada**: `PROJECT_STRUCTURE.md` §4 (hook), §5 (tela), §6 (MenuHeader), §8 (storage), §11, §14.

---

### 2026-06-20 — Dashboard Financeiro Geral (MVP)

- **Tipo**: Nova tela.
- **Descrição**: Painel consolidado da situação financeira do mês (eixo vencimento): resumo Limite mensal/Despesas/Disponível, composição Crédito/Débito/Dinheiro, top 5 categorias e indicadores rápidos. Reutiliza endpoints e hooks existentes; agregação client-side na tela. Limite mensal = orçamento (`total_limite`), não receita.
- **Arquivos impactados**:
  - `src/screens/DashboardFinanceiro.js` (criado)
  - `App.js` (alterado — rota `DashboardFinanceiro`)
  - `src/components/MenuHeader.js` (alterado — item de menu)
  - `docs/PROJECT_STRUCTURE.md`, `docs/CHANGELOG_STRUCTURE.md` (alterados)
- **Endpoints afetados**: nenhum (reutiliza `GET /contas_pendentes`, `GET /contas_pagas`, `GET /dashboard/cartoes`, `GET /get_cartoes` via hooks).
- **Impacto para consumidores**: nenhum nas telas existentes; nova rota no stack e menu.
- **Documentação atualizada**: `PROJECT_STRUCTURE.md` §5 (telas), §6 (MenuHeader), §14.

---

### 2026-06-20 — Correção: limite mensal em Contas a Pagar / Contas Pagas

- **Tipo**: Correção de bug (frontend).
- **Descrição**: `useRelatorioContas` deixou de ler `total_limite`/`limiteDoMes` de `/contas_pendentes` e `/contas_pagas` (campos inexistentes). Passou a usar `obterLimiteMensal`, alinhado ao Dashboard Financeiro e à Home.
- **Arquivos impactados**:
  - `src/hooks/useRelatorioContas.js` (alterado)
  - `docs/PROJECT_STRUCTURE.md`, `docs/CHANGELOG_STRUCTURE.md` (alterados)
- **Endpoints afetados**: nenhum (reutiliza `POST /contas_lancadas` via `obterLimiteMensal`).
- **Impacto para consumidores**: `ContasAPagar` e `ContasPagas` exibem limite correto por mês/ano.
- **Documentação atualizada**: `PROJECT_STRUCTURE.md` §4 (`useRelatorioContas`), §9.

---

### 2026-06-20 — Correção: limite mensal no Dashboard Financeiro

- **Tipo**: Correção de bug (frontend).
- **Descrição**: Dashboard buscava `total_limite` em `/contas_pendentes` e `/contas_pagas`, que não retornam limite. Passou a usar `obterLimiteMensal` (`POST /contas_lancadas`, mês 0-based no filtro, conversão 1-based no backend — igual à Home).
- **Arquivos impactados**:
  - `src/hooks/useLimites.js` (alterado — `obterLimiteMensal`)
  - `src/screens/DashboardFinanceiro.js` (alterado)
  - `docs/PROJECT_STRUCTURE.md`, `docs/CHANGELOG_STRUCTURE.md` (alterados)
- **Endpoints afetados**: nenhum (reutiliza `POST /contas_lancadas` já existente).
- **Impacto para consumidores**: apenas Dashboard Financeiro exibe limite correto por mês/ano.
- **Documentação atualizada**: `PROJECT_STRUCTURE.md` §5, §7 (`useLimites.js`).

---

### 2026-06-20 — Correção semântica: Dashboard Financeiro (limite ≠ receita)

- **Tipo**: Correção de comportamento/UI (sem mudança estrutural).
- **Descrição**: Renomeados indicadores do resumo: Receitas → Limite mensal, Saldo → Disponível. Limite tratado como orçamento; sem limite definido exibe estado explícito em vez de valor zerado.
- **Arquivos impactados**:
  - `src/screens/DashboardFinanceiro.js` (alterado)
  - `docs/PROJECT_STRUCTURE.md`, `docs/CHANGELOG_STRUCTURE.md` (alterados)
- **Endpoints afetados**: nenhum.
- **Impacto para consumidores**: apenas textos e rótulos do Dashboard Financeiro.
- **Documentação atualizada**: `PROJECT_STRUCTURE.md` §5 (`DashboardFinanceiro.js`).

---

### 2026-06-20 — Auditoria de segurança PostgreSQL

- **Tipo**: Correção de configuração / documentação (backend).
- **Descrição**: Auditoria final da migração para env: `.env` raiz removido do índice Git, `DEPLOY_VPS.md` e `BACKUP_AND_RESTORE.md` alinhados a `postgres-config.js` (sem senhas hardcoded). Validação de backup, guard de seed e falha rápida sem `PGPASSWORD`.
- **Arquivos impactados**:
  - `.gitignore` (já continha `.env` e `api-contas-a-pagar/backups/`)
  - `api-contas-a-pagar/DEPLOY_VPS.md` (alterado — placeholders)
  - `docs/BACKUP_AND_RESTORE.md` (alterado — §8 `postgres-config.js`)
  - `docs/PROJECT_STRUCTURE.md` (alterado — subseção configuração PG)
- **Endpoints afetados**: nenhum.
- **Impacto para consumidores**: nenhum no app mobile; operadores devem usar `.env` para credenciais PG.
- **Documentação atualizada**: `PROJECT_STRUCTURE.md` §8, `BACKUP_AND_RESTORE.md` §8, `CHANGELOG_STRUCTURE.md`.

---

### 2026-06-20 — Conexão PostgreSQL via variáveis de ambiente

- **Tipo**: Mudança de configuração (backend).
- **Descrição**: Removida senha hardcoded de `conexao.js` e `estrutura.js`. Configuração centralizada em `src/database/postgres-config.js` (`PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE`, `PGPASSWORD`). Scripts de backup reutilizam o mesmo módulo.
- **Arquivos impactados**:
  - `api-contas-a-pagar/src/database/postgres-config.js` (criado)
  - `api-contas-a-pagar/src/database/conexao.js` (alterado)
  - `api-contas-a-pagar/src/database/estrutura.js` (alterado)
  - `api-contas-a-pagar/scripts/postgres-env.js` (alterado — re-export)
  - `api-contas-a-pagar/scripts/backup-database.js` (alterado — alinhamento)
  - `api-contas-a-pagar/.env.example` (alterado)
  - `docs/BACKUP_AND_RESTORE.md`, `docs/PROJECT_STRUCTURE.md` (alterados)
- **Endpoints afetados**: nenhum.
- **Impacto para consumidores**: backend exige `.env` com `PGPASSWORD` (ou variável no shell); sem alteração no app mobile.
- **Documentação atualizada**: `PROJECT_STRUCTURE.md` §8, `BACKUP_AND_RESTORE.md`.

---

### 2026-06-15 — Backup e restore PostgreSQL (backend)

- **Tipo**: Novo arquivo (scripts + documentação operacional).
- **Descrição**: MVP de proteção de dados: `npm run backup` (`pg_dump -Fc`) em `api-contas-a-pagar/backups/`, doc `docs/BACKUP_AND_RESTORE.md`, seed bloqueado em produção.
- **Arquivos impactados**:
  - `api-contas-a-pagar/scripts/backup-database.js` (criado)
  - `api-contas-a-pagar/scripts/postgres-env.js` (criado)
  - `api-contas-a-pagar/scripts/seed-minimo.js` (alterado — guard produção)
  - `api-contas-a-pagar/package.json` (alterado — script `backup`)
  - `api-contas-a-pagar/.env.example` (alterado — vars PG*)
  - `.gitignore` (alterado — `api-contas-a-pagar/backups/`)
  - `docs/BACKUP_AND_RESTORE.md` (criado)
- **Endpoints afetados**: nenhum.
- **Impacto para consumidores**: nenhum no app mobile; operação manual no backend.
- **Documentação atualizada**: `docs/PROJECT_STRUCTURE.md` (seção 8), este changelog.

---

### 2026-06-15 — Relatório por Categoria: eixo vencimento

- **Tipo**: Mudança de contrato (consumo de API na tela existente).
- **Descrição**: `RelatorioCategorias` deixa de usar `POST /contas_lancadas` (eixo `data_lancamento`) e passa a unificar `GET /contas_pendentes` + `GET /contas_pagas` (eixo **vencimento**), alinhado aos demais relatórios financeiros.
- **Arquivos impactados**:
  - `src/screens/RelatorioCategorias.js` (alterado)
  - `docs/PROJECT_STRUCTURE.md` (alterado)
- **Endpoints afetados**: consumo de `/contas_pendentes` e `/contas_pagas` pela tela; removido uso de `/contas_lancadas` nesta tela.
- **Impacto para consumidores**: valores do relatório por categoria passam a refletir vencimento no mês, não data de lançamento.
- **Documentação atualizada**: seções 1, 5, 7 e 11 de `PROJECT_STRUCTURE.md`.

---

### 2026-06-15 — Nova tela Relatório por Categoria

- **Tipo**: Nova tela.
- **Descrição**: MVP de relatório agrupado por categoria/subcategoria no mês selecionado. Reutiliza `POST /contas_lancadas` (eixo `data_lancamento`) e `useContas`; agrupamento e percentuais calculados na tela com `useMemo`.
- **Arquivos impactados**:
  - `src/screens/RelatorioCategorias.js` (criado)
  - `App.js` (alterado — rota `RelatorioCategorias`)
  - `src/components/MenuHeader.js` (alterado — item de menu)
  - `docs/PROJECT_STRUCTURE.md` (alterado)
- **Endpoints afetados**: nenhum novo; consumo adicional de `POST /contas_lancadas` pela nova tela.
- **Impacto para consumidores**: nenhuma regressão em telas existentes; menu ganha entrada "Relatório por Categoria".
- **Documentação atualizada**: seções 1, 3, 5, 6, 7, 11 e 14 de `PROJECT_STRUCTURE.md`.

---

### 2026-06-11 — Criação da documentação técnica do projeto

- **Tipo**: Novo arquivo (documentação).
- **Descrição**: Criação da pasta `docs/` com a documentação oficial da arquitetura, as regras de desenvolvimento para agentes de IA e este changelog estrutural. Baseline gerada a partir da análise completa do código existente (6 telas, 8 arquivos de hooks, 21 componentes, 4 services, 5 entidades de backend, 19 endpoints).
- **Arquivos impactados**:
  - `docs/PROJECT_STRUCTURE.md` (criado)
  - `docs/AI_DEVELOPMENT_RULES.md` (criado)
  - `docs/CHANGELOG_STRUCTURE.md` (criado)
- **Endpoints afetados**: nenhum.
- **Impacto para consumidores**: nenhum (nenhum arquivo de código alterado).
- **Documentação atualizada**: baseline — documento `PROJECT_STRUCTURE.md` completo (seções 1–14).

---

## 5. Estado de referência (baseline 2026-06-11)

Snapshot da estrutura na data de criação deste changelog, para comparação futura:

| Categoria | Quantidade | Itens |
|---|---|---|
| Telas | 6 | `Login`, `Register`, `AppContent` (Home), `ContasAPagar`, `ContasPagas`, `DashboardCartoes` |
| Hooks | 8 | `useContas`, `useNovaConta`, `useCategorias`, `useCartaoManager`, `useCartoesLookup`, `useDashboardCartoes`, `useLimites` (módulo de API), `useRelatorioContas` |
| Componentes | 21 | 3 raiz + 2 `bancos/` + 7 `categorias/` + 2 `dashboard/` + 7 `modal/` |
| Services | 4 | `utils/services.js`, `utils/authSession.js`, `hooks/useLimites.js`, `utils/check_version.js` |
| Utils | 14 | arquivos em `src/utils/` |
| Config | 2 | `config/environments.js`, `config/api.js` |
| Entidades backend | 5 | `users`, `organizations`, `cartoes`, `contas`, `limites` |
| Endpoints consumidos | 19 | ver seção 7 de `PROJECT_STRUCTURE.md` |
| Chaves AsyncStorage | 6 | `@authToken`, `@userId`, `@username`, `@userKeyShare`, `@userKeyShareId`, `@categorias_custom_<orgId>` |
