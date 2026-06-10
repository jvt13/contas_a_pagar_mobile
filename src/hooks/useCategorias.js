import { useState, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CATEGORIAS_PADRAO,
  SUBCATEGORIAS_PADRAO,
  mesclarCategorias,
  mesclarSubcategorias,
  resolverCategoria,
  resolverSubcategoria,
  slugifyCategoria,
  isCategoriaRaiz,
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

  const getSubcategorias = useCallback(
    (parentId) => mesclarSubcategorias(SUBCATEGORIAS_PADRAO, custom, parentId),
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

  const getSubcategoria = useCallback(
    (parentId, subcategoriaId) =>
      resolverSubcategoria(subcategoriaId, parentId, getSubcategorias(parentId)),
    [getSubcategorias]
  );

  const criarSubcategoria = useCallback(
    async (parentId, { nome, icone, cor }) => {
      const parentStr = String(parentId || '').trim();
      if (!parentStr) {
        throw new Error('Selecione a categoria pai.');
      }

      const nomeTrim = String(nome || '').trim();
      if (!nomeTrim) {
        throw new Error('Informe o nome da subcategoria.');
      }

      const pai = getCategoria(parentStr);
      const corFinal = cor || pai?.cor || '#1E4DB7';
      const iconeFinal = icone || 'pricetag-outline';

      let id = slugifyCategoria(nomeTrim);
      if (!id) {
        id = `sub_${Date.now()}`;
      }

      const subsExistentes = getSubcategorias(parentStr);
      if (subsExistentes.some((s) => s.id === id)) {
        id = `${id}_${Date.now().toString(36).slice(-4)}`;
      }

      const nova = {
        id,
        nome: nomeTrim,
        parent_id: parentStr,
        icone: iconeFinal,
        cor: corFinal,
        custom: true,
      };

      const novasCustom = [...custom.filter((c) => c.id !== nova.id), nova];
      await salvarCustom(novasCustom);
      return nova;
    },
    [custom, getCategoria, getSubcategorias, salvarCustom]
  );

  return {
    categorias,
    custom,
    loading,
    carregar,
    criarCategoria,
    criarSubcategoria,
    getCategoria,
    getSubcategoria,
    getSubcategorias,
    isCategoriaRaiz,
  };
}
