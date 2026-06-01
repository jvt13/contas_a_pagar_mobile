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
