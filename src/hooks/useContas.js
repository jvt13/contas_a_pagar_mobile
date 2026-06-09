import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { postDados } from '../utils/services';
import { obterMensagemErro } from '../utils/util';

export default function useContas(ano, mes, sharedOrgKey) {
  const [anos, setAnos] = useState([]);
  const [contas, setContas] = useState([]);
  const [totais, setTotais] = useState({
    total_limite: 0,
    total_contas: 0,
    total_contas_pagas: 0,
    total_contas_pendentes: 0,
  });
  const [loading, setLoading] = useState(false);

  const loadContas = async () => {
    setLoading(true);

    try {
      const organization = (await AsyncStorage.getItem('@userKeyShareId')) || sharedOrgKey;
      const data = await postDados('/contas_lancadas', { ano, mes, organization });

      if (!data?.success) {
        Alert.alert('Erro', data?.message || 'Erro ao carregar dados.');
        return;
      }

      const anosArray = (data.anos || []).map((item) =>
        typeof item === 'object'
          ? { label: item.ano.toString(), value: item.ano.toString() }
          : { label: item.toString(), value: item.toString() }
      );

      setAnos(anosArray);
      setContas(data.contas || []);
      setTotais({
        total_limite: data.total_limite || 0,
        total_contas: data.total_contas || 0,
        total_contas_pagas: data.total_contas_pagas || 0,
        total_contas_pendentes: data.total_contas_pendentes || 0,
      });
    } catch (error) {
      Alert.alert('Erro', obterMensagemErro(error, 'Falha na conexão com o servidor.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContas();
  }, [ano, mes, sharedOrgKey]);

  const marcarComoPaga = async (index, paga) => {
    try {
      const data = await postDados('/marcar-paga', { mes, index, paga });

      if (!data?.success) {
        Alert.alert('Erro', 'Não foi possível atualizar o status.');
        return;
      }

      setContas((prev) => prev.map((conta) => (conta.id === index ? { ...conta, paga } : conta)));
      loadContas();
    } catch (error) {
      Alert.alert('Erro', obterMensagemErro(error, 'Erro de comunicação com o servidor.'));
    }
  };

  return {
    contas,
    totais,
    anos,
    loading,
    loadContas,
    marcarComoPaga,
  };
}
