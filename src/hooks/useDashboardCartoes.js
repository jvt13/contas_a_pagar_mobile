import { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDados } from '../utils/services';
import { STORAGE_KEYS } from '../utils/authSession';
import { montarDashboardCartoes } from '../utils/dashboardCartao';

/**
 * Carrega dashboard agregado do backend (1 request).
 * Fallback: monta localmente se endpoint indisponível.
 */
export default function useDashboardCartoes() {
  const [resumos, setResumos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);

    try {
      const orgaId = await AsyncStorage.getItem(STORAGE_KEYS.userKeyShareId);
      if (!orgaId) {
        setErro('Organização não encontrada.');
        setResumos([]);
        return;
      }

      const res = await getDados(`/dashboard/cartoes?orgaId=${orgaId}`);

      if (res?.success && Array.isArray(res.data)) {
        setResumos(res.data);
        return;
      }

      // Fallback: cartões + contas pendentes sem filtro de mês
      const [cartoesRes, pendentesRes] = await Promise.all([
        getDados(`/get_cartoes?orgaId=${orgaId}`),
        getDados(`/contas_pendentes?organization=${orgaId}&ano=&mes=`),
      ]);

      const cartoes = cartoesRes?.success ? cartoesRes.data : [];
      const contas = pendentesRes?.contasPendentes || pendentesRes?.data || [];
      setResumos(montarDashboardCartoes(cartoes, contas, contas, new Date()));
    } catch (error) {
      console.error('Erro ao carregar dashboard de cartões:', error);
      setErro('Não foi possível carregar o dashboard.');
      setResumos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { resumos, loading, erro, carregar };
}
