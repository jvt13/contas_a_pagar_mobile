import { postDados, putDados } from '../utils/services';

export async function obterIdLimite(ano, mes, organization) {
  try {
    const res = await postDados('/limit_list', { ano, mes, organization });
    console.log('[obterIdLimite] Resposta:', res);
    return res.success ? res.id : null;
  } catch (err) {
    console.error('[obterIdLimite] Erro:', err);
    throw err;
  }
}

/**
 * Valor do orçamento mensal (limite de gastos) para o ano/mês selecionado.
 * @param {string|number} ano
 * @param {string|number} mes — mês do filtro 0-based ('0'–'11'); o backend converte para 1-based em contas_lancadas
 * @param {string} organization
 * @returns {Promise<number>}
 */
export async function obterLimiteMensal(ano, mes, organization) {
  try {
    const res = await postDados('/contas_lancadas', { ano, mes, organization });
    if (!res?.success) {
      return 0;
    }
    const valor = Number(res.total_limite);
    return Number.isFinite(valor) ? valor : 0;
  } catch (err) {
    console.error('[obterLimiteMensal] Erro:', err);
    return 0;
  }
}

export async function atualizarLimite(ano, mes, limite, id) {
  try {
    console.log('Limite:', limite);
    const res = await putDados('/salvar_limite', {
      ano,
      mes,
      limite,
      id,
      tipo: 'update',
    });
    return res.success;
  } catch (err) {
    console.error('[atualizarLimite] Erro:', err);
    throw err;
  }
}

export async function inserirLimite(ano, mes, limite, user, organization) {
  try {
    const res = await postDados('/salvar_limite', {
      ano,
      mes,
      limite,
      user,
      organization,
      tipo: 'insert',
    });
    return res.success;
  } catch (err) {
    console.error('[inserirLimite] Erro:', err);
    throw err;
  }
}
