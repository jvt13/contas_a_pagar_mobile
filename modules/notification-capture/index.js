import { Platform } from 'react-native';

const STUB = {
  isSupported: () => false,
  isNotificationAccessEnabled: () => false,
  openNotificationAccessSettings: async () => false,
  isCaptureEnabled: () => false,
  setCaptureEnabled: async () => false,
  syncFilterConfig: async () => false,
  setAllowedPackages: async () => false,
  getDrafts: () => [],
  updateDraftStatus: async () => false,
  deleteDraft: async () => false,
  clearDrafts: async () => false,
  getLastError: () => null,
  clearLastError: async () => false,
};

let nativeModule = null;

function getNative() {
  if (Platform.OS !== 'android') {
    return STUB;
  }
  if (nativeModule) {
    return nativeModule;
  }
  try {
    // eslint-disable-next-line global-require
    const { requireNativeModule } = require('expo-modules-core');
    nativeModule = requireNativeModule('NotificationCapture');
    return nativeModule;
  } catch (error) {
    if (__DEV__) {
      console.warn(
        '[NotificationCapture] Módulo nativo indisponível (requer build nativo/EAS).',
        error?.message || error
      );
    }
    nativeModule = STUB;
    return STUB;
  }
}

export function isNotificationCaptureSupported() {
  if (Platform.OS !== 'android') {
    return false;
  }
  const native = getNative();
  if (native === STUB) {
    return false;
  }
  try {
    if (typeof native.isSupported === 'function') {
      return !!native.isSupported();
    }
    return typeof native.isNotificationAccessEnabled === 'function';
  } catch {
    return false;
  }
}

export function isNotificationAccessEnabled() {
  try {
    return !!getNative().isNotificationAccessEnabled();
  } catch {
    return false;
  }
}

export async function openNotificationAccessSettings() {
  try {
    return !!(await getNative().openNotificationAccessSettings());
  } catch {
    return false;
  }
}

export function isCaptureEnabled() {
  try {
    return !!getNative().isCaptureEnabled();
  } catch {
    return false;
  }
}

export async function setCaptureEnabled(enabled) {
  try {
    return !!(await getNative().setCaptureEnabled(!!enabled));
  } catch {
    return false;
  }
}

/**
 * @param {{ modoAprendizado?: boolean, pacotesPermitidos?: string[], aliasesBancarios?: string[] }} config
 */
export async function syncFilterConfig(config = {}) {
  try {
    return !!(await getNative().syncFilterConfig(config));
  } catch {
    return false;
  }
}

/**
 * Atualiza a allowlist de pacotes no nativo (SharedPreferences).
 * @param {string[]} packages
 */
export async function setAllowedPackages(packages = []) {
  try {
    return !!(await getNative().syncFilterConfig({
      pacotesPermitidos: Array.isArray(packages) ? packages : [],
    }));
  } catch {
    return false;
  }
}

export function getNativeDrafts() {
  try {
    const raw = getNative().getDrafts();
    if (Array.isArray(raw)) {
      return raw;
    }
    if (typeof raw === 'string') {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}

export async function updateDraftStatus(id, status) {
  try {
    return !!(await getNative().updateDraftStatus(String(id), String(status)));
  } catch {
    return false;
  }
}

export async function deleteDraft(id) {
  try {
    return !!(await getNative().deleteDraft(String(id)));
  } catch {
    return false;
  }
}

export async function clearDrafts() {
  try {
    return !!(await getNative().clearDrafts());
  } catch {
    return false;
  }
}

export function getLastNativeError() {
  try {
    const raw = getNative().getLastError?.();
    if (!raw) {
      return null;
    }
    if (typeof raw === 'string') {
      return { message: raw, at: null };
    }
    return {
      message: raw.message != null ? String(raw.message) : '',
      at: raw.at ? String(raw.at) : null,
    };
  } catch {
    return null;
  }
}

export async function clearLastNativeError() {
  try {
    return !!(await getNative().clearLastError?.());
  } catch {
    return false;
  }
}

export default {
  isNotificationCaptureSupported,
  isNotificationAccessEnabled,
  openNotificationAccessSettings,
  isCaptureEnabled,
  setCaptureEnabled,
  syncFilterConfig,
  setAllowedPackages,
  getNativeDrafts,
  updateDraftStatus,
  deleteDraft,
  clearDrafts,
  getLastNativeError,
  clearLastNativeError,
};
