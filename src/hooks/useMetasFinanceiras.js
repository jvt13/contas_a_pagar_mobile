import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/authSession';

function storageKey(orgId) {
  return `@metas_financeiras_${orgId || 'default'}`;
}

function normalizarValorMeta(valor) {
  const numero = Number(String(valor || '').replace(',', '.')) || 0;
  return numero > 0 ? numero.toFixed(2) : '';
}

export default function useMetasFinanceiras() {
  const [metas, setMetas] = useState([]);
  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const organization = await AsyncStorage.getItem(STORAGE_KEYS.userKeyShareId);
      setOrgId(organization);

      if (!organization) {
        setMetas([]);
        return;
      }

      const raw = await AsyncStorage.getItem(storageKey(organization));
      const lista = raw ? JSON.parse(raw) : [];
      setMetas(Array.isArray(lista) ? lista : []);
    } catch (error) {
      console.warn('[useMetasFinanceiras] Falha ao carregar:', error?.message);
      setMetas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const salvarLista = useCallback(
    async (lista) => {
      const organization =
        orgId || (await AsyncStorage.getItem(STORAGE_KEYS.userKeyShareId));
      if (!organization) {
        throw new Error('Organização não encontrada.');
      }
      await AsyncStorage.setItem(storageKey(organization), JSON.stringify(lista));
      setMetas(lista);
      setOrgId(organization);
    },
    [orgId]
  );

  const salvarMeta = useCallback(
    async ({ categoriaId, valor }) => {
      const catId = String(categoriaId || '').trim();
      const valorNormalizado = normalizarValorMeta(valor);

      if (!catId) {
        throw new Error('Selecione uma categoria.');
      }
      if (!valorNormalizado) {
        throw new Error('Informe um valor de meta válido.');
      }

      const outras = metas.filter((m) => m.categoriaId !== catId);
      const novaLista = [...outras, { categoriaId: catId, valor: valorNormalizado }];
      await salvarLista(novaLista);
      return { categoriaId: catId, valor: valorNormalizado };
    },
    [metas, salvarLista]
  );

  const excluirMeta = useCallback(
    async (categoriaId) => {
      const catId = String(categoriaId || '').trim();
      if (!catId) {
        return;
      }
      const novaLista = metas.filter((m) => m.categoriaId !== catId);
      await salvarLista(novaLista);
    },
    [metas, salvarLista]
  );

  return {
    metas,
    loading,
    carregar,
    salvarMeta,
    excluirMeta,
  };
}
