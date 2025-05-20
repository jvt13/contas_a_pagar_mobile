// Endereço base da API: usa variável de ambiente (EXPO_PUBLIC_API_URL) se estiver definida.
// Caso contrário, usa o IP local padrão.
let API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.15.100:5000';

const BACKUP_API_URL = 'https://www.srv-jvt.com'; // sua API externa

/**
 * Função genérica de requisição que intercepta todas as chamadas para logar e tratar erros.
 * @param {string} path - Caminho relativo da API (ex: '/usuarios')
 * @param {object} options - Configuração do método, body e headers
 * @returns {Promise<object>} - Resposta da API em JSON
 */
async function request(path, { method = 'GET', body = null, headers = {} } = {}) {
  let url = `${API_URL}${path}`;
  console.log(`[Interceptando] ${method} -> ${url}`);

  const baseHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const stringifiedBody = body ? JSON.stringify(body) : null;
  if (stringifiedBody) {
    console.log('[Payload]:', body);
  }

  const makeRequest = async (urlToUse) => {
    const options = {
      method,
      headers: baseHeaders,
      ...(stringifiedBody && { body: stringifiedBody }),
    };

    const res = await fetch(urlToUse, options);

    if (!res.ok) {
      console.warn(`[Erro ${res.status}] na URL: ${urlToUse}`);
      throw new Error(`Erro ${res.status}`);
    }

    const json = await res.json();
    const jsonString = JSON.stringify(json);
    const tamanhoBytes = new TextEncoder().encode(jsonString).length;
    console.log(`[Tamanho da resposta]: ${tamanhoBytes} bytes`);
    return json;
  };

  try {
    return await makeRequest(url);
  } catch (error) {
    //console.error(`[Falha com API local: ${url}]. Tentando fallback.`);

    try {
      const fallbackUrl = `${BACKUP_API_URL}${path}`;
      console.log(`[Tentando fallback] ${method} -> ${fallbackUrl}`);
      return await makeRequest(fallbackUrl);
    } catch (fallbackError) {
      //console.error('[Falha na API externa também]:', fallbackError.message);
      throw fallbackError;
    }
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
