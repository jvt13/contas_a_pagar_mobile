import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDados } from '../utils/services';
import { STORAGE_KEYS } from '../utils/authSession';
import {
  buildCartoesMap,
  formatarLabelCartaoPorId,
  formatarNomeCartao,
} from '../utils/cartao';

/**
 * Carrega cartões da organização para exibir labels (id → "Nome - Tipo").
 * Somente leitura; não altera payloads.
 */
export default function useCartoesLookup({ autoLoad = true } = {}) {
  const [cartoes, setCartoes] = useState([]);
  const [loading, setLoading] = useState(false);

  const reloadCartoes = useCallback(async () => {
    setLoading(true);
    try {
      const orgaId = await AsyncStorage.getItem(STORAGE_KEYS.userKeyShareId);
      if (!orgaId) {
        setCartoes([]);
        return;
      }

      const res = await getDados(`/get_cartoes?orgaId=${orgaId}`);
      if (res?.success && Array.isArray(res.data)) {
        setCartoes(res.data);
      } else {
        setCartoes([]);
      }
    } catch (error) {
      console.warn('[useCartoesLookup] Falha ao carregar cartões:', error?.message);
      setCartoes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      reloadCartoes();
    }
  }, [autoLoad, reloadCartoes]);

  const mapa = useMemo(() => buildCartoesMap(cartoes), [cartoes]);

  const getLabelCartao = useCallback(
    (cartaoId) => formatarLabelCartaoPorId(cartaoId, mapa),
    [mapa]
  );

  const getCartaoById = useCallback(
    (cartaoId) => mapa[String(cartaoId)] || null,
    [mapa]
  );

  const getNomeCartao = useCallback(
    (cartaoOuId) => {
      if (cartaoOuId && typeof cartaoOuId === 'object') {
        return formatarNomeCartao(cartaoOuId);
      }
      return getLabelCartao(cartaoOuId);
    },
    [getLabelCartao]
  );

  return {
    cartoes,
    mapa,
    loading,
    reloadCartoes,
    getLabelCartao,
    getCartaoById,
    getNomeCartao,
  };
}
