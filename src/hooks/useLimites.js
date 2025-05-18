import { getDados, postDados, putDados, deleteDados  } from '../utils/services'; // ajuste o caminho conforme necessário

export async function obterIdLimite(ano, mes) {
  try {
    const res = await postDados('/limit_list', { ano, mes });
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
    return res.sucess;
  } catch (err) {
    console.error('[atualizarLimite] Erro:', err);
    throw err;
  }
}

export async function inserirLimite(ano, mes, limite) {
  try {
    const res = await postDados('/salvar_limite', {
      ano,
      mes,
      limite,
      tipo: 'insert',
    });
    return res.sucess;
  } catch (err) {
    console.error('[inserirLimite] Erro:', err);
    throw err;
  }
}
