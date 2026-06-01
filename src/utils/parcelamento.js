/**
 * Helpers de parcelamento (espelham regras do backend).
 */

export const OPCOES_PARCELAS = [2, 3, 6, 12, 18, 24];

export const ESCOPOS_PARCELA = {
  APENAS_ESTA: 'apenas_esta',
  ESTA_E_FUTURAS: 'esta_e_futuras',
  TODAS: 'todas',
};

export function extrairNomeBaseParcela(nome) {
  return String(nome || '').replace(/\s+\d+\/\d+$/, '').trim();
}

export function formatarLabelParcela(conta) {
  if (conta?.parcela_atual && conta?.total_parcelas) {
    return `${conta.parcela_atual}/${conta.total_parcelas}`;
  }
  if (conta?.recorrencia_atual && conta?.total_recorrencias) {
    return `${conta.recorrencia_atual}/${conta.total_recorrencias}`;
  }
  return null;
}

export function contaPertenceGrupoParcela(conta) {
  const isParcelado = Boolean(conta?.grupo_parcelamento && conta?.total_parcelas > 1);
  const isRecorrente = Boolean(conta?.grupo_recorrencia && conta?.total_recorrencias > 1);
  return isParcelado || isRecorrente;
}

export function perguntarEscopoParcela(titulo, mensagem) {
  return new Promise((resolve) => {
    const { Alert } = require('react-native');

    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
      { text: 'Apenas esta', onPress: () => resolve(ESCOPOS_PARCELA.APENAS_ESTA) },
      { text: 'Esta e futuras', onPress: () => resolve(ESCOPOS_PARCELA.ESTA_E_FUTURAS) },
      { text: 'Todas', onPress: () => resolve(ESCOPOS_PARCELA.TODAS) },
    ]);
  });
}
