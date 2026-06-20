# OrganizeContas - Regras de Desenvolvimento para Agentes de IA

> Regras oficiais para qualquer agente de IA (ou desenvolvedor) que for alterar este projeto.
> Documento complementar a `docs/PROJECT_STRUCTURE.md` (fonte de verdade da arquitetura) e `docs/CHANGELOG_STRUCTURE.md` (registro de mudanças estruturais).
>
> Última atualização: 11/06/2026.

---

## 1. Antes de Qualquer Alteração

1. **Leia `docs/PROJECT_STRUCTURE.md` primeiro.** Ele mapeia pastas, arquivos, hooks, telas, componentes, services, endpoints e regras de negócio. Use-o para localizar onde a funcionalidade vive antes de abrir arquivos.
2. **Identifique a camada correta** da mudança antes de editar:
   - Visual/layout/navegação → `src/screens/` ou `src/components/`.
   - Dados, estado, chamadas de API → `src/hooks/`.
   - Função pura, formatação, cálculo, catálogo → `src/utils/`.
   - URL/ambiente → `src/config/`.
3. **Verifique os consumidores** do arquivo que pretende alterar (seções 3–7 do `PROJECT_STRUCTURE.md`). Hooks e utils compartilhados afetam múltiplas telas.
4. **Não invente comportamento de backend.** O backend (`api-contas`) não está neste repositório. Os contratos conhecidos estão na seção 7 do `PROJECT_STRUCTURE.md`. Se precisar de um endpoint novo ou de mudança de contrato, sinalize explicitamente — não presuma que existe.

---

## 2. Princípios Obrigatórios

1. **Priorizar reutilização.** Antes de criar qualquer função/componente, procure um equivalente em `src/utils/` e `src/components/`.
2. **Evitar duplicação.** `ContasAPagar` e `ContasPagas` são gêmeas via `useRelatorioContas` — mudanças de relatório vão no hook, não copiadas nas duas telas.
3. **Alterar o menor número possível de arquivos.** Mudança mínima que resolve o problema.
4. **Não criar estrutura nova sem necessidade real.** Proibido criar: Redux/Context global, pasta `services/`, camadas de abstração, banco local. O padrão do projeto é `Screen → Hook → utils/services.js → API REST`.
5. **Não fazer refatorações oportunistas.** Corrija o que foi pedido; não "limpe" código vizinho sem solicitação (exceto se a correção depender disso).

---

## 3. Regras por Camada

### 3.1 Chamadas HTTP
- **Sempre** usar `getDados` / `postDados` / `putDados` / `deleteDados` de `src/utils/services.js`. **Nunca** usar `fetch`/`axios` direto.
- Endpoints sem autenticação (apenas `/auth/login` e `/auth/register`) usam `{ auth: false }`.
- Respostas: assumir `{ success, message?, data? }` já normalizado (`sucess` → `success` é tratado pelo cliente).
- Erros: usar `obterMensagemErro(error, fallback)` ou `formatarErroApi(error, contexto)` de `utils/util.js` para mensagens ao usuário.
- Não alterar `services.js` salvo mudança transversal de HTTP (headers, timeout, tratamento de erro). Se alterar, testar: login, uma chamada de cada método e o fluxo de 401 → logout.

### 3.2 Sessão e organização
- Ler/gravar sessão **somente** via `src/utils/authSession.js` (`saveSession`, `clearSession`, `getAuthToken`, `hasValidSession`).
- Em código novo, referenciar chaves do AsyncStorage **somente** por `STORAGE_KEYS` — nunca por string literal.
  - Atenção: já existem literais legadas (`'@userKeyShareId'`, `'@userId'`) em `useContas.js`, `useRelatorioContas.js`, `useCartaoManager.js`, `AppContent.js` e `ModalGerenciarLimite.js`. **Não mudar os valores das chaves** em `STORAGE_KEYS` sem atualizar todos esses pontos.
- Toda chamada de domínio carrega `organization` = `@userKeyShareId`. Código novo deve seguir esse padrão.

### 3.3 Hooks (`src/hooks/`)
- Hook por domínio. Endpoint novo de domínio existente → adicionar ao hook do domínio, não criar hook novo.
- Hooks que carregam sozinhos (`useContas`, `useRelatorioContas`, `useCategorias`, `useCartoesLookup`) vs. hooks com carga manual (`useCartaoManager.carregarCartoes()`, `useDashboardCartoes.carregar()`): **manter o contrato existente**; se consumir um hook de carga manual, lembrar de disparar a carga.
- `useLimites.js` **não é hook React** (módulo de funções de API) — não converter sem solicitação.
- `useNovaConta` concentra as regras de negócio de contas. Qualquer mudança nele exige verificação dos cenários: criação simples, débito, parcelado, recorrente, edição simples e edição em grupo (3 escopos).

### 3.4 Screens (`src/screens/`)
- Telas compõem hooks + componentes. **Não** colocar `fetch`/regra de cálculo na tela.
- Nova tela exige registro no stack de `App.js` e, se for de navegação principal, item no `MenuHeader.js`.
- A Home recarrega via callbacks (`onSuccess`, `onSave`, exclusão → `loadContas()`); o Dashboard recarrega via `useFocusEffect`. Não há sincronização automática entre telas — ao criar fluxo novo que altera dados, garanta o reload da(s) tela(s) afetada(s) pelo mesmo padrão.

### 3.5 Componentes (`src/components/`)
- Criar componente novo apenas se o bloco visual for usado em **2+ lugares** ou for um modal de domínio novo. Componente de uso único e acoplado à tela fica local (ex.: `CustomCheckBox` em `AppContent`).
- Respeitar as subpastas por domínio: `bancos/`, `categorias/`, `dashboard/`, `modal/`.
- Ícones: usar `AppIcon` (e registrar nomes semânticos em `APP_ICONS` quando fizer sentido); fechar modais com `ModalCloseButton`.
- Seleções simples: usar `CustomPicker` com opções `{ label, value }`.

### 3.6 Utils (`src/utils/`)
- Apenas funções puras/catálogos/cliente HTTP — **sem** `useState`/JSX.
- Função utilitária nova de domínio já coberto → adicionar ao util existente (`util.js`, `cartao.js`, `categorias.js`, `competenciaCartao.js`, etc.). Criar util novo só para domínio realmente novo.
- Não usar `montarDataVencimentoConta` (deprecada) — usar `calcularVencimentoPorCartao`/`obterVencimentoSugeridoPorCartao`.

### 3.7 Config (`src/config/`)
- URLs de API mudam **apenas** em `environments.js` (e perfis do `eas.json`/`.env`). Nunca hardcodar URL fora daí.
- `config/api.js` é camada de compatibilidade — não adicionar lógica nele.

---

## 4. Convenções Críticas (NUNCA violar sem alinhamento)

| # | Convenção | Detalhe |
|---|---|---|
| 1 | **Mês 0-based** | Filtros, contas e competência usam `'0'`–`'11'` (string). **Exceção**: domínio de limites envia 1–12 (`ModalGerenciarLimite` faz `parseInt(mes)+1`). Não misturar. |
| 2 | **Eixos de listagem** | Home = `data_lancamento`; relatórios (`/contas_pendentes`, `/contas_pagas`) = vencimento. O `onSuccess` da Home depende disso. |
| 3 | **Datas** | App envia/exibe `dd/MM/yyyy`. Normalizar entradas com `normalizarVencimentoParaApi` e validar com `validarVencimentoConta`. |
| 4 | **Valores monetários** | Backend recebe string `"NNNN.NN"`; display via `formatarMoeda` (`{display, backend}`) e `formatCurrency`. |
| 5 | **Débito** | Conta de débito em criação: sem parcelamento/recorrência, vencimento = hoje, `paga: true`. Cartão débito: `vencimento='1'`, `dia_util='1'`, sem limite. |
| 6 | **Parcelado × recorrente** | Mutuamente exclusivos. Parcelas: 2/3/6/12/18/24 (custom 1–36); recorrência: 3/6/12/24 (custom 1–36). |
| 7 | **Escopo de grupo** | Edição/exclusão de conta em grupo usa `apenas_esta` / `esta_e_futuras` / `todas` (`ESCOPOS_PARCELA`); cancelar aborta. |
| 8 | **Competência de fatura** | Compra até o `dia_util` (fechamento) entra na fatura corrente; `dia_vencimento > dia_fechamento` → paga no mesmo mês, senão mês seguinte. Regras em `utils/competenciaCartao.js` — espelhadas no fallback `utils/dashboardCartao.js` (mudou em um, mudar no outro). |
| 9 | **Categorias** | Contas guardam apenas o **slug**. Custom são locais por organização (`@categorias_custom_<orgId>`). Não remover categorias padrão (contas antigas exibiriam "desconhecida"). |
| 10 | **Expansão de parcelas** | Quem cria os N registros de parcela/recorrência é o **backend**; o app só envia metadados. |

---

## 5. Pontos Sensíveis — checar antes de mexer

(Detalhes na seção 12 do `PROJECT_STRUCTURE.md`.)

1. `utils/services.js` — afeta todas as requisições e o logout por 401.
2. Strings literais de AsyncStorage (5 arquivos) — risco de drift com `STORAGE_KEYS`.
3. `modal-insert.js` — **possível bug de TDZ**: `cartaoSelecionado` é usado (linhas ~35–43) antes da declaração (linha ~46). Não assumir que `ehDebito` funciona como aparenta; verificar em runtime antes de alterar a lógica de débito desse modal.
4. `useRelatorioContas` — compartilhado por duas telas; seu `useEffect` não reage a `endpoint`/`listaKey`.
5. Código morto conhecido (não usar como referência): `CartaoLabel.js` sem consumidores; props `loadContas` (`ModalConfig`) e `onSalvarLimite` (`ModalGerenciarLimite`) não usadas; `formatarLimite` sem uso; import `isCartaoDebito` não usado em `ModalGerenciarCartao`.

---

## 6. Proibições

1. **Não** alterar código quando a tarefa pedir apenas análise/documentação.
2. **Não** usar `fetch`/`axios` direto, nem criar segundo cliente HTTP.
3. **Não** criar store global (Redux/Zustand/Context) sem solicitação explícita.
4. **Não** criar banco local (SQLite/Realm) — o backend é o banco.
5. **Não** hardcodar URLs, ids de organização ou tokens.
6. **Não** mudar valores de `STORAGE_KEYS` (ver seção 3.2).
7. **Não** renomear/mover arquivos ou pastas sem necessidade real — e, se fizer, atualizar `PROJECT_STRUCTURE.md` e registrar em `CHANGELOG_STRUCTURE.md`.
8. **Não** commitar `.env` nem credenciais.
9. **Não** adicionar dependências novas sem justificativa; preferir o que já existe no `package.json`.
10. **Não** duplicar regras de negócio que já existem em `utils/` (parcelamento, competência, tipo de cartão, categorias).

---

## 7. Checklist de Conclusão de Tarefa

Antes de encerrar qualquer alteração de código:

- [ ] A mudança está na camada correta (screen/hook/util/config)?
- [ ] Reutilizei o que já existia em vez de duplicar?
- [ ] Verifiquei todos os consumidores dos arquivos alterados?
- [ ] Convenções críticas respeitadas (mês 0-based, datas BR, valor backend, organização)?
- [ ] Telas afetadas recarregam corretamente (callbacks/`useFocusEffect`)?
- [ ] Sem lints novos nos arquivos editados?
- [ ] Houve mudança **estrutural** (arquivo criado/removido/movido, hook/tela/componente novo, endpoint novo, mudança de contrato)? Se sim:
  - [ ] Atualizei as seções relevantes de `docs/PROJECT_STRUCTURE.md`.
  - [ ] Registrei a entrada em `docs/CHANGELOG_STRUCTURE.md` (e na tabela da seção 14 do `PROJECT_STRUCTURE.md`).

---

## 8. Manutenção da Documentação

- `docs/PROJECT_STRUCTURE.md` é a **fonte de verdade** da arquitetura: deve ser atualizado no mesmo conjunto de mudanças que alterar a estrutura (não "depois").
- `docs/CHANGELOG_STRUCTURE.md` registra o histórico de mudanças estruturais — formato e critérios estão definidos nele.
- Este arquivo (`AI_DEVELOPMENT_RULES.md`) só muda quando uma regra de desenvolvimento for criada, alterada ou revogada.
