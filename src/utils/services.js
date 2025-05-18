// Endereço base da API: usa variável de ambiente (EXPO_PUBLIC_API_URL) se estiver definida.
// Caso contrário, usa o IP local padrão.
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.15.100:5000';

/**
 * Função genérica de requisição que intercepta todas as chamadas para logar e tratar erros.
 * @param {string} path - Caminho relativo da API (ex: '/usuarios')
 * @param {object} options - Configuração do método, body e headers
 * @returns {Promise<object>} - Resposta da API em JSON
 */
async function request(path, { method = 'GET', body = null, headers = {} } = {}) {
  const url = `${API_URL}${path}`;
  console.log(`[Interceptando] ${method} -> ${url}`);

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
    console.log('[Payload]:', body);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      console.warn(`[Erro ${response.status}] na URL: ${url}`);
      throw new Error(`Erro ${response.status}`);
    }

    const json = await response.json();
    const jsonString = JSON.stringify(json);
    const tamanhoBytes = new TextEncoder().encode(jsonString).length;
    console.log(`[Tamanho da resposta]: ${tamanhoBytes} bytes`);
    return json;
  } catch (error) {
    console.error('[Requisição falhou]:', error.message);
    throw error;
  }
}

/**
 * POST genérico (usado para criar ou enviar dados para o backend).
 * Exemplo de uso: postDados('/criar', { nome: 'João' });
 */
export async function postDados(path, dados) {
  return await request(path, { method: 'POST', body: dados });
}

/**
 * PUT genérico (usado para atualizar dados existentes).
 * Exemplo: putDados('/editar/1', { nome: 'Maria' });
 */
export async function putDados(path, dados) {
  return await request(path, { method: 'PUT', body: dados });
}

/**
 * GET genérico (usado para buscar dados do backend).
 * Exemplo: getDados('/listar');
 */
export async function getDados(path) {
  return await request(path);
}

/**
 * DELETE genérico (usado para excluir registros).
 * Exemplo: deleteDados('/excluir/1');
 */
export async function deleteDados(path) {
  return await request(path, { method: 'DELETE' });
}
