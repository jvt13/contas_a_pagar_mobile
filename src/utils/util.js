import { Platform, ToastAndroid, Alert } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

export const formatarDataBR = (dataISO) => {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
};

export const aplicarMascaraValor = (texto) => {
  // Remove tudo que não for dígito
  const somenteNumeros = texto.replace(/\D/g, '');

  // Converte para número decimal (centavos)
  const valor = (parseInt(somenteNumeros || '0', 10) / 100).toFixed(2);

  // Retorna formatado com separador BR
  return `R$ ${valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

export const formatarMoeda = (text) => {
  let onlyNumbers = text.replace(/\D/g, '');
  let number = parseInt(onlyNumbers, 10);

  if (isNaN(number)) number = 0;

  const backendValue = (number / 100).toFixed(2);

  let formatted = backendValue
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return {
    display: 'R$' + formatted,
    backend: backendValue,
  };
};

export const msgToast = (msg) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    // Em iOS, como ToastAndroid não existe, você pode adaptar com Alert
    Alert.alert('Aviso', msg);
  }
};


/**
 * Salva um valor no AsyncStorage
 * @param {string} chave - A chave para o item
 * @param {any} valor - O valor a ser salvo (string ou será convertido para string)
 */
export async function setStorageItem(chave, valor) {
  try {
    await AsyncStorage.setItem(chave, String(valor));
  } catch (error) {
    console.error(`Erro ao salvar item no AsyncStorage [${chave}]:`, error);
  }
}

/**
 * Recupera um valor do AsyncStorage
 * @param {string} chave - A chave do item a recuperar
 * @returns {Promise<string|null>} O valor armazenado ou null se não existir
 */
export async function getStorageItem(chave) {
  try {
    return await AsyncStorage.getItem(chave);
  } catch (error) {
    console.error(`Erro ao recuperar item do AsyncStorage [${chave}]:`, error);
    return null;
  }
}

/**
 * Remove um item do AsyncStorage
 * @param {string} chave - A chave do item a ser removido
 */
export async function removeStorageItem(chave) {
  try {
    await AsyncStorage.removeItem(chave);
  } catch (error) {
    console.error(`Erro ao remover item do AsyncStorage [${chave}]:`, error);
  }
}

export async function removeAllStorageItems() {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Erro ao limpar AsyncStorage:', error);
  }
}