// src/hooks/useContas.js
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { postDados } from '../utils/services';

export default function useContas(ano, mes, form, setForm, setModalVisible) {
  const [contas, setContas] = useState([]);
  const [totais, setTotais] = useState({
    total_limite: 0,
    total_contas: 0,
    total_contas_pagas: 0,
    total_contas_pendentes: 0,
  });

  const loadContas = async () => {
    try {
      const data = await postDados('/dados_tab', { ano, mes });
      if (data.sucess) {
        setContas(data.contas || []);
        setTotais({
          total_limite: data.total_limite,
          total_contas: data.total_contas,
          total_contas_pagas: data.total_contas_pagas,
          total_contas_pendentes: data.total_contas_pendentes,
        });
      } else {
        Alert.alert('Erro', data.message || 'Erro ao carregar dados');
      }
    } catch {
      Alert.alert('Erro', 'Falha na conexão com servidor');
    }
  };

  useEffect(() => {
    loadContas();
  }, [ano, mes]);

  const marcarComoPaga = async (index, paga) => {
    try {
      const data = await postDados('/marcar-paga', { mes, index, paga });
      if (data.sucess) {
        setContas(prev =>
          prev.map(c => (c.id === index ? { ...c, paga } : c))
        );
        loadContas();
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar o status.');
      }
    } catch {
      Alert.alert('Erro', 'Erro de comunicação com o servidor.');
    }
  };

  const salvarConta = async () => {
    if (!form.nome || !form.valor || !form.vencimento) {
      Alert.alert('Campos obrigatórios', 'Preencha nome, valor e vencimento');
      return;
    }

    const dados = {
      ...form,
      ano,
      mes,
    };

    try {
      const res = await postDados('/form_conta', dados);

      if (res.sucess) {
        Alert.alert('Sucesso', 'Conta adicionada!');
        setForm({
          nome: '',
          vencimento: '',
          valor: '',
          categoria: '',
          tipo_cartao: '',
        });
        setModalVisible(false);
        loadContas();
      } else {
        Alert.alert('Erro', res.message || 'Erro ao adicionar conta');
      }
    } catch (err) {
      Alert.alert('Erro', 'Falha ao conectar com o servidor');
    }
  };

  return {
    contas,
    totais,
    loadContas,
    marcarComoPaga,
    salvarConta,
  };
}
