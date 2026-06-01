import { useState } from 'react';
import { Alert } from 'react-native';
import { getDados, postDados, putDados, deleteDados } from '../utils/services';
import { msgToast } from '../utils/util';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function useCartaoManager() {
  const [form, setForm] = useState({
    nome: '',
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
      if (res.success) {
        setCartoes(res.data);
        //console.log('Cartões carregados:', res.data);
      } else {
        //Alert.alert('Atenção', res.mensagem || 'Erro ao carregar cartões');
        msgToast(res.mensagem || 'Erro ao carregar cartões', 'error');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao conectar com servidor');
    }
  };


  const handleAddOrEdit = async () => {
    if (!form.nome || !form.tipo_cartao || !form.vencimento || !form.dia_util) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos!');
      return;
    }

    try {
      if (editId) {
        await putDados(`/update_cartao/${editId}`, form);
        //Alert.alert('Sucesso', 'Cartão atualizado com sucesso!');
        msgToast('Cartão atualizado com sucesso!');
      } else {
        await postDados('/add_cartao', form);
        //Alert.alert('Sucesso', 'Cartão adicionado com sucesso!');
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
    setForm({
      nome: cartao.nome,
      tipo_cartao: cartao.tipo_cartao,
      vencimento: String(cartao.vencimento),
      dia_util: String(cartao.dia_util),
      limite_credito: cartao.limite_credito != null ? String(cartao.limite_credito) : '',
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
