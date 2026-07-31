# OrganizeContas - Visão Geral do App

> **Referência principal do estado atual do produto**: o que o app faz hoje, padrão visual/UX, decisões de arquitetura e produto, backlog futuro e informações de build/deploy.
> Complementa `docs/PROJECT_STRUCTURE.md` (arquitetura detalhada — fonte de verdade técnica), `docs/AI_DEVELOPMENT_RULES.md` (regras para agentes) e `docs/CHANGELOG_STRUCTURE.md` (histórico de mudanças estruturais).
>
> Última atualização: 30/07/2026.

---

## 1. O que é o OrganizeContas

Aplicativo mobile (Android, React Native/Expo) de **controle de contas pessoais** com suporte a **organizações compartilhadas** (mais de um usuário vendo as mesmas contas). O repositório é um **monorepo**: app mobile na raiz + backend REST/PostgreSQL em `api-contas-a-pagar/`.

---

## 2. Funcionalidades atuais

- **Login / cadastro / organização compartilhada** (`Login`, `Register`, `ModalShareOrganization`; sessão local via AsyncStorage).
- **Cadastro de contas** (despesas) com cartão, categoria/subcategoria, vencimento e valor (`Modal_Nova_Conta`).
- **Importar mensagem bancária** (MVP) — cola texto de SMS/notificação na Central de Controle; parser **local** sugere pré-lançamento; usuário revisa e salva pelo fluxo atual. Sem SMS automático; texto bruto não vai ao servidor nem é persistido.
- **Lançamentos detectados** (experimental Android) — captura opcional via `NotificationListenerService` (desativada por padrão). Exige permissão manual de acesso a notificações no Android. Em APK instalado manualmente, o Android pode exigir **“Permitir configurações restritas”**. Cria só **rascunhos locais** no aparelho e **somente de bancos/cartões cadastrados** (allowlist dinâmica por pacote). Usuário revisa e salva pelo mesmo fluxo de importação → `Modal_Nova_Conta`. Categoria continua obrigatória/manual. **Não** lê SMS, **não** envia texto ao backend, **não** cria conta automaticamente.
- **Contas a Pagar** — relatório de pendentes do mês (eixo vencimento).
- **Contas Pagas** — relatório de pagas do mês (eixo vencimento).
- **Cartão de crédito** — com dia de fechamento (`dia_util`), dia de vencimento e limite; **competência financeira**: compra até o fechamento entra na fatura corrente; se dia de vencimento > dia de fechamento a fatura é paga no mesmo mês, senão no mês seguinte.
- **Cartão de débito** — tratado diferente do crédito: conta nasce paga, vencimento = hoje, sem parcelamento/recorrência/limite.
- **Parcelamento real** — o backend cria N registros de parcela; edição/exclusão com escopo (`apenas_esta` / `esta_e_futuras` / `todas`).
- **Recorrências/fixas** — recorrência com quantidade de meses (3/6/12/24 ou custom).
- **Categorias visuais** (ícone + cor), **categorias customizadas** por organização (AsyncStorage) e **subcategorias**.
- **Limite mensal** de gasto (por mês/ano/organização) e **Home com card de uso do limite** (`UsoLimiteCard`).
- **Dashboard Financeiro** — resumo do mês: limite/despesas/disponível, composição crédito/débito, top categorias, indicadores.
- **Dashboard Cartões** — visão operacional por cartão: limite, utilizado, fatura atual, próximos vencimento/fechamento (débito: gastos do mês).
- **Relatório Categoria/Subcategoria** — gastos agrupados por categoria e subcategoria no mês.
- **Metas Financeiras** — metas mensais recorrentes por categoria (locais), com acompanhamento gasto × meta.
- **Fechamento Mensal** — snapshot local do resumo do mês, com fechar/reabrir/atualizar.
- **Backup/restore do PostgreSQL** — `npm run backup` no backend (ver `docs/BACKUP_AND_RESTORE.md`).
- **APK Android via EAS Build** (perfis `preview-local`, `preview`, `production-apk`, `production`).

### Telas registradas no stack (11)

`Login`, `Register`, `Home` (AppContent), `ContasPagas`, `ContasAPagar`, `DashboardCartoes`, `RelatorioCategorias`, `DashboardFinanceiro`, `MetasFinanceiras`, `FechamentoMensal`, `LancamentosDetectados`.

---

## 3. Padrão visual e UX (modernização concluída)

Todas as telas financeiras foram modernizadas (jun/2026) seguindo o mesmo padrão:

- **Fundo claro** `#F4F8FF` em todas as telas.
- **Cards brancos** (`#fff`) com borda `#E3EBF5`, **bordas arredondadas** (`borderRadius: 14`) e **sombra/elevation leve**.
- **Azul institucional** `#1E4DB7` (header nativo, ícones, títulos de seção).
- **Verde** `#1E8E5A` para positivo/pago (badges "Paga", botões de salvar/fechar).
- **Laranja/âmbar** `#C47A1A` / `#E6A817` para pendente/atenção.
- **Vermelho** `#D64545` para estouro/excedido (limite estourado, meta excedida, excluir, reabrir mês).
- **Estados vazios elegantes**: ícone cinza (`#8CA0B3`) + título + texto secundário.
- **Safe area** aplicada nas telas com listas/scroll (via hook `useSafeAreaInsets`, com padding manual — não `SafeAreaView`).

### Navegação e headers

- **Home não tem header nativo** (`headerShown: false`); usa o **`MenuHeader`** (menu hamburger global + avatar/saudação + logout) — único lugar do app com menu global.
- **Telas secundárias usam header nativo do Stack** (fundo azul `#1E4DB7`, botão Voltar, título), configurado em `stackScreenOptions` no `App.js`. Elas **não** usam `MenuHeader`.
- **Central de Controle** (`ModalConfig`: gerenciar limite, criar cartão, **importar mensagem**, **lançamentos detectados**, controle de organização) é acessível **apenas pela Home**. O modal filtra opções por callbacks válidos; `DashboardCartoes` **não** usa `ModalConfig`.

### `MonthNavigator` (navegação mensal padronizada)

Componente `src/components/MonthNavigator.js`: navegação sequencial `‹ Mês/Ano ›` que **substituiu os pickers de mês/ano** (`CustomPicker`) nas telas financeiras.

- Telas que usam: **Home, Contas a Pagar, Contas Pagas, Dashboard Financeiro, Relatório Categoria/Subcategoria, Metas Financeiras, Fechamento Mensal**.
- Regras:
  - o mês interno continua **string 0-based** (`"0"` a `"11"`); ano como string;
  - retroceder de janeiro vira **dezembro do ano anterior**; avançar de dezembro vira **janeiro do ano seguinte**;
  - trocar o mês **não altera nenhuma regra financeira** — apenas o filtro;
  - `CustomPicker` **não deve voltar** a ser usado para mês/ano nessas telas (permanece apenas para seleções simples, ex.: cartão no modal de conta).
- **Exceção — Dashboard Cartões**: **não usa `MonthNavigator` por decisão de produto/técnica.** Ele é a **visão operacional atual** dos cartões (snapshot do momento, sem filtro de período). Filtro mensal/competência de cartões ficou para versão futura (ver backlog, seção 6).

---

## 4. Regras financeiras sensíveis

> Não alterar sem revisão explícita. Detalhes técnicos em `PROJECT_STRUCTURE.md` §10 e §12.

### Eixos de data

```text
Home                             → data_lancamento
Contas a Pagar                   → vencimento
Contas Pagas                     → vencimento
Dashboard Financeiro             → vencimento
Relatório Categoria/Subcategoria → vencimento
Metas Financeiras                → vencimento
Fechamento Mensal                → vencimento
```

### Mês no frontend

```text
Frontend trabalha mês como string 0-based: "0" a "11".
Exceção: o domínio de limites envia mês 1-based ao backend (conversão feita apenas no local correto).
```

### Limite mensal

- Home e telas financeiras usam a regra consolidada: `obterLimiteMensal` (`useLimites` → `POST /contas_lancadas` → `total_limite`).
- **Limite é orçamento, não receita** — não chamar de receita na UI.
- Não duplicar a conversão de mês (0-based ↔ 1-based) fora do local correto (`ModalGerenciarLimite` / backend).

### Cartões

- Fechamento (`dia_util`) e vencimento dos cartões **não devem ser alterados sem revisão**.
- A **competência financeira** dos cartões (regras em `utils/competenciaCartao.js`, espelhadas no fallback `utils/dashboardCartao.js`) é regra sensível.
- **Débito é tratado diferente de crédito** (conta nasce paga, sem parcela/recorrência, vencimento hoje).
- Dashboard Cartões é **snapshot operacional atual**; visão por mês/competência é backlog futuro.

### Parcelamento

- Parcelamento real preservado (backend cria os N registros).
- A Home consolida parcelas por compra quando aplicável.
- Contas a Pagar/Pagas exibem as parcelas por vencimento.

### Recorrências

- Recorrência/fixa com quantidade de meses; a Home consolida recorrências; relatórios usam vencimento.

### Metas Financeiras

- Metas são **mensais recorrentes por categoria**: valem para **todos os meses** até serem editadas/excluídas.
- O gasto comparado muda conforme o mês selecionado (eixo vencimento).
- Persistência **local** via AsyncStorage por organização (`@metas_financeiras_<orgId>`).
- **Não há meta específica por mês** nesta fase.

### Fechamento Mensal

- Fechamento é **snapshot local** (AsyncStorage `@fechamentos_mensais_<orgId>`, por organização).
- **Não bloqueia** edição de contas, pagamentos ou limites.
- Reabrir **remove** o snapshot; atualizar **sobrescreve** o snapshot (com confirmação).

---

## 5. Arquitetura e decisões

- **Frontend**: React Native 0.81 / Expo SDK 54 (managed), navegação com stack nativo, sem Redux/Context global. Estado = hooks por domínio + AsyncStorage.
- **Backend**: REST em Node.js/Express 5 + PostgreSQL, dentro do **monorepo local** (`api-contas-a-pagar/`, porta 3100).
- **VPS de produção** atualmente roda o backend a partir de um **repositório separado** (`github.com/jvt13/contas_a_pagar`), conforme `api-contas-a-pagar/DEPLOY_VPS.md` — o monorepo é a cópia de trabalho local.
- **Toda chamada REST passa por `src/utils/services.js`** (`getDados`/`postDados`/`putDados`/`deleteDados`). **Nunca** usar `fetch`/`axios` direto em telas.
- Padrão recomendado: **`Screen → Hook → utils/services.js → API REST`**.
- Mudanças estruturais devem atualizar `docs/PROJECT_STRUCTURE.md` e registrar entrada em `docs/CHANGELOG_STRUCTURE.md`.

---

## 6. Backlog futuro (roadmap)

Funcionalidades registradas para versões futuras — **nenhuma delas deve ser implementada sem solicitação explícita**:

- Exportação CSV;
- Exportação Excel/PDF;
- Baixa de fatura/cartão pago em lote;
- Marcar todas as contas de uma fatura como pagas de uma vez;
- Dashboard Cartões por mês/competência (hoje é snapshot operacional);
- Histórico de faturas;
- Notificações inteligentes;
- Share intent (compartilhar texto do Android para o app) para importar mensagem;
- Validar na prática pacotes bancários preparados (Nubank, Itaú, etc.) com notificação real;
- Separar “modo aprendizado” em lista/diagnóstico própria de notificações ignoradas (hoje só texto informativo na UI);
- Sugestão automática de categoria a partir da mensagem;
- Outras melhorias funcionais futuras.

> **Nota (31/07/2026)**: captura experimental Android (Notification Listener) é opt-in local. Salva rascunhos **somente** se o pacote estiver na allowlist dos cartões cadastrados **e** a notificação tiver evento transacional de despesa concluído (não basta R$/“cartão”/“pix”). Propaganda, loteria, recarga/prêmios e **PIX recebido** são ignorados. PicPay e Mercado Pago compras reais validados. “Modo aprendizado” é informativo (sem toggle) até haver lista separada de diagnóstico. Detecção por SMS **permanece fora de escopo**.

---

## 7. Build, versão e deploy

- **APK Android gerado via EAS Build**; perfil de referência: **`production-apk`** (APK, distribuição interna, API de produção).
- **Versão atual**: `1.0.8` (`app.json` → `expo.version`), **`versionCode` 19** (`expo.android.versionCode`).
- **API de produção**: `https://api-contas.srv-jvt.com` (definida nos perfis do `eas.json`; dev usa `.env` → `EXPO_PUBLIC_API_URL`).
- O **backend não foi atualizado** no build da captura experimental (versionCode 19) — mudanças exclusivamente mobile/módulo nativo local.
- Deploy do backend no VPS: ver `api-contas-a-pagar/DEPLOY_VPS.md` (PM2 `contas-api`, porta 3100, PostgreSQL via variáveis `PG*`). Não expor tokens, segredos ou credenciais em documentação ou código.

---

## 8. Cuidados para o próximo agente

1. **Leia primeiro**: `docs/AI_DEVELOPMENT_RULES.md` e `docs/PROJECT_STRUCTURE.md`.
2. Respeite os **eixos de data** (Home = `data_lancamento`; demais telas financeiras = vencimento) e o **mês 0-based**.
3. Use `MonthNavigator` para filtro mês/ano em telas financeiras — não reintroduzir pickers.
4. Não altere regras de competência/fechamento de cartões, parcelamento ou limite sem revisão.
5. Dashboard Cartões permanece **sem filtro mensal** até decisão em contrário.
6. Mudança estrutural → atualizar `PROJECT_STRUCTURE.md` + registrar em `CHANGELOG_STRUCTURE.md`.
