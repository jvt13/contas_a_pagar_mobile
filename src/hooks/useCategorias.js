import { useState, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CATEGORIAS_PADRAO,
  mesclarCategorias,
  resolverCategoria,
  slugifyCategoria,
} from '../utils/categorias';
import { STORAGE_KEYS } from '../utils/authSession';

function storageKey(orgId) {
  return `@categorias_custom_${orgId || 'default'}`;
}

export default function useCategorias() {
  const [custom, setCustom] = useState([]);
  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const organization = await AsyncStorage.getItem(STORAGE_KEYS.userKeyShareId);
      setOrgId(organization);

      if (!organization) {
        setCustom([]);
        return;
      }

      const raw = await AsyncStorage.getItem(storageKey(organization));
      setCustom(raw ? JSON.parse(raw) : []);
    } catch (error) {
      console.warn('[useCategorias] Falha ao carregar:', error?.message);
      setCustom([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const categorias = useMemo(
    () => mesclarCategorias(CATEGORIAS_PADRAO, custom),
    [custom]
  );

  const salvarCustom = useCallback(
    async (lista) => {
      const organization =
        orgId || (await AsyncStorage.getItem(STORAGE_KEYS.userKeyShareId));
      if (!organization) {
        throw new Error('Organização não encontrada.');
      }
      await AsyncStorage.setItem(storageKey(organization), JSON.stringify(lista));
      setCustom(lista);
      setOrgId(organization);
    },
    [orgId]
  );

  const criarCategoria = useCallback(
    async ({ nome, icone, cor }) => {
      const nomeTrim = String(nome || '').trim();
      if (!nomeTrim) {
        throw new Error('Informe o nome da categoria.');
      }

      let id = slugifyCategoria(nomeTrim);
      if (!id) {
        id = `cat_${Date.now()}`;
      }

      const existe = categorias.some((c) => c.id === id);
      if (existe) {
        id = `${id}_${Date.now().toString(36).slice(-4)}`;
      }

      const nova = {
        id,
        nome: nomeTrim,
        icone: icone || 'pricetag-outline',
        cor: cor || '#1E4DB7',
        custom: true,
      };

      const novasCustom = [...custom.filter((c) => c.id !== nova.id), nova];
      await salvarCustom(novasCustom);
      return nova;
    },
    [categorias, custom, salvarCustom]
  );

  const getCategoria = useCallback(
    (categoriaId) => resolverCategoria(categoriaId, categorias),
    [categorias]
  );

  return {
    categorias,
    loading,
    carregar,
    criarCategoria,
    getCategoria,
  };
}
