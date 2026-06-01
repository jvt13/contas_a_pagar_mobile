import Constants from 'expo-constants';
import { API_BASE_URL } from '../config/api';
import { getAuthToken } from './authSession';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || API_BASE_URL;
const REQUEST_TIMEOUT = 15000;

/** URL efetiva da API (útil para diagnóstico). */
export function getApiUrl() {
  return API_URL;
}

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

const getErrorMessage = (status, data) =>
  data?.message || data?.mensagem || `Erro ${status}`;

export function normalizeApiResponse(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (data.success === undefined && data.sucess !== undefined) {
    return { ...data, success: data.sucess };
  }

  return data;
}

async function buildHeaders(extraHeaders = {}, includeAuth = true) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Client': 'mobile',
    ...extraHeaders,
  };

  if (includeAuth) {
    const token = await getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

async function request(path, { method = 'GET', body = null, headers = {}, auth = true } = {}) {
  if (!API_URL) {
    throw new Error('API não configurada. Defina EXPO_PUBLIC_API_URL no .env ou src/config/api.js.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  const url = `${API_URL}${path}`;

  const init = {
    method,
    headers: await buildHeaders(headers, auth),
    signal: controller.signal,
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  try {
    const response = await fetch(url, init);

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    data = normalizeApiResponse(data);

    if (response.status === 401) {
      if (unauthorizedHandler) {
        unauthorizedHandler();
      }
      throw new Error(getErrorMessage(401, data) || 'Sessão expirada. Faça login novamente.');
    }

    if (response.status === 403) {
      throw new Error(getErrorMessage(403, data) || 'Acesso negado.');
    }

    if (!response.ok) {
      const apiError = new Error(getErrorMessage(response.status, data));
      apiError.status = response.status;
      apiError.path = path;
      apiError.method = method;
      apiError.apiMessage = getErrorMessage(response.status, data);

      if (__DEV__) {
        console.warn(`[API] ${method} ${url} -> ${response.status}`, data);
      }

      throw apiError;
    }

    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Tempo de resposta do servidor esgotado. Tente novamente.');
    }

    if (error instanceof TypeError) {
      const networkError = new Error(
        `Falha de conexão com ${API_URL}. Verifique se o backend está ativo e o IP está correto.`
      );
      networkError.path = path;
      networkError.method = method;
      throw networkError;
    }

    if (__DEV__ && !error.path) {
      error.path = path;
      error.method = method;
      console.warn(`[API] ${method} ${url} falhou:`, error.message);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function postDados(path, dados, options = {}) {
  return request(path, { method: 'POST', body: dados, ...options });
}

export async function putDados(path, dados, options = {}) {
  return request(path, { method: 'PUT', body: dados, ...options });
}

export async function getDados(path, options = {}) {
  return request(path, { method: 'GET', ...options });
}

export async function deleteDados(path, options = {}) {
  return request(path, { method: 'DELETE', ...options });
}
