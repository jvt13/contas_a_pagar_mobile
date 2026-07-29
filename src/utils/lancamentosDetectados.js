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
} from '../../modules/notification-capture';
import { parseMensagemBancaria } from './parserMensagemBancaria';
import { avaliarNotificacaoBancaria } from './filtrosNotificacaoBancaria';
import {
  listarAliasesBancarios,
  listarPacotesConhecidos,
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

function enriquecerRascunho(draft) {
  const texto =
    draft?.textoSanitizado ||
    [draft?.titulo, draft?.textoSanitizado].filter(Boolean).join('\n');

  const filtro = avaliarNotificacaoBancaria({
    titulo: draft?.titulo,
    textoSanitizado: texto,
  });

  const appInfo = resolverAppBancario({
    pacoteOrigem: draft?.pacoteOrigem,
    appOrigem: draft?.appOrigem,
    titulo: draft?.titulo,
    texto,
  });

  let preLancamento = draft?.preLancamento || null;
  if (!preLancamento && filtro.aceitar && texto) {
    preLancamento = parseMensagemBancaria(texto);
    if (preLancamento) {
      preLancamento = {
        ...preLancamento,
        origem: 'notification_listener',
      };
      // Se o parser não achou banco, tenta pelo catálogo de pacote/alias
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
    appCatalogo: appInfo?.nome || null,
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

export async function obterModoAprendizado() {
  try {
    const v = await AsyncStorage.getItem(KEY_MODO_APRENDIZADO);
    if (v == null) {
      return true;
    }
    return v === '1' || v === 'true';
  } catch {
    return true;
  }
}

export async function definirModoAprendizado(enabled) {
  await AsyncStorage.setItem(KEY_MODO_APRENDIZADO, enabled ? '1' : '0');
  await sincronizarConfigNativa();
}

export async function sincronizarConfigNativa() {
  const modoAprendizado = await obterModoAprendizado();
  await syncFilterConfig({
    modoAprendizado,
    pacotesPermitidos: listarPacotesConhecidos(),
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
  };
}

export async function listarRascunhosDetectados({ apenasPendentes = true } = {}) {
  await sincronizarConfigNativa();
  const drafts = parseDraftsRaw(getNativeDrafts()).map(enriquecerRascunho);

  let lista = drafts;
  if (apenasPendentes) {
    lista = drafts.filter((d) => d.status === 'pendente' && d.filtroOk !== false);
  }

  return lista.sort((a, b) => {
    const ta = Date.parse(a.recebidoEm || a.criadoEm || 0) || 0;
    const tb = Date.parse(b.recebidoEm || b.criadoEm || 0) || 0;
    return tb - ta;
  });
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
