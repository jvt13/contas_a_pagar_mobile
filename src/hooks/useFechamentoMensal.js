import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/authSession';

function storageKey(orgId) {
  return `@fechamentos_mensais_${orgId || 'default'}`;
}

export function fechamentoId(ano, mes) {
  return `${ano}-${mes}`;
}

function normalizarLista(raw) {
  if (!raw) {
    return [];
  }
  try {
    const lista = JSON.parse(raw);
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

export default function useFechamentoMensal() {
  const [fechamentos, setFechamentos] = useState([]);
  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const organization = await AsyncStorage.getItem(STORAGE_KEYS.userKeyShareId);
      setOrgId(organization);

      if (!organization) {
        setFechamentos([]);
        return;
      }

      const raw = await AsyncStorage.getItem(storageKey(organization));
      setFechamentos(normalizarLista(raw));
    } catch (error) {
      console.warn('[useFechamentoMensal] Falha ao carregar:', error?.message);
      setFechamentos([]);
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
      setFechamentos(lista);
      setOrgId(organization);
    },
    [orgId]
  );

  const obterFechamento = useCallback(
    (ano, mes) => {
      const id = fechamentoId(ano, mes);
      return fechamentos.find((item) => item.id === id) || null;
    },
    [fechamentos]
  );

  const salvarFechamento = useCallback(
    async (snapshot) => {
      const id = fechamentoId(snapshot.ano, snapshot.mes);
      const registro = {
        ...snapshot,
        id,
        status: 'fechado',
        fechadoEm: new Date().toISOString(),
      };

      const outras = fechamentos.filter((item) => item.id !== id);
      await salvarLista([...outras, registro]);
      return registro;
    },
    [fechamentos, salvarLista]
  );

  const removerFechamento = useCallback(
    async (ano, mes) => {
      const id = fechamentoId(ano, mes);
      const novaLista = fechamentos.filter((item) => item.id !== id);
      await salvarLista(novaLista);
    },
    [fechamentos, salvarLista]
  );

  return {
    fechamentos,
    loading,
    carregar,
    obterFechamento,
    salvarFechamento,
    removerFechamento,
  };
}
