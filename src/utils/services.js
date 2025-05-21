// utils/services.js
// -------------------
// Conexão dinâmica usando variável de ambiente definida em app.config.js/extra.

import Constants from 'expo-constants';

// Pega a URL base do extra definido em app.config.js
const API_URL = Constants.expoConfig.extra.EXPO_PUBLIC_API_URL;

/**
 * Função genérica de requisição para o servidor.
 * @param {string} path   - endpoint relativo (ex: '/auth/login')
 * @param {object} opts   - método, body e headers
 */
async function request(path, { method = 'GET', body = null, headers = {} } = {}) {
  const url = `${API_URL}${path}`;
  console.log(`[Interceptando] ${method} -> ${url}`);

  const init = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    ...(body && { body: JSON.stringify(body) }),
  };

  // Executa a requisição
  const res = await fetch(url, init);

  // Tenta ler o JSON (pode ser sucesso ou erro)
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    // Prioriza mensagem do backend, se existir
    const errorMessage = data?.message || data?.mensagem || `Erro ${res.status}`;
    console.warn(`[Erro ${res.status}] na URL: ${url} - ${errorMessage}`);
    throw new Error(errorMessage);
  }

  // Log de tamanho da resposta
  const size = new TextEncoder().encode(JSON.stringify(data)).length;
  console.log(`[Tamanho da resposta]: ${size} bytes`);
  return data;
}

// Atalhos para métodos HTTP
export async function postDados(path, dados) {
  return request(path, { method: 'POST', body: dados });
}
export async function putDados(path, dados) {
  return request(path, { method: 'PUT', body: dados });
}
export async function getDados(path) {
  return request(path, { method: 'GET' });
}
export async function deleteDados(path) {
  return request(path, { method: 'DELETE' });
}

// Agora, no frontend, basta capturar err.message no catch:
// try {
//   const response = await postDados('/auth/login', { email, password });
// } catch (err) {
//   Alert.alert('Login falhou', err.message);
// }


// Certifique-se de que em app.config.js você tenha:
// extra: {
//   ...config.extra,
//   EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.15.100:5000'
// }
