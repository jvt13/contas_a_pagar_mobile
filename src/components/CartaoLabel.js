import React, { useMemo } from 'react';
import { Text } from 'react-native';
import useCartoesLookup from '../hooks/useCartoesLookup';
import { buildCartoesMap, formatarLabelCartaoPorId, formatarNomeCartao } from '../utils/cartao';

/**
 * Exibe label do cartão: "Nome - Tipo".
 * Passe `cartoes` para evitar nova requisição; caso contrário carrega via hook.
 */
export default function CartaoLabel({
  cartaoId,
  cartao,
  cartoes: cartoesProp,
  style,
  numberOfLines = 1,
}) {
  const { mapa: mapaHook } = useCartoesLookup({ autoLoad: !cartoesProp });

  const mapa = useMemo(
    () => (cartoesProp ? buildCartoesMap(cartoesProp) : mapaHook),
    [cartoesProp, mapaHook]
  );

  const label = cartao
    ? formatarNomeCartao(cartao)
    : formatarLabelCartaoPorId(cartaoId, mapa);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {label}
    </Text>
  );
}
