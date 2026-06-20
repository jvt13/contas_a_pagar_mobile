import { useState } from 'react';
import { Alert } from 'react-native';
import { getDados, postDados, putDados, deleteDados } from '../utils/services';
import { msgToast } from '../utils/util';
import { inferirBancoDoNome } from '../utils/bancos';
import { isCartaoDebito } from '../utils/tipoCartao';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function useCartaoManager() {
  const [form, setForm] = useState({
    nome: '',
    banco_slug: '',
    tipo_cartao: '',
    vencimento: '',
    dia_util: '',
    limite_credito: '',
    conta_user: '',
    organization: '' 
  });
  const [cartoes, setCartoes] = useState([]);
  const [editId, setEditId] = useState(null);

  const carregarCartoes = async () => { 
    try {
      const keyShareId = await AsyncStorage.getItem('@userKeyShareId');
      if (!keyShareId) {
        Alert.alert('Erro', 'Chave de organização não encontrada');
        return;
      }

      const res = await getDados(`/get_cartoes?orgaId=${keyShareId}`);
      if (res?.success && Array.isArray(res.data)) {
        setCartoes(res.data);
      } else if (Array.isArray(res?.data)) {
        setCartoes(res.data);
      } else if (Array.isArray(res?.result)) {
        setCartoes(res.result);
      } else {
        setCartoes([]);
        if (res?.success === false && res?.mensagem) {
          console.warn('[useCartaoManager] carregarCartoes:', res.mensagem);
        }
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao conectar com servidor');
    }
  };


  const handleAddOrEdit = async () => {
    if (!form.banco_slug) {
      Alert.alert('Banco obrigatório', 'Selecione o banco emissor do cartão.');
      return;
    }

    if (!form.tipo_cartao || form.tipo_cartao === 'selecione') {
      Alert.alert('Campos obrigatórios', 'Selecione o tipo do cartão (Crédito ou Débito).');
      return;
    }

    const ehDebitoForm = form.tipo_cartao === 'debito';

    if (!ehDebitoForm && (!form.vencimento || !form.dia_util)) {
      Alert.alert('Campos obrigatórios', 'Preencha vencimento e fechamento para cartão de crédito.');
      return;
    }

    const payload = ehDebitoForm
      ? { ...form, vencimento: '1', dia_util: '1', limite_credito: '' }
      : form;

    try {
      if (editId) {
        await putDados(`/update_cartao/${editId}`, payload);
        msgToast('Cartão atualizado com sucesso!');
      } else {
        await postDados('/add_cartao', payload);
        msgToast('Cartão adicionado com sucesso!');
      }

      resetForm();
      setEditId(null);
      carregarCartoes();
    } catch (error) {
      Alert.alert('Erro', 'Erro ao salvar cartão');
    }
  };

  const handleEditar = (cartao) => {
    const bancoInferido = inferirBancoDoNome(cartao.nome);
    const ehDebito = isCartaoDebito(cartao);
    setForm({
      nome: cartao.nome,
      banco_slug: cartao.banco_slug || bancoInferido?.slug || '',
      tipo_cartao: cartao.tipo_cartao,
      vencimento: ehDebito ? '1' : String(cartao.vencimento),
      dia_util: ehDebito ? '1' : String(cartao.dia_util),
      limite_credito: ehDebito ? '' : cartao.limite_credito != null ? String(cartao.limite_credito) : '',
      conta_user: cartao.conta_user,
      organization: cartao.organization
    });
    setEditId(cartao.id);
  };

  const handleExcluir = async (id) => {
    try {
      await deleteDados(`/delete_cartao/${id}`);
      Alert.alert('Sucesso', 'Cartão excluído com sucesso!');
      resetForm();
      setEditId(null);
      carregarCartoes();
    } catch (error) {
      Alert.alert('Erro', 'Erro ao excluir cartão');
    }
  };

  const getCartaoById = async (id) => {
    try {
      const res = await getDados(`/get_cartao_id/${id}`);
      if (res.success) {
        return res.data;
      } else {
        Alert.alert('Erro', 'Cartão não encontrado');
        return null;
      }
    } catch (error) {
      Alert.alert('Erro', 'Erro ao buscar cartão');
      return null;
    }
  };

  const resetForm = () => {
    setForm({
      nome: '',
      banco_slug: '',
      tipo_cartao: 'selecione',
      vencimento: '',
      dia_util: '',
      limite_credito: '',
      conta_user: '',
      organization: ''
    });
  };

  return {
    form, setForm,
    cartoes, setCartoes,
    editId, setEditId,
    carregarCartoes,
    handleAddOrEdit,
    handleEditar,
    handleExcluir,
    getCartaoById,
    resetForm,
  };
}
