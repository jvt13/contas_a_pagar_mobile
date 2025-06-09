import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';

/**
 * Hook para calcular a altura disponível para a FlatList ou outras áreas de conteúdo dinâmico.
 * @param {number} posicaoY Posição Y da FlatList ou Container onde a lista começa.
 * @param {number} offset Margem ou padding adicional a considerar (opcional, padrão: 80).
 * @returns {number} Altura disponível para uso.
 */
export default function useAlturaDisponivel(posicaoY, offset = 80) {
  const [alturaDisponivel, setAlturaDisponivel] = useState(0);
  console.log('useAlturaDisponivel', posicaoY, offset);

  useEffect(() => {
    const { height: screenHeight } = Dimensions.get('window');
    const alturaCalculada = screenHeight - posicaoY - offset;
    setAlturaDisponivel(alturaCalculada > 0 ? alturaCalculada : 0);
  }, [posicaoY, offset]);

  return alturaDisponivel;
}
