/**
 * Camada JS sobre rascunhos nativos de lançamentos detectados.
 * Parser local; não envia texto ao backend.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getNativeDrafts,
  updateDraftStatus as updateNativeStatus,
  deleteDraft as deleteNativeDraft,
  clearDrafts as clearNativeDrafts,
  isCaptureEnabled,
  setCaptureEnabled,
  isNotificationAccessEnabled,
  openNotificationAccessSettings,
  syncFilterConfig,
  isNotificationCaptureSupported,
  getLastNativeError,
} from '../../modules/notification-capture';
import { getDados } from './services';
import { parseMensagemBancaria } from './parserMensagemBancaria';
import { avaliarNotificacaoBancaria } from './filtrosNotificacaoBancaria';
import {
  listarAliasesBancarios,
  listarBancosMonitoradosPorCartoes,
  montarPacotesPermitidosPorCartoes,
  resolverAppBancario,
} from './appsBancariosNotificacao';

const KEY_MODO_APRENDIZADO = '@notif_capture_modo_aprendizado';
const KEY_CAPTURA_PREF = '@notif_capture_enabled_pref';

function parseDraftsRaw(raw) {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function metadadosDoRascunho(draft) {
  return {
    pacote: draft?.pacote || draft?.pacoteOrigem || null,
    pacoteOrigem: draft?.pacoteOrigem || draft?.pacote || null,
    appName: draft?.appName || draft?.appOrigem || null,
    bancoInferido: draft?.bancoInferido || null,
    recebidoEm: draft?.recebidoEm || null,
    postTime: draft?.postTime || null,
    postTimeMillis: draft?.postTimeMillis || null,
    timestamp: draft?.timestamp || null,
    dedupeKey: draft?.dedupeKey || null,
    origem: draft?.origem || null,
  };
}

function enriquecerRascunho(draft) {
  const texto =
    draft?.textoSanitizado ||
    draft?.mensagemOriginal ||
    [draft?.titulo, draft?.texto, draft?.bigText].filter(Boolean).join('\n');

  const filtro = avaliarNotificacaoBancaria({
    titulo: draft?.titulo,
    textoSanitizado: texto,
  });

  const appInfo = resolverAppBancario({
    pacoteOrigem: draft?.pacoteOrigem || draft?.pacote,
    appOrigem: draft?.appOrigem || draft?.appName,
    titulo: draft?.titulo,
    texto,
  });

  let preLancamento = draft?.preLancamento || null;
  if (
    preLancamento &&
    typeof preLancamento === 'object' &&
    Object.keys(preLancamento).length === 0
  ) {
    preLancamento = null;
  }

  if (!preLancamento && filtro.aceitar && texto) {
    preLancamento = parseMensagemBancaria(texto, metadadosDoRascunho(draft));
    if (preLancamento) {
      preLancamento = {
        ...preLancamento,
        origem: 'notification_listener',
      };
      if (!preLancamento.banco?.slug && appInfo?.slug) {
        preLancamento = {
          ...preLancamento,
          banco: {
            nome: appInfo.nome,
            slug: appInfo.slug,
            confianca: 0.8,
          },
        };
      }
    }
  }

  return {
    ...draft,
    textoSanitizado: texto,
    appCatalogo: appInfo?.nome || draft?.bancoInferido || draft?.appName || null,
    bancoSlug: appInfo?.slug || preLancamento?.banco?.slug || null,
    filtroOk: filtro.aceitar,
    filtroMotivo: filtro.motivo || null,
    preLancamento,
    valorDisplay: preLancamento?.sugestoes?.valorDisplay || null,
    descricao:
      preLancamento?.transacao?.descricao ||
      draft?.titulo ||
      texto?.slice(0, 80) ||
      null,
  };
}

export async function carregarCartoesParaCaptura() {
  try {
    const keyShareId = await AsyncStorage.getItem('@userKeyShareId');
    if (!keyShareId) {
      return [];
    }
    const res = await getDados(`/get_cartoes?orgaId=${keyShareId}`);
    if (res?.success && Array.isArray(res.data)) {
      return res.data;
    }
    if (Array.isArray(res?.data)) {
      return res.data;
    }
    if (Array.isArray(res?.result)) {
      return res.result;
    }
    return [];
  } catch (error) {
    console.warn('[lancamentosDetectados] falha ao carregar cartões:', error?.message || error);
    return [];
  }
}

export async function obterModoAprendizado() {
  try {
    const v = await AsyncStorage.getItem(KEY_MODO_APRENDIZADO);
    if (v == null) {
      // Modo restrito por padrão: não polui rascunhos de lançamento.
      return false;
    }
    return v === '1' || v === 'true';
  } catch {
    return false;
  }
}

export async function definirModoAprendizado(enabled) {
  await AsyncStorage.setItem(KEY_MODO_APRENDIZADO, enabled ? '1' : '0');
  await sincronizarConfigNativa();
}

/**
 * Sincroniza allowlist nativa com cartões cadastrados.
 * Modo aprendizado permanece no toggle, mas não libera pacotes fora da allowlist.
 */
export async function sincronizarConfigNativa(cartoesOpcionais = null) {
  const modoAprendizado = await obterModoAprendizado();
  const cartoes = Array.isArray(cartoesOpcionais)
    ? cartoesOpcionais
    : await carregarCartoesParaCaptura();
  const pacotesPermitidos = montarPacotesPermitidosPorCartoes(cartoes);
  const bancosMonitorados = listarBancosMonitoradosPorCartoes(cartoes);

  await syncFilterConfig({
    modoAprendizado,
    pacotesPermitidos,
    aliasesBancarios: listarAliasesBancarios(),
  });

  return {
    cartoes,
    pacotesPermitidos,
    bancosMonitorados,
  };
}

export async function setAllowedPackages(packages = []) {
  const modoAprendizado = await obterModoAprendizado();
  return syncFilterConfig({
    modoAprendizado,
    pacotesPermitidos: Array.isArray(packages) ? packages : [],
    aliasesBancarios: listarAliasesBancarios(),
  });
}

export async function ativarCapturaExperimental() {
  await sincronizarConfigNativa();
  await AsyncStorage.setItem(KEY_CAPTURA_PREF, '1');
  await setCaptureEnabled(true);
  return isCaptureEnabled();
}

export async function desativarCapturaExperimental() {
  await AsyncStorage.setItem(KEY_CAPTURA_PREF, '0');
  await setCaptureEnabled(false);
  return !isCaptureEnabled();
}

export function obterStatusPermissao() {
  const suporteNativo = isNotificationCaptureSupported();
  return {
    suporteNativo,
    permissaoConcedida: suporteNativo ? isNotificationAccessEnabled() : false,
    capturaAtiva: suporteNativo ? isCaptureEnabled() : false,
    ultimoErroNativo: suporteNativo ? getLastNativeError() : null,
  };
}

export async function listarRascunhosDetectados({ apenasPendentes = true } = {}) {
  const sync = await sincronizarConfigNativa();
  const drafts = parseDraftsRaw(getNativeDrafts()).map(enriquecerRascunho);

  let lista = drafts;
  if (apenasPendentes) {
    lista = drafts.filter((d) => d.status === 'pendente' && d.filtroOk !== false);
  }

  const ordenados = lista.sort((a, b) => {
    const ta = Date.parse(a.recebidoEm || a.criadoEm || 0) || 0;
    const tb = Date.parse(b.recebidoEm || b.criadoEm || 0) || 0;
    return tb - ta;
  });

  return {
    rascunhos: ordenados,
    pacotesPermitidos: sync.pacotesPermitidos,
    bancosMonitorados: sync.bancosMonitorados,
  };
}

export async function marcarRascunhoImportado(id) {
  return updateNativeStatus(id, 'importado');
}

export async function marcarRascunhoIgnorado(id) {
  return updateNativeStatus(id, 'ignorado');
}

export async function excluirRascunho(id) {
  return deleteNativeDraft(id);
}

export async function limparTodosRascunhos() {
  return clearNativeDrafts();
}

export async function abrirConfiguracaoAcessoNotificacoes() {
  return openNotificationAccessSettings();
}

export {
  isCaptureEnabled,
  isNotificationAccessEnabled,
  openNotificationAccessSettings,
  isNotificationCaptureSupported,
  montarPacotesPermitidosPorCartoes,
  listarBancosMonitoradosPorCartoes,
};

export default {
  listarRascunhosDetectados,
  ativarCapturaExperimental,
  desativarCapturaExperimental,
  obterStatusPermissao,
  marcarRascunhoImportado,
  marcarRascunhoIgnorado,
  excluirRascunho,
  limparTodosRascunhos,
};
