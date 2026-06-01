import { useEffect, useState } from 'react';
import { Alert, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDados } from '../utils/services';
import { buildQueryParams, obterMensagemErro } from '../utils/util';
import useCartoesLookup from './useCartoesLookup';

export default function useRelatorioContas(endpoint, listaKey) {
  const { getLabelCartao, cartoes } = useCartoesLookup();
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear().toString());
  const [mes, setMes] = useState(hoje.getMonth().toString());
  const [anosOptions, setAnosOptions] = useState([]);
  const [contas, setContas] = useState([]);
  const [limiteMes, setLimiteMes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [posicaoTabelaY, setPosicaoTabelaY] = useState(0);
  const [alturaDisponivel, setAlturaDisponivel] = useState(400);

  const screenHeight = Dimensions.get('window').height;

  const loadContas = async () => {
    setLoading(true);

    try {
      const organization = await AsyncStorage.getItem('@userKeyShareId');
      const query = buildQueryParams({ ano, mes, organization });
      const data = await getDados(`${endpoint}?${query}`);

      if (!data?.success) {
        Alert.alert('Erro', data?.message || 'Falha ao carregar dados.');
        return;
      }

      const anosArray = (data.anos || []).map((item) =>
        typeof item === 'object'
          ? { label: item.ano.toString(), value: item.ano.toString() }
          : { label: item.toString(), value: item.toString() }
      );

      setAnosOptions(anosArray);
      setContas(data[listaKey] || []);
      setLimiteMes(data.total_limite || data.limiteDoMes || 0);
    } catch (error) {
      Alert.alert('Erro', obterMensagemErro(error, 'Falha ao conectar com o servidor.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContas();
  }, [ano, mes]);

  useEffect(() => {
    if (posicaoTabelaY > 0) {
      setAlturaDisponivel(screenHeight - posicaoTabelaY - 130);
    }
  }, [posicaoTabelaY, screenHeight]);

  return {
    ano,
    setAno,
    mes,
    setMes,
    anosOptions,
    contas,
    limiteMes,
    loading,
    posicaoTabelaY,
    setPosicaoTabelaY,
    alturaDisponivel,
    loadContas,
    getLabelCartao,
    cartoes,
  };
}
