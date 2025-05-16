const API_URL = 'http://192.168.15.100:5000'; // Ou IP da máquina no mobile

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
    //console.log('[Resposta]:', json); 
    return json;
  } catch (error) {
    console.error('[Requisição falhou]:', error.message);
    throw error;
  }
}

export async function postDados(path, dados) {
  return await request(path, { method: 'POST', body: dados });
}

export async function putDados(path, dados) {
  return await request(path, { method: 'PUT', body: dados });
}

export async function getDados(path) {
  return await request(path);
}

export async function deleteDados(path) {
  return await request(path, { method: 'DELETE' });
}
