// src/hooks/useCartoes.js
import { useState, useEffect } from 'react';
import { getDados } from '../utils/services';
import { Alert } from 'react-native';

export default function useCartoes() {
  const [cartoes, setCartoes] = useState([]);

  const loadCartoes = async () => {
    try {
      const res = await getDados('/get_cartoes');
      if (res.sucess && Array.isArray(res.data)) {
        setCartoes(res.data);
      } else {
        Alert.alert('Erro', res.message || 'Erro ao carregar cartões');
      }
    } catch (err) {
      Alert.alert('Erro', 'Falha ao conectar com o servidor');
    }
  };

  const getCartaoById = async (id) => {
    try {
      const res = await getDados('/get_cartao_id/' + id);
      if (res.success) return res.data;
      else return null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    loadCartoes(); // carrega ao abrir o app
  }, []);

  return { cartoes, loadCartoes, getCartaoById };
}
