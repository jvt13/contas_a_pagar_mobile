# OrganizeContas - Estrutura do Projeto

> Documentação técnica oficial da arquitetura do projeto **OrganizeContas** (`controle_contas`).
> Deve ser mantida atualizada sempre que houver mudanças estruturais relevantes (ver seção 14).
>
> Última atualização: 11/06/2026 (gerada a partir da análise do código real).

---

## 1. Visão Geral

### Objetivo do sistema

Aplicativo mobile de **controle de contas pessoais**: lançamento de contas (despesas) por mês/ano, associadas a cartões (crédito/débito), com categorias/subcategorias, limite de gasto mensal, parcelamento, recorrência, marcação de pagamento, relatórios (pagas/pendentes) e dashboard de cartões. Suporta **organizações compartilhadas** (mais de um usuário visualizando as mesmas contas via chave de compartilhamento).

### Tecnologias utilizadas

| Tecnologia | Versão | Papel |
|---|---|---|
| Expo (managed) | ~54.0.34 | SDK / build (EAS) |
| React | 19.1.0 | Core |
| React Native | 0.81.5 | Core |
| @react-navigation/native + native-stack | ^7.x | Navegação (stack nativo) |
| @react-native-async-storage/async-storage | 2.2.0 | Persistência local (sessão, categorias custom) |
| @react-native-community/datetimepicker | 8.4.4 | Date picker do modal de conta |
| @react-native-picker/picker | 2.11.1 | Picker (ModalGerenciarLimite) |
| react-native-gesture-handler / reanimated / worklets | ~2.28 / ~4.1 / 0.5.1 | Gestos e animações |
| react-native-version-check | ^3.5.0 | Aviso de atualização na Play Store |
| expo-build-properties | ~1.0.10 | `usesCleartextTraffic: true` (HTTP em dev) |
| dotenv (dev) | — | Carrega `.env` no `app.config.js` |

### Arquitetura geral

- **Front-end only**: este repositório contém apenas o app React Native. Os dados ficam em um **backend REST próprio** (`api-contas-a-pagar`) — não há SQLite/Realm local.
  - Dev: `http://192.168.15.100:3100` (via `.env` → `EXPO_PUBLIC_API_URL`).
  - Produção: `https://api-contas.srv-jvt.com` (perfis EAS em `eas.json`).
- **Sem Redux / sem Context próprio**: o "estado global" é o `AsyncStorage` (sessão, organização, categorias custom) + chamadas REST. Cada tela usa hooks customizados que encapsulam os fetches.
- **Camadas**: `Screen → Hook → utils/services.js (cliente HTTP) → API REST (backend = banco de dados)`.
- **Sessão**: `userId` + `userKeyShareId` (organização) no AsyncStorage. O backend não emite JWT real; em 401 o app limpa a sessão e reseta a navegação para `Login` (handler registrado em `App.js`).

### Fluxo principal da aplicação

1. `index.js` registra `App.js` (Expo).
2. `App.js` registra o handler de 401, verifica `hasValidSession()` e decide a rota inicial (`Home` ou `Login`).
3. `Login` → `POST /auth/login` → `saveSession()` → navega para `Home`.
4. `Home` (`AppContent.js`) lista as contas do mês via `useContas` (`POST /contas_lancadas`), exibe totais, permite criar/editar/excluir contas, marcar como paga e abrir a Central de Controle (limite, cartões, organização).
5. Telas de relatório (`ContasAPagar`, `ContasPagas`, `RelatorioCategorias`) e `DashboardCartoes` são acessadas pelo menu (`MenuHeader`).

```
index.js → App.js (NavigationContainer + Stack)
  ├── Login ───────── POST /auth/login → saveSession → Home
  ├── Register ────── POST /auth/register → Login
  ├── Home (AppContent)
  │     ├── useContas / useCategorias / useCartaoManager
  │     └── Modais: Nova Conta, Config, Limite, Cartão, Ações, Compartilhar Org
  ├── ContasAPagar ── useRelatorioContas('/contas_pendentes')
  ├── ContasPagas ─── useRelatorioContas('/contas_pagas')
  ├── RelatorioCategorias ─ useCategorias + GET /contas_pendentes + /contas_pagas (eixo vencimento)
  └── DashboardCartoes ── useDashboardCartoes (useFocusEffect)
```

---

## 2. Estrutura de Pastas

```
controle_contas/
├── App.js                  # Raiz: navegação, providers, handler de 401, rota inicial
├── index.js                # registerRootComponent(App)
├── app.json / app.config.js# Configuração Expo (nome, ícones, versionCode, extra.EXPO_PUBLIC_API_URL)
├── babel.config.js         # babel-preset-expo + plugin do reanimated
├── eas.json                # Perfis de build (preview-local, preview, production-apk, production)
├── .env / .env.example     # EXPO_PUBLIC_API_URL (dev)
├── package.json            # Dependências e scripts (build, bump de versão)
├── *.bat                   # Scripts Windows de build (APK/AAB via EAS)
├── assets/                 # Imagens e ícones do app
├── docs/                   # Documentação (este arquivo)
└── src/
    ├── config/             # Configuração de ambiente/API
    ├── screens/            # Telas (rotas do stack)
    ├── components/         # Componentes reutilizáveis
    │   ├── bancos/         # Badge e grid de seleção de banco emissor
    │   ├── categorias/     # Seletores/pickers/modais de categoria e subcategoria
    │   ├── dashboard/      # Cards do dashboard de cartões
    │   └── modal/          # Modais de domínio (conta, cartão, limite, config, org)
    ├── hooks/              # Hooks customizados (estado + chamadas de API)
    └── utils/              # Funções puras, cliente HTTP, sessão, regras de cálculo
```

| Pasta | Responsabilidade | Pode existir | NÃO deve existir |
|---|---|---|---|
| `src/config/` | URLs de API por ambiente, resolução build-time | Constantes de ambiente, `buildApiBaseUrl`, `resolveApiUrlForBuild` | Chamadas de API, lógica de negócio, componentes |
| `src/screens/` | Telas registradas no stack do `App.js` | Composição de hooks + componentes, estados de UI da tela, navegação | Chamadas `fetch` diretas, regras de cálculo (devem ir para hooks/utils) |
| `src/components/` | Componentes visuais reutilizáveis e modais | Componentes apresentacionais com props; modais que usam hooks de domínio | Endpoints novos definidos inline (usar hooks/utils), estado global |
| `src/components/bancos/` | UI relacionada a banco emissor | `BancoBadge`, `BancoSelectorGrid` | Lógica de catálogo de bancos (fica em `utils/bancos.js`) |
| `src/components/categorias/` | UI de seleção/criação de categorias | Pickers, selectors, modais de criação, label | Persistência (fica em `useCategorias` + `utils/categorias.js`) |
| `src/components/dashboard/` | Cards do dashboard de cartões | `CartaoDashboardCard`, `CartaoUtilizacaoBar` | Cálculo de resumo (fica em `utils/dashboardCartao.js`) |
| `src/components/modal/` | Modais de domínio (CRUDs) | Modais de conta, cartão, limite, config, organização, picker genérico | Regras de validação complexas (preferir hooks) |
| `src/hooks/` | Estado + integração com a API por domínio | Hooks `useXxx` que retornam estado e ações | Componentes visuais, estilos |
| `src/utils/` | Funções puras, cliente HTTP, sessão, catálogos | Formatação, validação, cálculos de competência/parcela, `services.js`, `authSession.js` | Estado React (`useState` etc.), JSX |
| `assets/` | Imagens estáticas | Ícones, splash, imagens | Código |

---

## 3. Mapa de Arquivos

### Raiz

#### `App.js`
- **Responsabilidade**: Componente raiz. Monta `GestureHandlerRootView` + `NavigationContainer` + stack nativo com as 7 rotas (`Login`, `Register`, `Home`, `ContasPagas`, `ContasAPagar`, `RelatorioCategorias`, `DashboardCartoes`). Registra `setUnauthorizedHandler` (401 → `clearSession()` + reset para `Login`). Decide rota inicial via `hasValidSession()`.
- **Utilizado por**: `index.js`.
- **Dependências**: `src/screens/*`, `src/utils/services.js` (`setUnauthorizedHandler`), `src/utils/authSession.js` (`clearSession`, `hasValidSession`).
- **Impacto de alteração**: Quebra navegação inteira, fluxo de login/logout automático e tratamento de sessão expirada.

#### `index.js`
- **Responsabilidade**: `registerRootComponent(App)`.
- **Impacto de alteração**: App não inicializa.

#### `app.config.js`
- **Responsabilidade**: Injeta `extra.EXPO_PUBLIC_API_URL` e `extra.APP_ENV` em build-time usando `resolveApiUrlForBuild(!!process.env.EAS_BUILD)` e `dotenv`.
- **Dependências**: `src/config/environments.js`, `.env`.
- **Impacto de alteração**: App pode apontar para API errada (dev × produção).

#### `app.json`
- **Responsabilidade**: Metadados Expo: nome **OrganizeContas**, pacote `com.zevitor.controle_contas`, `versionCode`, ícones, splash, plugins (`expo-web-browser`, `datetimepicker`, `expo-build-properties` com `usesCleartextTraffic: true`).
- **Impacto de alteração**: Builds/publicação na loja.

#### `eas.json`
- **Responsabilidade**: Perfis de build: `preview-local` (APK, API local), `preview` (APK interno, API prod), `production-apk` (APK, API prod), `production` (AAB para loja, API prod). Cada perfil define `EXPO_PUBLIC_API_URL`.
- **Impacto de alteração**: URL de API embutida nos builds.

### `src/config/`

#### `src/config/environments.js`
- **Responsabilidade**: Fonte única de verdade das URLs de API. Exporta `API_URL_PRODUCTION` (`https://api-contas.srv-jvt.com`), `DEV_API_HOST/PORT/SCHEME` (`http://192.168.15.100:3100`), `buildApiBaseUrl()`, `API_URL_LOCAL`, `resolveApiUrlForBuild(isEasBuild)` (prioridade: `EXPO_PUBLIC_API_URL` env → produção se EAS → local).
- **Utilizado por**: `app.config.js`, `src/config/api.js`.
- **Impacto de alteração**: Todas as chamadas HTTP do app.

#### `src/config/api.js`
- **Responsabilidade**: Camada de compatibilidade — apenas re-exporta nomes de `environments.js` (`API_BASE_URL`, `DEV_API_URL`, etc.).
- **Utilizado por**: `src/utils/services.js`.
- **Impacto de alteração**: Fallback de URL do cliente HTTP.

### `src/utils/`

#### `src/utils/services.js`
- **Responsabilidade**: **Cliente HTTP único** do app. Exporta `getDados`, `postDados`, `putDados`, `deleteDados`, `setUnauthorizedHandler`, `getApiUrl`, `normalizeApiResponse`. Timeout de 15s (`AbortController`), headers `Content-Type: application/json` + `X-Client: mobile` + `Authorization: Bearer <token>` (quando `auth !== false`), normaliza `sucess` → `success`, trata 401 (chama handler global), 403 e erros de rede.
- **Utilizado por**: todos os hooks que falam com a API, `Login.js`, `Register.js`, `AppContent.js`, `ModalShareOrganization.js`, `App.js`.
- **Dependências**: `expo-constants`, `src/config/api.js`, `src/utils/authSession.js` (`getAuthToken`).
- **Impacto de alteração**: **Todas** as chamadas de API. Mudar formato de resposta/erro quebra os hooks e o tratamento de sessão expirada.

#### `src/utils/authSession.js`
- **Responsabilidade**: Sessão no AsyncStorage. Exporta `STORAGE_KEYS` (`@authToken`, `@userId`, `@username`, `@userKeyShare`, `@userKeyShareId`), `saveSession()`, `clearSession()`, `getAuthToken()`, `hasValidSession()` (= existe `@userId` E `@userKeyShareId`).
- **Utilizado por**: `App.js`, `Login.js`, `MenuHeader.js`, `ModalShareOrganization.js`, `ModalGerenciarCartao.js`, `useNovaConta`, `useCategorias`, `useDashboardCartoes`, `useCartoesLookup`, `services.js`.
- **Impacto de alteração**: Login/logout, identificação da organização em todas as chamadas. **Atenção**: `useContas.js`, `useRelatorioContas.js`, `useCartaoManager.js`, `AppContent.js` e `ModalGerenciarLimite.js` leem as chaves por **string literal** (`'@userKeyShareId'`/`'@userId'`) — mudar o valor das chaves em `STORAGE_KEYS` sem atualizar esses pontos quebra silenciosamente.

#### `src/utils/util.js`
- **Responsabilidade**: Utilitários gerais: `formatarDataBR`, `validarVencimentoConta` (regex `dd/MM/yyyy`), `normalizarVencimentoParaApi` (aceita `dd/MM/yyyy`, ISO ou só dia), `formatarMoeda` (→ `{display, backend}`), `formatCurrency`, `aplicarMascaraValor`, `sanitizeEmail`, `buildQueryParams`, `salvarItemStorage`, `obterMensagemErro`, `formatarErroApi`, `msgToast` (Toast Android / Alert iOS), `mesesOptions` (Janeiro=`'0'` … Dezembro=`'11'`), `montarDataVencimentoConta` (**deprecado**).
- **Utilizado por**: praticamente todas as telas, hooks e modais.
- **Impacto de alteração**: Formatação de moeda/data em todo o app; `mesesOptions` define a convenção de mês 0-based usada nos filtros e na API.

#### `src/utils/competenciaCartao.js`
- **Responsabilidade**: Regras de fatura/competência de cartão de crédito: `calcularProximoFechamentoContaCartao[Date]`, `calcularVencimentoContaCartao[Date|ISO]`, `calcularVencimentoContaDebito`, `calcularVencimentoPorCartao`, `obterVencimentoSugeridoPorCartao`, `parseDataBRparaDate`, `extrairMesAnoCompetencia`. Regra central: compra até o dia de fechamento (`dia_util`) entra na fatura corrente; se `dia_vencimento > dia_fechamento` paga no mesmo mês do fechamento, senão no mês seguinte.
- **Utilizado por**: `utils/dashboardCartao.js`, `components/modal/modal-insert.js`, `hooks/useNovaConta.js`.
- **Impacto de alteração**: Sugestão de vencimento ao criar conta, cálculo do mês/ano de competência enviado ao backend, datas exibidas no dashboard.

#### `src/utils/parcelamento.js`
- **Responsabilidade**: `OPCOES_PARCELAS = [2,3,6,12,18,24]`, `ESCOPOS_PARCELA = { APENAS_ESTA: 'apenas_esta', ESTA_E_FUTURAS: 'esta_e_futuras', TODAS: 'todas' }`, `extrairNomeBaseParcela` (remove sufixo ` n/m`), `formatarLabelParcela`, `contaPertenceGrupoParcela`, `perguntarEscopoParcela` (Alert com 3 opções + Cancelar).
- **Utilizado por**: `useNovaConta`, `AppContent.js` (exclusão), `modal-insert.js`, `ModalContaAcoes.js`.
- **Impacto de alteração**: Edição/exclusão em grupo de parcelas/recorrências (valores de `escopo` enviados à API).

#### `src/utils/recorrencia.js`
- **Responsabilidade**: `OPCOES_RECORRENCIA = [3,6,12,24]` e `isCategoriaFixa(id)` (id literal `'fixa'` ativa recorrência automática).
- **Utilizado por**: `modal-insert.js`.
- **Impacto de alteração**: Opções de meses de recorrência e comportamento da categoria legado "fixa".

#### `src/utils/tipoCartao.js`
- **Responsabilidade**: `isCartaoDebito(cartao)`, `isCartaoCredito(cartao)` (vazio = crédito), `formatarDataBRHoje()`, `cartaoCreditoRequerCamposFatura()`.
- **Utilizado por**: `dashboardCartao.js`, `useCartaoManager`, `useNovaConta`, `modal-insert.js`, `ModalGerenciarCartao.js`.
- **Impacto de alteração**: Toda a distinção crédito × débito (validações, conta criada como paga, vencimento forçado para hoje).

#### `src/utils/cartao.js`
- **Responsabilidade**: Apresentação de cartões: `formatarTipoCartao`, `formatarNomeCartao` ("Nubank - Crédito"), `buildCartoesMap`, `formatarLabelCartaoPorId` (com fallback para `tipo_cartao` legado contendo `'credito'`/`'debito'`).
- **Utilizado por**: `CartaoLabel.js`, `useCartoesLookup`, `modal-insert.js`, `ModalGerenciarCartao.js`, `dashboardCartao.js`.
- **Impacto de alteração**: Labels de cartão em listas/relatórios.

#### `src/utils/bancos.js`
- **Responsabilidade**: Catálogo de bancos emissores (`BANCOS_CATALOGO`: nubank, inter, picpay, itau, santander, bradesco, bb, caixa, sicoob, sicredi, outro) com cor/sigla; `listarBancos`, `resolverBanco`, `resolverBancoOutro`, `inferirBancoDoNome` (para cartões legados sem `banco_slug`), `resolverBancoParaCartao`, `obterNomeExibicaoCartao`, `enriquecerCartaoComBanco`.
- **Utilizado por**: `utils/cartao.js`, `utils/dashboardCartao.js`, `BancoBadge.js`, `BancoSelectorGrid.js`, `useCartaoManager`.
- **Impacto de alteração**: Visual dos badges de banco e inferência de banco em cartões antigos.

#### `src/utils/categorias.js`
- **Responsabilidade**: Catálogo client-side de categorias: `CATEGORIAS_PADRAO` (15 ativas + 3 legadas: `fixa`, `variavel`, `renda`), `SUBCATEGORIAS_PADRAO`, `CORES_CATEGORIA`, `ICONES_CATEGORIA`, `slugifyCategoria`, `mesclarCategorias`/`mesclarSubcategorias` (custom sobrescreve padrão), `resolverCategoria`/`resolverSubcategoria` (com placeholder "desconhecida"), `formatarLabelCategoria[Completa]`, `filtrarCategorias`/`filtrarSubcategorias`, `isCategoriaRaiz`.
- **Utilizado por**: `useCategorias`, `CategoriaLabel.js`, `CategoryPickerModal.js`, `SubcategoryPickerModal.js`, `NovaCategoriaModal.js`.
- **Impacto de alteração**: Exibição/resolução de categorias em todas as listas. As contas guardam apenas o **slug** (string) — remover uma categoria padrão deixa contas antigas com placeholder "desconhecida".

#### `src/utils/dashboardCartao.js`
- **Responsabilidade**: Agregação client-side para o dashboard: `classificarUtilizacao` (`≥80` crítico, `≥50` atenção), `montarResumoCartao`, `montarDashboardCartoes`. Crédito: soma pendentes do cartão → `utilizado`, `disponivel`, `percentualUtilizado`, `faturaAtual` (contas com vencimento = próximo vencimento). Débito: soma contas **pagas** do mês.
- **Utilizado por**: `useDashboardCartoes` (fallback quando `/dashboard/cartoes` não responde).
- **Impacto de alteração**: Valores exibidos no `DashboardCartoes` quando o backend não fornece o endpoint agregado.

#### `src/utils/check_version.js`
- **Responsabilidade**: `verificarAtualizacao()` — compara versão com a Play Store (`react-native-version-check`) e oferece atualização. No-op em `__DEV__`.
- **Utilizado por**: `AppContent.js` (boot).
- **Impacto de alteração**: Aviso de atualização em produção.

### `src/hooks/` — ver seção 4 (detalhada)

### `src/screens/` — ver seção 5 (detalhada)

### `src/components/` — ver seção 6 (detalhada)

---

## 4. Hooks

> Convenção do projeto: mês sempre **0-based em string** (`'0'`–`'11'`); organização = `@userKeyShareId` do AsyncStorage.

### `src/hooks/useContas.js` — `useContas(ano, mes, sharedOrgKey)`
- **Responsabilidade**: Carrega contas lançadas do mês/ano da organização (Home) + totais + anos disponíveis; marca/desmarca conta como paga.
- **Entradas**: `ano`, `mes` (0-based), `sharedOrgKey` (fallback de organização).
- **Saídas**: `{ contas, totais: { total_limite, total_contas, total_contas_pagas, total_contas_pendentes }, anos, loading, loadContas, marcarComoPaga(id, paga) }`.
- **Endpoints**: `POST /contas_lancadas { ano, mes, organization }`; `POST /marcar-paga { mes, index: id, paga }`.
- **Dependências**: `utils/services` (`postDados`), `utils/util` (`obterMensagemErro`), AsyncStorage (literal `'@userKeyShareId'`).
- **Comportamento**: `useEffect` recarrega quando `ano`/`mes`/`sharedOrgKey` mudam. `marcarComoPaga` faz update otimista local e depois `loadContas()` para revalidar totais.
- **Telas que utilizam**: `AppContent.js` (Home).

### `src/hooks/useNovaConta.js` — `useNovaConta(ano, mes, onSuccess, editarConta, cartaoSelecionado)`
- **Responsabilidade**: Formulário de criação/edição de conta — validações, débito × crédito, parcelamento/recorrência, escopo de grupo, envio à API.
- **Entradas**: `ano`/`mes` da tela (fallback de competência), `onSuccess(filtro?)`, `editarConta` (boolean), `cartaoSelecionado` (objeto, para detectar débito).
- **Saídas**: `{ form, setForm, valorBackend, setValorBackend, salvarConta }` (+ re-exporta `OPCOES_PARCELAS`). `salvarConta()` retorna `true` no sucesso; `false` em falha/cancelamento de escopo.
- **Endpoints**: `POST /form_conta` (criar), `POST /form_conta/editar` (editar, com campo `escopo`).
- **Dependências**: `utils/services`, `utils/authSession` (`STORAGE_KEYS`), `utils/util`, `utils/competenciaCartao` (`extrairMesAnoCompetencia`), `utils/tipoCartao`, `utils/parcelamento`.
- **Regras embutidas**: campos obrigatórios (`tipo_cartao`, `nome`, `categoria`, `vencimento`, `valor`); débito em criação → sem parcelamento/recorrência, vencimento = hoje, `paga: true`; parcelado × recorrente mutuamente exclusivos; competência (`mes`/`ano` do payload) derivada do vencimento; edição de conta em grupo pergunta escopo (`apenas_esta`/`esta_e_futuras`/`todas`); `data_lancamento` = hoje; nome enviado sem sufixo ` n/m`.
- **Utilizado por**: `components/modal/modal-insert.js` (único consumidor).

### `src/hooks/useCategorias.js` — `useCategorias()`
- **Responsabilidade**: Categorias/subcategorias = padrão (constantes) + custom (AsyncStorage por organização, chave `@categorias_custom_<orgId>`). Sem backend.
- **Entradas**: nenhuma.
- **Saídas**: `{ categorias, custom, loading, carregar, criarCategoria({nome, icone, cor}), criarSubcategoria(parentId, {...}), getCategoria, getSubcategoria, getSubcategorias, isCategoriaRaiz }`.
- **Regras embutidas**: id = `slugifyCategoria(nome)` com sufixo anti-colisão; subcategoria exige `parentId` e herda cor do pai; persistência substitui a lista inteira.
- **Utilizado por**: `AppContent.js`, `ContasAPagar.js`, `ContasPagas.js`, `CategorySelectorField.js`, `SubcategorySelectorField.js`.

### `src/hooks/useCartaoManager.js` — `useCartaoManager()`
- **Responsabilidade**: CRUD de cartões (estado de formulário + listagem + ações).
- **Entradas**: nenhuma. **Sem `useEffect` automático** — o consumidor chama `carregarCartoes()`.
- **Saídas**: `{ form, setForm, cartoes, setCartoes, editId, setEditId, carregarCartoes, handleAddOrEdit, handleEditar, handleExcluir, getCartaoById, resetForm }`.
- **Endpoints**: `GET /get_cartoes?orgaId=`, `POST /add_cartao`, `PUT /update_cartao/:id`, `DELETE /delete_cartao/:id`, `GET /get_cartao_id/:id`.
- **Regras embutidas**: `banco_slug` e `tipo_cartao` obrigatórios; crédito exige `vencimento` (dia de pagamento) e `dia_util` (dia de fechamento); débito força `vencimento='1'`, `dia_util='1'`, `limite_credito=''`; edição infere banco via `inferirBancoDoNome` se faltar slug.
- **Utilizado por**: `ModalGerenciarCartao.js` (CRUD completo), `modal-insert.js` (`cartoes`, `carregarCartoes`, `getCartaoById`), `AppContent.js` (apenas `carregarCartoes()` no boot, importado como `useCartoes`).

### `src/hooks/useCartoesLookup.js` — `useCartoesLookup({ autoLoad = true })`
- **Responsabilidade**: Leitura de cartões para exibição (lookup por id e labels). Não escreve nada.
- **Entradas**: `{ autoLoad }` — `false` evita fetch na montagem.
- **Saídas**: `{ cartoes, mapa, loading, reloadCartoes, getLabelCartao(id), getCartaoById(id), getNomeCartao(cartaoOuId) }`.
- **Endpoints**: `GET /get_cartoes?orgaId=`.
- **Utilizado por**: `CartaoLabel.js`, `useRelatorioContas.js` (composição hook→hook).

### `src/hooks/useDashboardCartoes.js` — `useDashboardCartoes()`
- **Responsabilidade**: Resumos agregados por cartão para o dashboard.
- **Entradas**: nenhuma. Sem `useEffect` — tela chama `carregar()` (via `useFocusEffect`).
- **Saídas**: `{ resumos, loading, erro, carregar }`.
- **Endpoints**: `GET /dashboard/cartoes?orgaId=` (preferencial). **Fallback**: `Promise.all` de `GET /get_cartoes` + `GET /contas_pendentes?organization=&ano=&mes=` → monta no client com `montarDashboardCartoes` (tolerância a backend antigo).
- **Utilizado por**: `DashboardCartoes.js`.

### `src/hooks/useLimites.js` — *não é hook React* (módulo de funções de API)
- **Responsabilidade**: Domínio "limite de gasto mensal". Exporta `obterIdLimite(ano, mes, organization)`, `atualizarLimite(ano, mes, limite, id)`, `inserirLimite(ano, mes, limite, user, organization)`.
- **Endpoints**: `POST /limit_list` (retorna `id` ou `null`); `PUT /salvar_limite` (`tipo: 'update'`); `POST /salvar_limite` (`tipo: 'insert'`).
- **Regras embutidas**: padrão "consulta id → existe? atualiza : insere". Mês enviado **1-based** (a UI faz `parseInt(mes)+1`).
- **Utilizado por**: `ModalGerenciarLimite.js`.

### `src/hooks/useRelatorioContas.js` — `useRelatorioContas(endpoint, listaKey)`
- **Responsabilidade**: Hook genérico das telas de relatório: filtros ano/mês, carga do endpoint configurável, limite do mês, variáveis de layout da tabela e lookup de cartões.
- **Entradas**: `endpoint` (`'/contas_pendentes'` ou `'/contas_pagas'`), `listaKey` (`'contasPendentes'` ou `'contasPagas'`).
- **Saídas**: `{ ano, setAno, mes, setMes, anosOptions, contas, limiteMes, loading, posicaoTabelaY, setPosicaoTabelaY, alturaDisponivel, loadContas, getLabelCartao, cartoes }`.
- **Endpoints**: `GET <endpoint>?ano=&mes=&organization=` (+ `GET /get_cartoes` via `useCartoesLookup`).
- **Regras embutidas**: defaults = mês/ano atuais; aceita `total_limite` ou `limiteDoMes` na resposta; `alturaDisponivel = screenHeight - posicaoTabelaY - 130`.
- **Utilizado por**: `ContasAPagar.js`, `ContasPagas.js`.

---

## 5. Screens

### `src/screens/Login.js` (rota `Login`)
- **Objetivo**: Autenticação por e-mail/senha.
- **Componentes**: `AppIcon` (olho mostrar/ocultar senha) + RN core.
- **Hooks**: apenas `useState`/`useMemo`.
- **Fluxo de dados**: inputs controlados → `POST /auth/login` (`{ email, password }`, sem auth) → `saveSession({ token, userId, username, key_share, key_share_id })` → `navigation.replace('Home')`. Se a API não devolve `token`, grava placeholder `session-<userId>`. E-mail normalizado (`sanitizeEmail`). Botão secundário navega a `Register`.

### `src/screens/Register.js` (rota `Register`)
- **Objetivo**: Cadastro de usuário.
- **Componentes**: apenas RN core.
- **Fluxo de dados**: valida obrigatórios + senha ≥ 4 caracteres → `POST /auth/register { name, userName, email, password }` (`userName` cai para parte local do e-mail) → `navigation.replace('Login')`.

### `src/screens/AppContent.js` (rota `Home`, header oculto) — **tela principal**
- **Objetivo**: Painel do mês: cards de resumo (limite, total, pagas, pendentes), tabela de contas, criação/edição/exclusão, marcação de paga, Central de Controle.
- **Hooks**: `useContas(ano, mes, sharedOrgKey)`, `useCategorias()`, `useCartaoManager` (importado como `useCartoes`; só `carregarCartoes()` no boot).
- **Componentes**: `MenuHeader`, `AppIcon`, `CustomPicker` (ano/mês), `CategoriaLabel`, `Modal_Nova_Conta` (modal-insert), `ModalConfig`, `ModalGerenciarCartao`, `ModalGerenciarLimite`, `ModalContaAcoes`, `ModalShareOrganization`, `CustomCheckBox` (local).
- **Utils diretos**: `deleteDados`, `formatCurrency`, `mesesOptions`, `msgToast`, `obterMensagemErro`, `contaPertenceGrupoParcela`, `perguntarEscopoParcela`, `verificarAtualizacao`, AsyncStorage (`@userKeyShareId`).
- **Fluxo de dados**:
  1. Filtros `ano`/`mes` (default = hoje) → `useContas` recarrega via `POST /contas_lancadas`.
  2. Boot: `verificarAtualizacao()`, `carregarCartoes()`, lê `sharedOrgKey`.
  3. Checkbox da linha → `marcarComoPaga(item.id, novoValor)` (otimista + reload).
  4. Long-press na linha → `ModalContaAcoes` → Editar (abre `Modal_Nova_Conta` com `contaSelecionada`) ou Excluir (se grupo, pergunta escopo; `DELETE /delete_conta/:id?escopo=`).
  5. `Modal_Nova_Conta.onSuccess({mes, ano})` → só recarrega se o mês/ano da conta bate com o filtro atual (**eixo da Home = `data_lancamento`**).
  6. `ModalShareOrganization.onSave(key)` → atualiza `sharedOrgKey` → reload.
- **Estados locais**: `ano`, `mes`, visibilidade de 6 modais, `sharedOrgKey`, `contaSelecionada`, `posicaoTabelaY`/`alturaDisponivel` (layout da FlatList).

### `src/screens/ContasAPagar.js` (rota `ContasAPagar`)
- **Objetivo**: Relatório somente leitura das contas **pendentes** do mês/ano (eixo = vencimento).
- **Hooks**: `useRelatorioContas('/contas_pendentes', 'contasPendentes')`, `useCategorias()`.
- **Componentes**: `AppIcon`, `CustomPicker` (ano/mês), `CategoriaLabel`.
- **Fluxo de dados**: hook carrega via `GET /contas_pendentes?ano=&mes=&organization=`; tela calcula `totalPendente` client-side (reduce sobre `valor`); coluna Cartão usa `getLabelCartao(item.tipo_cartao)`; tabela com scroll horizontal (minWidth 600).

### `src/screens/ContasPagas.js` (rota `ContasPagas`)
- **Objetivo**: Relatório somente leitura das contas **pagas** do mês/ano. Estrutura idêntica à `ContasAPagar`, trocando endpoint (`/contas_pagas`), chave (`contasPagas`), total (`totalPago`) e cores (verde). **Não há ação para "despagar"** — isso só existe na Home.
- **Hooks/Componentes**: iguais a `ContasAPagar`.

### `src/screens/DashboardCartoes.js` (rota `DashboardCartoes`)
- **Objetivo**: Painel agregado por cartão (limite, utilizado, fatura atual, próximos vencimento/fechamento; débito: gastos do mês).
- **Hooks**: `useDashboardCartoes()`, `useFocusEffect` (recarrega a cada foco), `useState` (`modalConfigVisible`).
- **Componentes**: `MenuHeader`, `ModalConfig`, `CartaoDashboardCard` (um por resumo).
- **Fluxo de dados**: ao focar → `carregar()` → `GET /dashboard/cartoes?orgaId=` (com fallback client-side). Pull-to-refresh via `RefreshControl`. Estados: spinner, erro com "Tentar novamente", vazio.

### `src/screens/RelatorioCategorias.js` (rota `RelatorioCategorias`)
- **Objetivo**: Relatório de gastos agrupados por categoria e subcategoria no mês/ano selecionado (eixo = **vencimento**, alinhado aos demais relatórios financeiros).
- **Hooks**: `useCategorias()`.
- **Componentes**: `AppIcon`, `CustomPicker` (ano/mês), `CategoriaLabel`.
- **Fluxo de dados**: filtros `ano`/`mes` (0-based) → `Promise.all` de `GET /contas_pendentes` + `GET /contas_pagas` → unificação client-side por `id` (sem duplicatas) → agrupamento (`useMemo`) por `categoria`/`subcategoria` com totais, quantidades e percentuais. Cards: total no período, pago, pendente. Estados: loading, vazio.

---

## 6. Componentes

### Raiz (`src/components/`)

| Componente | Responsabilidade | Props | Usado em |
|---|---|---|---|
| `AppIcon.js` | Mapeia nomes semânticos → Ionicons (`APP_ICONS`); também exporta `ModalCloseButton` | `name`, `size=22`, `color='#555'`, `style`, `accessibilityLabel`; ModalCloseButton: `onPress`, `style`, `color`, `size` | Quase todos os componentes/telas |
| `CartaoLabel.js` | Exibe label "Nome - Tipo" do cartão (busca via `useCartoesLookup` se `cartoes` não for passado) | `cartaoId`, `cartao`, `cartoes`, `style`, `numberOfLines=1` | **Sem consumidores ativos** (candidato a remoção/adoção) |
| `MenuHeader.js` | Header azul com menu hamburger (Home, Dashboard Cartões, Relatório por Categoria, Contas Pagas, Contas a Pagar, Central de Controle, Sair) + avatar/nome do usuário | `onOpenConfig` | `AppContent.js`, `DashboardCartoes.js` |

- `MenuHeader` faz **logout**: `clearSession()` + `navigation.reset` para `Login`. Lê `@username` do AsyncStorage.

### `src/components/bancos/`

| Componente | Responsabilidade | Props | Usado em |
|---|---|---|---|
| `BancoBadge.js` | Badge circular com sigla/cor do banco (resolve via `resolverBancoParaCartao`) | `cartao`, `banco`, `size='sm'|'md'|'lg'`, `showNome=false`, `style` | `BancoSelectorGrid`, `ModalGerenciarCartao`, `CartaoDashboardCard`, `modal-insert` |
| `BancoSelectorGrid.js` | Grid de seleção do banco emissor (catálogo + "outro") | `value` (slug), `onChange(slug)` | `ModalGerenciarCartao` |

### `src/components/categorias/`

| Componente | Responsabilidade | Props | Usado em |
|---|---|---|---|
| `CategoriaLabel.js` | Ícone + nome da categoria (e subcategoria "›") a partir dos slugs da conta | `categoriaId`, `subcategoriaId`, `categorias`, `subcategorias`, `style`, `textStyle`, `showIcon=true` | `AppContent`, `ContasAPagar`, `ContasPagas`, `RelatorioCategorias` |
| `CategorySelectorField.js` | Campo de formulário que abre o picker de categoria; usa `useCategorias` internamente | `value`, `onChange(id)`, `label='Categoria:'` | `modal-insert` |
| `CategoryPickerModal.js` | Bottom-sheet com busca + grid 2 colunas + botão "Nova categoria" | `visible`, `onClose`, `categorias`, `value`, `onSelect(id)`, `onCriarCategoria` | `CategorySelectorField` |
| `NovaCategoriaModal.js` | Criação de categoria: nome (obrigatório, máx 40), ícone (`ICONES_CATEGORIA`), cor (`CORES_CATEGORIA`), preview | `visible`, `onClose(nova?)`, `onSalvar({nome, icone, cor})` | `CategoryPickerModal` |
| `SubcategorySelectorField.js` | Campo de subcategoria (opcional); retorna `null` se não houver `parentId`; usa `useCategorias` | `parentId`, `value`, `onChange(id)`, `label` | `modal-insert` |
| `SubcategoryPickerModal.js` | Bottom-sheet de subcategorias com busca, opção "Sem subcategoria" e "Nova subcategoria" | `visible`, `onClose`, `parentId`, `categoriaPai`, `subcategorias`, `value`, `onSelect(id)`, `onCriarSubcategoria` | `SubcategorySelectorField` |
| `NovaSubcategoriaModal.js` | Criação de subcategoria (nome obrigatório; cor herda do pai) | `visible`, `onClose(nova?)`, `parentId`, `categoriaPai`, `onSalvar(parentId, {...})` | `SubcategoryPickerModal` |

### `src/components/dashboard/`

| Componente | Responsabilidade | Props | Usado em |
|---|---|---|---|
| `CartaoDashboardCard.js` | Card de resumo de um cartão. Crédito: limite/utilizado/disponível, barra de utilização, fatura atual, próximos vencimento/fechamento. Débito: gastos no mês + lançamentos pagos. Modal interno "Ver detalhes" lista `contasFatura` (com parcela/recorrência n/m) | `resumo` (objeto montado por `dashboardCartao.js` ou pelo backend) | `DashboardCartoes` |
| `CartaoUtilizacaoBar.js` | Barra de progresso colorida por faixa (normal verde, atenção amarelo ≥50%, crítico vermelho ≥80%, sem_limite) | `percentual`, `faixa='sem_limite'` | `CartaoDashboardCard` |

### `src/components/modal/`

| Componente | Responsabilidade | Props | Usado em |
|---|---|---|---|
| `CustomPicker.js` | Picker genérico (botão + modal com FlatList de opções `{label, value}`) | `selectedValue`, `onValueChange(value)`, `options`, `placeholder`, `style` | `AppContent` (ano/mês), `ContasAPagar`, `ContasPagas`, `RelatorioCategorias`, `modal-insert` (cartão) |
| `ModalConfig.js` | "Central de Controle": botões Gerenciar limite / Criar novo cartão / Controle de Organização | `visible`, `onClose`, `abrirModalLimite`, `abrirModalGerenciar`, `abrirModalContrlOrga` (prop `loadContas` recebida mas **não usada**) | `AppContent`, `DashboardCartoes` |
| `ModalContaAcoes.js` | Modal de long-press na conta: mostra nome, label de parcela/recorrência + status, botões Editar/Excluir | `visible`, `onClose`, `contaSelecionada`, `onEditar`, `onExcluir` | `AppContent` |
| `ModalGerenciarCartao.js` | CRUD de cartões: banco (grid), apelido, tipo (chips crédito/débito), dias de vencimento/fechamento e limite (só crédito), lista com Editar/Excluir. Usa `useCartaoManager` | `visible`, `onClose` | `AppContent` |
| `ModalGerenciarLimite.js` | Definição do limite mensal: mês (Picker 0-based, enviado +1), ano (lista `anos` ou novo ano digitado), valor com máscara. Padrão: `obterIdLimite` → update ou insert; depois chama `loadContas()` | `visible`, `onClose`, `anos`, `loadContas` (prop `onSalvarLimite` recebida mas **não usada**) | `AppContent` |
| `ModalShareOrganization.js` | Conexão a organização compartilhada: `POST /user/organization/share { key }` → `saveSession({ key_share, key_share_id })` → `onSave(key_share_id)` | `visible`, `onClose`, `existingKey`, `onSave(keyShareId)` | `AppContent` |
| `modal-insert.js` (`Modal_Nova_Conta`) | **Modal de criação/edição de conta** — ver fluxo detalhado abaixo | `visible`, `onClose`, `onSuccess`, `ano`, `mes`, `contaSelecionada`, `setContaSelecionada` | `AppContent` |

#### Fluxo detalhado do `modal-insert.js`
1. Ao abrir (`visible`): se `contaSelecionada` existe → modo **edição** (preenche `form` com os dados, removendo sufixo de parcela do nome); sempre chama `carregarCartoes()`.
2. **Seleção de cartão** (`trataSelect`): ao escolher um cartão, sugere o vencimento automaticamente — débito: data de hoje; crédito: `obterVencimentoSugeridoPorCartao` (regra de fechamento/fatura); fallback: `GET /get_cartao_id/:id` (campo `vencimento_conta` do backend). O usuário pode editar manualmente (input `dd/mm/aaaa` + DateTimePicker).
3. **Campos**: cartão, nome ("Tipo de gasto"), categoria (`CategorySelectorField`), subcategoria opcional (`SubcategorySelectorField`), vencimento, valor (máscara `formatarMoeda` → display + backend).
4. **Categoria legado `fixa`** ativa `recorrente` automaticamente (`isCategoriaFixa`).
5. **Parcelado** (chips 2/3/6/12/18/24x ou custom 1–36) e **Recorrente** (chips 3/6/12/24 meses ou custom 1–36) são mutuamente exclusivos (marcar um desliga o outro) e só aparecem em criação com cartão de crédito.
6. Em edição de conta de grupo, exibe apenas o texto informativo "Parcela n/m" ou "Recorrência n/m" (a alteração de escopo é perguntada pelo `useNovaConta` ao salvar).
7. **Salvar** → `salvarConta()` (`useNovaConta`) → sucesso → reseta formulário, limpa `contaSelecionada` e fecha.

---

## 7. Services

O projeto não possui pasta `services/`; a camada de serviço fica em `src/utils/` e `src/config/`.

### `src/utils/services.js` — Cliente HTTP central
- **Responsabilidade**: única porta de saída para a API REST.
- **Métodos expostos**: `getDados(path, options)`, `postDados(path, dados, options)`, `putDados(path, dados, options)`, `deleteDados(path, options)`, `setUnauthorizedHandler(fn)`, `getApiUrl()`, `normalizeApiResponse(data)`.
- **Dependências**: `expo-constants` (lê `extra.EXPO_PUBLIC_API_URL`), `config/api.js` (fallback), `authSession.js` (`getAuthToken`).
- **Integrações externas**: API REST `api-contas` (dev: `http://192.168.15.100:3100`; prod: `https://api-contas.srv-jvt.com`).
- **Detalhes**: timeout 15s, header `X-Client: mobile`, `Authorization: Bearer` (exceto `auth: false`), normaliza `sucess`→`success` e `mensagem`→`message`, 401 → handler global (logout forçado), erros carregam `status`/`path`/`method`/`apiMessage`.

### `src/utils/authSession.js` — Serviço de sessão
- **Métodos expostos**: `STORAGE_KEYS`, `saveSession`, `clearSession`, `getAuthToken`, `hasValidSession`.
- **Integrações**: AsyncStorage. Sessão válida = `@userId` + `@userKeyShareId`.

### `src/hooks/useLimites.js` — Serviço de limites (apesar do nome/pasta)
- **Métodos expostos**: `obterIdLimite`, `atualizarLimite`, `inserirLimite`.
- **Integrações**: `POST /limit_list`, `POST|PUT /salvar_limite`.

### `src/utils/check_version.js` — Serviço de atualização
- **Métodos expostos**: `verificarAtualizacao()`.
- **Integrações externas**: Google Play Store (via `react-native-version-check`).

### Endpoints consumidos (mapa completo da API)

| Método | Rota | Origem no app | Payload/Query |
|---|---|---|---|
| POST | `/auth/login` | `Login.js` | `{ email, password }` (sem auth) |
| POST | `/auth/register` | `Register.js` | `{ name, userName, email, password }` (sem auth) |
| POST | `/user/organization/share` | `ModalShareOrganization` | `{ key }` |
| POST | `/contas_lancadas` | `useContas` | `{ ano, mes, organization }` |
| POST | `/marcar-paga` | `useContas` | `{ mes, index: idConta, paga }` |
| POST | `/form_conta` | `useNovaConta` | payload completo da conta |
| POST | `/form_conta/editar` | `useNovaConta` | payload + `escopo` |
| DELETE | `/delete_conta/:id?escopo=` | `AppContent` | `escopo ∈ {apenas_esta, esta_e_futuras, todas}` |
| GET | `/contas_pendentes?ano=&mes=&organization=` | `useRelatorioContas`, `useDashboardCartoes` (fallback), `RelatorioCategorias` | — |
| GET | `/contas_pagas?ano=&mes=&organization=` | `useRelatorioContas`, `RelatorioCategorias` | — |
| GET | `/get_cartoes?orgaId=` | `useCartaoManager`, `useCartoesLookup`, `useDashboardCartoes` | — |
| GET | `/get_cartao_id/:id` | `useCartaoManager`, `modal-insert` | retorna também `vencimento_conta` |
| POST | `/add_cartao` | `useCartaoManager` | payload do cartão |
| PUT | `/update_cartao/:id` | `useCartaoManager` | payload do cartão |
| DELETE | `/delete_cartao/:id` | `useCartaoManager` | — |
| GET | `/dashboard/cartoes?orgaId=` | `useDashboardCartoes` | endpoint preferencial (com fallback) |
| POST | `/limit_list` | `useLimites` | `{ ano, mes, organization }` → `{ success, id }` |
| POST | `/salvar_limite` | `useLimites` | `{ ano, mes, limite, user, organization, tipo: 'insert' }` |
| PUT | `/salvar_limite` | `useLimites` | `{ ano, mes, limite, id, tipo: 'update' }` |

---

## 8. Banco de Dados

O app **não possui banco local** — o backend REST é o banco de dados. A estrutura abaixo é **inferida dos payloads/respostas** consumidos pelo app (entidades do backend) + o storage local.

### Configuração PostgreSQL (`postgres-config.js`)

Arquivo: `api-contas-a-pagar/src/database/postgres-config.js`

| Export | Responsabilidade |
|--------|------------------|
| `loadDotEnv()` | Lê `api-contas-a-pagar/.env` (KEY=VALUE) sem sobrescrever env do shell |
| `getPostgresConfig(overrides?)` | Resolve host/port/user/database/password via `PG*` ou `POSTGRES_*`; **senha obrigatória**, sem fallback hardcoded |
| `isProductionEnvironment()` | Guard para scripts destrutivos (ex.: `seed-minimo.js`) |

Consumidores: `conexao.js` (pool da API), `estrutura.js` (CREATE DATABASE), `scripts/postgres-env.js` (backup e seed).

### Backup e restore (backend `api-contas-a-pagar`)

- **Banco**: PostgreSQL `contas_a_pagar` (conexão via `postgres-config.js` + `conexao.js`; credenciais em variáveis `PG*` / `POSTGRES_*` e `.env` local).
- **Backup manual**: `cd api-contas-a-pagar && npm run backup` → `pg_dump -Fc` → `backups/organizecontas_YYYY-MM-DD_HH-mm-ss.dump`.
- **Restore**: manual via `pg_restore` — ver `docs/BACKUP_AND_RESTORE.md` §8.
- **Git**: pasta `api-contas-a-pagar/backups/` ignorada; `.env` (raiz e backend) ignorados.

### Entidades do backend (inferidas)

#### `users`
- **Finalidade**: usuários do sistema.
- **Campos principais**: `id` (referenciado como `userId`/`conta_user`), `name`, `userName`/`username`, `email`, `password`.
- **Relacionamentos**: pertence a uma organização (`key_share`/`key_share_id`); dono de cartões e contas (`conta_user`).

#### `organizations`
- **Finalidade**: agrupamento compartilhável de dados (multiusuário).
- **Campos principais**: `key_share` (chave legível para compartilhar), `key_share_id` (id usado como `organization`/`orgaId` em todas as queries).
- **Relacionamentos**: 1:N com users, cartões, contas e limites.

#### `cartoes`
- **Finalidade**: cartões de crédito/débito da organização.
- **Campos principais**: `id`, `nome` (apelido opcional), `banco_slug`, `tipo_cartao` (`'credito'`/`'debito'`), `vencimento` (dia de pagamento da fatura), `dia_util` (dia de fechamento), `limite_credito`, `conta_user`, `organization`.
- **Regras**: débito guarda `vencimento='1'`, `dia_util='1'`, sem limite.
- **Relacionamentos**: N:1 organização; 1:N contas (conta referencia o cartão por `tipo_cartao`/`tipo_cartao_id`).

#### `contas` (lançamentos)
- **Finalidade**: despesas lançadas.
- **Campos principais**: `id`, `nome`, `tipo_cartao`/`tipo_cartao_id` (id do cartão; legado pode conter a string `'credito'`/`'debito'`), `categoria` (slug), `subcategoria` (slug|null), `vencimento` (`dd/MM/yyyy`), `data_lancamento` (`dd/MM/yyyy`), `valor` (string `"NNNN.NN"`), `paga` (boolean), `ano`/`mes` (competência, mês 0-based), `conta_user`, `organization`, `parcelado`, `total_parcelas`, `parcela_atual`, `grupo_parcelamento`, `recorrente`, `total_recorrencias`, `recorrencia_atual`, `grupo_recorrencia`.
- **Relacionamentos**: N:1 cartão, N:1 organização; agrupamento lógico por `grupo_parcelamento`/`grupo_recorrencia`.
- **Regras importantes**: a expansão das parcelas/recorrências (criar N registros) é feita **pelo backend**; o app envia apenas os metadados (`parcelado`, `total_parcelas`, etc.).

#### `limites`
- **Finalidade**: limite de gasto por mês/ano/organização.
- **Campos principais**: `id`, `ano`, `mes` (**1-based** neste domínio), `limite`, `user`, `organization`.
- **Regras**: endpoint `/salvar_limite` é polimórfico via `tipo: 'insert' | 'update'` (POST/PUT).

### Storage local (AsyncStorage)

| Chave | Conteúdo | Gravado por |
|---|---|---|
| `@authToken` | Token (ou placeholder `session-<userId>`) | `saveSession` (Login) |
| `@userId` | Id do usuário | `saveSession` |
| `@username` | Nome de exibição | `saveSession` |
| `@userKeyShare` | Chave legível da organização | `saveSession` |
| `@userKeyShareId` | **Id da organização** (usado em todas as chamadas) | `saveSession` |
| `@categorias_custom_<orgId>` | JSON com categorias/subcategorias custom (`{id, nome, icone, cor, parent_id?, custom: true}`) | `useCategorias` |

> Categorias **padrão** vivem em código (`utils/categorias.js`); o backend recebe apenas o slug nas contas.

---

## 9. Fluxos Críticos

### Criação de Conta
1. **Tela origem**: `AppContent.js` (Home) → botão "+ Nova conta" (limpa `contaSelecionada`) → abre `Modal_Nova_Conta` (`modal-insert.js`).
2. Modal carrega cartões (`useCartaoManager.carregarCartoes` → `GET /get_cartoes`).
3. Usuário escolhe cartão → vencimento sugerido automaticamente (`utils/competenciaCartao` ou `GET /get_cartao_id/:id`).
4. **Hook acionado**: `useNovaConta.salvarConta()` — valida obrigatórios; débito → vencimento = hoje, `paga: true`, sem parcela/recorrência; calcula competência via `extrairMesAnoCompetencia(vencimento)`.
5. **Service/Banco**: `POST /form_conta` → backend cria a(s) conta(s) (expande parcelas/recorrências) → tabela `contas`.
6. **Atualização de estado**: `onSuccess({mes, ano})` → `AppContent` compara com o filtro atual e chama `loadContas()` somente se a conta pertence ao mês/ano exibido (eixo `data_lancamento`). Modal reseta o form e fecha.

### Edição de Conta
1. **Tela origem**: `AppContent.js` → long-press na linha → `ModalContaAcoes` → "Editar" → `Modal_Nova_Conta` com `contaSelecionada` (modo edição; nome sem sufixo ` n/m`).
2. **Hook acionado**: `useNovaConta.salvarConta()` com `editarConta=true`. Se a conta pertence a grupo (`contaPertenceGrupoParcela`), `perguntarEscopoParcela` pergunta: `apenas_esta` / `esta_e_futuras` / `todas` (cancelar aborta).
3. **Service/Banco**: `POST /form_conta/editar` (payload + `escopo`) → backend atualiza 1..N registros em `contas`.
4. **Atualização de estado**: `onSuccess()` → `loadContas()` na Home; modal fecha e reseta.

### Exclusão de Conta
1. **Tela origem**: `AppContent.js` → long-press → `ModalContaAcoes` → "Excluir".
2. Se conta de grupo → `perguntarEscopoParcela`; senão `Alert` de confirmação simples.
3. **Service/Banco**: `DELETE /delete_conta/:id?escopo=<escopo>` → remove 1..N registros em `contas`.
4. **Atualização de estado**: toast de sucesso → `loadContas()`.

### Pagamento de Conta
1. **Tela origem**: `AppContent.js` → checkbox "Paga" na linha (`CustomCheckBox`).
2. **Hook acionado**: `useContas.marcarComoPaga(item.id, novoValor)`.
3. **Service/Banco**: `POST /marcar-paga { mes, index: id, paga }` → atualiza flag `paga` em `contas`.
4. **Atualização de estado**: update **otimista** no array local (`setContas`) + `loadContas()` para revalidar totais/cards.
5. Observação: desmarcar (voltar a pendente) só é possível na Home; `ContasPagas` é somente leitura. Contas de débito nascem pagas.

### Cálculo de Resumos
- **Home**: totais (`total_limite`, `total_contas`, `total_contas_pagas`, `total_contas_pendentes`) vêm **do backend** na resposta de `POST /contas_lancadas` e alimentam os 4 cards.
- **Relatórios**: `totalPendente`/`totalPago` são calculados **no client** (`reduce` sobre as contas retornadas); `limiteMes` vem da API (`total_limite` ou `limiteDoMes`).
- **Dashboard de cartões**:
  1. `DashboardCartoes` ganha foco → `useDashboardCartoes.carregar()`.
  2. Preferencial: `GET /dashboard/cartoes?orgaId=` (backend agrega).
  3. Fallback: `GET /get_cartoes` + `GET /contas_pendentes` → `montarDashboardCartoes` (`utils/dashboardCartao.js`): crédito = soma de pendentes do cartão (utilizado/disponível/percentual/fatura por vencimento da próxima fatura); débito = soma de contas **pagas** do mês corrente.
  4. Estado: `resumos` → renderização de `CartaoDashboardCard`.

---

## 10. Regras de Negócio

### Sessão / autenticação
1. Sessão válida = `@userId` + `@userKeyShareId` no AsyncStorage (não depende de JWT).
2. Se o login não retorna `token`, o app grava o placeholder `session-<userId>`.
3. Qualquer resposta HTTP 401 limpa a sessão e reseta a navegação para `Login`.
4. E-mails são sempre normalizados (`trim().toLowerCase()`).
5. Senha de cadastro: mínimo 4 caracteres (validação do front).
6. `userName` no cadastro cai para a parte local do e-mail se `name` vazio.

### Filtros e eixos de dados
7. Mês é **0-based em string** (`'0'`–`'11'`) em filtros, contas e competência. Exceção: domínio de **limites** envia mês **1-based**.
8. A Home lista por **`data_lancamento`**; os relatórios (`/contas_pendentes`, `/contas_pagas`) listam por **vencimento**.
9. Após criar conta, a Home só recarrega se o mês/ano de lançamento da conta coincidem com o filtro exibido.

### Contas
10. Campos obrigatórios: cartão, nome, categoria, vencimento, valor. Subcategoria é opcional.
11. Vencimento aceito em `dd/MM/yyyy`, ISO ou apenas dia (normalizado para `dd/MM/yyyy`).
12. `data_lancamento` é sempre a data de hoje na criação.
13. A competência (`mes`/`ano` do payload) deriva do **vencimento**, não do lançamento.
14. Cartão de **débito** (criação): não permite parcelamento nem recorrência; vencimento forçado para hoje; conta criada **já paga** (`paga: true`).
15. Parcelado e recorrente são **mutuamente exclusivos**. Opções de parcela: 2/3/6/12/18/24 (ou custom 1–36); recorrência: 3/6/12/24 meses (ou custom 1–36).
16. O sufixo ` n/m` do nome é removido antes de salvar/editar (`extrairNomeBaseParcela`).
17. Categoria legado `fixa` ativa recorrência automaticamente.
18. A expansão de parcelas/recorrências em N registros é responsabilidade do **backend**.

### Grupos (parcelamento/recorrência)
19. Conta pertence a grupo quando `grupo_parcelamento` com `total_parcelas > 1` OU `grupo_recorrencia` com `total_recorrencias > 1`.
20. Edição/exclusão de conta de grupo exige escolha de escopo: `apenas_esta`, `esta_e_futuras` ou `todas` (cancelar aborta a operação).

### Pagamento
21. Marcar/desmarcar paga só existe na Home; `ContasPagas`/`ContasAPagar` são somente leitura (conta paga não volta a pendente por essas telas).
22. Marcação é otimista no client e revalidada com `loadContas()`.

### Cartões
23. Tipos: `credito` e `debito`. Banco emissor (`banco_slug`) é obrigatório.
24. Crédito exige `vencimento` (dia de pagamento) e `dia_util` (dia de fechamento); débito força `vencimento='1'`, `dia_util='1'` e limpa `limite_credito`.
25. Competência da fatura: compra **até** o dia de fechamento entra na fatura corrente; se `dia_vencimento > dia_fechamento` a fatura é paga no mesmo mês do fechamento, senão no mês seguinte. Dias são ajustados para meses curtos.
26. Cartões legados sem `banco_slug` têm o banco inferido pelo nome (`inferirBancoDoNome`).

### Categorias
27. Categorias custom são locais (AsyncStorage), **por organização**; backend recebe apenas o slug.
28. Id = slug do nome; colisão gera sufixo curto. Subcategoria exige categoria pai e herda a cor dela.

### Limites
29. Limite mensal: padrão "consultar id (`/limit_list`) → existe? atualizar : inserir" no endpoint polimórfico `/salvar_limite` (`tipo: 'insert' | 'update'`).

### Organização
30. Todas as chamadas de domínio carregam `organization` (= `@userKeyShareId`); conectar-se a outra organização (`ModalShareOrganization`) atualiza a sessão e recarrega a Home.

### Outros
31. Verificação de atualização da loja só roda em build de produção (`__DEV__` ignora).
32. Dashboard tolera backend antigo: se `/dashboard/cartoes` não responde corretamente, agrega no client.
33. O cliente HTTP tolera os typos `sucess` e `mensagem` nas respostas da API.

---

## 11. Dependências Entre Módulos

Encadeamentos principais (Tela → Hook → Service → Banco/API):

```
AppContent (Home)
 ├─ useContas ──────────────── services.postDados ── POST /contas_lancadas, POST /marcar-paga
 ├─ useCategorias ──────────── AsyncStorage (@categorias_custom_<orgId>)
 ├─ useCartaoManager ───────── services.getDados ─── GET /get_cartoes
 ├─ (exclusão direta) ──────── services.deleteDados ─ DELETE /delete_conta/:id
 └─ Modal_Nova_Conta (modal-insert)
      ├─ useCartaoManager ──── GET /get_cartoes, GET /get_cartao_id/:id
      └─ useNovaConta ──────── POST /form_conta, POST /form_conta/editar
           └─ utils/competenciaCartao, utils/parcelamento, utils/tipoCartao

ContasAPagar / ContasPagas
 └─ useRelatorioContas ─────── services.getDados ─── GET /contas_pendentes | /contas_pagas
      └─ useCartoesLookup ──── GET /get_cartoes

RelatorioCategorias
 └─ getDados ───────────────── GET /contas_pendentes + GET /contas_pagas → unificação por id → agrupamento por categoria/subcategoria
      └─ useCategorias ─────── AsyncStorage (@categorias_custom_<orgId>)

DashboardCartoes
 └─ useDashboardCartoes ────── GET /dashboard/cartoes
      └─ (fallback) GET /get_cartoes + GET /contas_pendentes → utils/dashboardCartao

ModalGerenciarLimite ───────── useLimites ─────────── POST /limit_list, POST|PUT /salvar_limite
ModalGerenciarCartao ───────── useCartaoManager ───── POST /add_cartao, PUT /update_cartao, DELETE /delete_cartao
ModalShareOrganization ─────── services.postDados ─── POST /user/organization/share → saveSession
Login / Register ───────────── services.postDados ─── POST /auth/login | /auth/register → authSession
App.js ─────────────────────── services.setUnauthorizedHandler + authSession (401 → Login)
```

Dependências transversais (consumidas por quase tudo):
- `utils/services.js` → **todas** as chamadas HTTP.
- `utils/authSession.js` → identificação de usuário/organização.
- `utils/util.js` → formatação/validação/toast/`mesesOptions`.
- `AppIcon.js` → ícones em toda a UI.

---

## 12. Pontos Sensíveis

1. **`utils/services.js`** — qualquer mudança afeta todas as requisições, o tratamento de 401 (logout forçado) e o formato de erro consumido por `obterMensagemErro`/`formatarErroApi`.
2. **Chaves do AsyncStorage duplicadas como string literal** — `useContas.js`, `useRelatorioContas.js`, `useCartaoManager.js`, `AppContent.js` e `ModalGerenciarLimite.js` usam `'@userKeyShareId'`/`'@userId'` diretamente em vez de `STORAGE_KEYS`. Alterar os valores em `authSession.js` sem atualizar esses pontos quebra silenciosamente.
3. **Convenção de mês (0-based vs 1-based)** — contas/filtros usam 0–11; o domínio de limites envia 1–12 (`ModalGerenciarLimite` faz `parseInt(mes)+1`). Misturar as convenções corrompe os filtros.
4. **Eixos diferentes Home × relatórios** — Home = `data_lancamento`; relatórios = vencimento. A lógica do `onSuccess` em `AppContent` depende disso para decidir o reload.
5. **`modal-insert.js` (possível bug de TDZ)** — `cartaoSelecionado` é usado nas linhas 35–43 (argumento de `useNovaConta` e `isCartaoDebito`) **antes** da declaração `const cartaoSelecionado = ...` na linha 46. Dependendo da transpilação, `ehDebito` pode avaliar sempre com `undefined`. Verificar antes de mexer na lógica de débito deste modal.
6. **`useNovaConta`** — concentra a maior parte das regras de negócio de contas (débito, competência, escopo de grupo, exclusividade parcelado/recorrente). Alterações exigem teste de todos os cenários: criação simples, débito, parcelado, recorrente, edição simples, edição em grupo (3 escopos).
7. **`useRelatorioContas` compartilhado** — usado por duas telas (`ContasAPagar`, `ContasPagas`); mudanças afetam ambas. Seu `useEffect` não depende de `endpoint`/`listaKey` (não trocar em runtime).
8. **Hooks sem auto-load** — `useCartaoManager` e `useDashboardCartoes` exigem chamada manual (`carregarCartoes()`/`carregar()`); esquecer isso gera listas vazias sem erro.
9. **Recarregamento de listas** — a Home depende de callbacks (`onSuccess`, `onSave`, exclusão) chamarem `loadContas()`; o Dashboard depende de `useFocusEffect`. Não há sincronização automática entre telas.
10. **Fallback do dashboard** — `useDashboardCartoes` + `utils/dashboardCartao.js` duplicam no client a agregação do backend. Mudanças nas regras de fatura devem ser refletidas nos dois lados.
11. **Categorias custom locais** — vivem apenas no dispositivo (AsyncStorage por organização). Reinstalar o app perde categorias custom; contas que as referenciam exibem placeholder "desconhecida".
12. **Código morto/props mortas conhecidos**: `CartaoLabel.js` (sem consumidores), prop `loadContas` em `ModalConfig`, prop `onSalvarLimite` e função `formatarLimite` em `ModalGerenciarLimite`, import `isCartaoDebito` não usado em `ModalGerenciarCartao`, `montarDataVencimentoConta` deprecado em `util.js`.

---

## 13. Guia para Alterações Futuras

**Princípios**: priorizar reutilização; evitar duplicação; alterar o menor número possível de arquivos; não criar estrutura nova sem necessidade real.

### Quando alterar um Hook
- Quando a mudança envolve **dados/estado/chamadas de API** de um domínio (contas, cartões, categorias, limites, dashboard).
- Verifique todos os consumidores listados na seção 4 antes — hooks compartilhados (`useRelatorioContas`, `useCategorias`, `useCartaoManager`) afetam múltiplas telas/modais.
- Novas chamadas de API devem usar `getDados/postDados/putDados/deleteDados` de `utils/services.js` — nunca `fetch` direto.

### Quando alterar uma Screen
- Quando a mudança é de **layout, composição ou fluxo de navegação** daquela tela.
- Lógica de dados nova deve ir para o hook do domínio, não para a tela.
- `ContasAPagar` e `ContasPagas` são gêmeas: avalie se a mudança pertence ao `useRelatorioContas` (afeta as duas) ou à tela específica.

### Quando alterar um Service
- `utils/services.js`: apenas para mudanças transversais de HTTP (headers, timeout, tratamento de erro). Teste login, 401 e uma chamada de cada método.
- `utils/authSession.js`: apenas para mudanças no modelo de sessão. Lembrar dos pontos com string literal (seção 12, item 2).
- `config/environments.js`: apenas para URLs/ambientes.

### Quando criar novo componente
- Quando o mesmo bloco visual for usado em **2+ lugares**, ou quando um modal de domínio novo for necessário.
- Siga o padrão existente: componente apresentacional recebe props; modais de domínio podem usar hooks. Subpastas por domínio (`bancos/`, `categorias/`, `dashboard/`, `modal/`).
- Use `AppIcon`/`ModalCloseButton` para ícones; `CustomPicker` para seleções simples.

### Quando NÃO criar novos arquivos
- Função utilitária pequena para um domínio já coberto → adicionar ao util existente (`util.js`, `cartao.js`, `categorias.js`, etc.).
- Variação de tela de relatório → parametrizar `useRelatorioContas`, não duplicar hook.
- Novo endpoint de um domínio existente → adicionar ao hook do domínio.
- Componente usado em um único lugar e fortemente acoplado à tela → manter local (como `CustomCheckBox` em `AppContent`).
- Não criar camadas novas (context, store, pasta `services/`) sem necessidade real comprovada.

---

## 14. Histórico de Estrutura

| Data | Alteração Estrutural | Arquivos Impactados |
| ---- | -------------------- | ------------------- |
| 2026-06-20 | Auditoria segurança PG + doc §8 | `postgres-config.js`, `BACKUP_AND_RESTORE.md`, `DEPLOY_VPS.md`, `.gitignore` |
| 2026-06-20 | PostgreSQL via env (postgres-config.js) | `src/database/postgres-config.js`, `conexao.js`, `estrutura.js` |
| 2026-06-15 | Backup/restore PostgreSQL + doc | `api-contas-a-pagar/scripts/backup-database.js`, `postgres-env.js`, `docs/BACKUP_AND_RESTORE.md` |
| 2026-06-15 | Nova tela Relatório por Categoria | `src/screens/RelatorioCategorias.js`, `App.js`, `MenuHeader.js` |
