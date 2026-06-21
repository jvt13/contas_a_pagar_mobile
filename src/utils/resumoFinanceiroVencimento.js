export const SEM_CATEGORIA = '__sem_categoria__';

export function unificarContasPorVencimento(pendentes = [], pagas = []) {
  const mapa = new Map();

  for (const conta of pagas) {
    if (conta?.id == null) {
      continue;
    }
    mapa.set(String(conta.id), { ...conta, paga: true });
  }

  for (const conta of pendentes) {
    if (conta?.id == null) {
      continue;
    }
    const id = String(conta.id);
    if (!mapa.has(id)) {
      mapa.set(id, { ...conta, paga: false });
    }
  }

  return [...mapa.values()];
}

function calcularPercentual(parte, total) {
  const valorParte = Number(parte) || 0;
  const valorTotal = Number(total) || 0;
  if (valorTotal <= 0) {
    return 0;
  }
  const percentual = (valorParte / valorTotal) * 100;
  return Number.isFinite(percentual) ? percentual : 0;
}

/**
 * Resumo financeiro do mês (eixo vencimento) para prévia e snapshot de fechamento.
 */
export function montarResumoFechamento(contas, limiteMes) {
  const lista = Array.isArray(contas) ? contas : [];
  let despesasTotais = 0;
  let totalPago = 0;
  let totalPendente = 0;
  let quantidadePagas = 0;
  let quantidadePendentes = 0;
  const categoriasMap = new Map();

  for (const conta of lista) {
    const valor = Number(conta?.valor) || 0;
    despesasTotais += valor;

    if (conta?.paga) {
      totalPago += valor;
      quantidadePagas += 1;
    } else {
      totalPendente += valor;
      quantidadePendentes += 1;
    }

    const categoriaId = conta?.categoria ? String(conta.categoria) : SEM_CATEGORIA;
    if (!categoriasMap.has(categoriaId)) {
      categoriasMap.set(categoriaId, { categoriaId, total: 0, quantidade: 0 });
    }
    const categoria = categoriasMap.get(categoriaId);
    categoria.total += valor;
    categoria.quantidade += 1;
  }

  const limiteMensal = Number(limiteMes) || 0;
  const temLimite = limiteMensal > 0;
  const disponivel = limiteMensal - despesasTotais;
  const percentualUso = temLimite ? calcularPercentual(despesasTotais, limiteMensal) : null;

  const topCategorias = [...categoriasMap.values()]
    .map((item) => ({
      categoriaId: item.categoriaId,
      total: item.total,
      quantidade: item.quantidade,
      percentual: calcularPercentual(item.total, despesasTotais),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    limiteMensal,
    temLimite,
    despesasTotais,
    totalPago,
    totalPendente,
    disponivel,
    percentualUso,
    quantidadeContas: lista.length,
    quantidadePagas,
    quantidadePendentes,
    topCategorias,
  };
}

export function montarAnosOptions(data) {
  return (data?.anos || []).map((item) =>
    typeof item === 'object'
      ? { label: item.ano.toString(), value: item.ano.toString() }
      : { label: item.toString(), value: item.toString() }
  );
}
