import { Platform, ToastAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const formatarDataBR = (dataISO) => {
  if (!dataISO || typeof dataISO !== 'string' || !dataISO.includes('-')) {
    return dataISO || '';
  }

  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
};

/**
 * @deprecated Preferir calcularVencimentoPorCartao (competenciaCartao.js).
 * Mantido para débito / fallback sem objeto cartão.
 */
export const montarDataVencimentoConta = (diaVencimento, mesIndex0, ano) => {
  const dia = parseInt(String(diaVencimento), 10);
  const mesIndex = parseInt(String(mesIndex0), 10);
  const year = parseInt(String(ano), 10);

  if (
    Number.isNaN(dia) ||
    Number.isNaN(mesIndex) ||
    Number.isNaN(year) ||
    dia < 1 ||
    dia > 31 ||
    mesIndex < 0 ||
    mesIndex > 11
  ) {
    return null;
  }

  const date = new Date(year, mesIndex, dia);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== mesIndex ||
    date.getDate() !== dia
  ) {
    return null;
  }

  const diaStr = String(dia).padStart(2, '0');
  const mesStr = String(mesIndex + 1).padStart(2, '0');
  return `${diaStr}/${mesStr}/${year}`;
};

export const validarVencimentoConta = (vencimento) => {
  const texto = String(vencimento || '').trim();
  return /^\d{2}\/\d{2}\/\d{4}$/.test(texto);
};

export const normalizarVencimentoParaApi = (vencimento, mesIndex0, ano) => {
  const texto = String(vencimento ?? '').trim();

  if (validarVencimentoConta(texto)) {
    return texto;
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    return formatarDataBR(texto.slice(0, 10));
  }

  if (/^\d{1,2}$/.test(texto)) {
    return montarDataVencimentoConta(texto, mesIndex0, ano);
  }

  return null;
};

export const aplicarMascaraValor = (texto) => {
  const somenteNumeros = String(texto || '').replace(/\D/g, '');
  const valor = (parseInt(somenteNumeros || '0', 10) / 100).toFixed(2);

  return `R$ ${valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

export const formatarMoeda = (text) => {
  let onlyNumbers = String(text || '').replace(/\D/g, '');
  let number = parseInt(onlyNumbers, 10);

  if (isNaN(number)) number = 0;

  const backendValue = (number / 100).toFixed(2);

  let formatted = backendValue
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return {
    display: `R$${formatted}`,
    backend: backendValue,
  };
};

export const formatCurrency = (value) => {
  const numericValue = Number(value) || 0;
  return `R$ ${numericValue.toFixed(2).replace('.', ',')}`;
};

export const sanitizeEmail = (email) => String(email || '').trim().toLowerCase();

export const buildQueryParams = (params = {}) =>
  new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = String(value);
      }

      return acc;
    }, {})
  ).toString();

export const salvarItemStorage = async (key, value) => {
  if (value === undefined || value === null || value === '') {
    await AsyncStorage.removeItem(key);
    return;
  }

  await AsyncStorage.setItem(key, String(value));
};

export const obterMensagemErro = (error, fallback = 'Ocorreu um erro inesperado.') => {
  if (error?.apiMessage) {
    return error.apiMessage;
  }

  if (error?.message) {
    return error.message;
  }

  return fallback;
};

export const formatarErroApi = (error, contexto = 'Operação') => {
  const partes = [error?.apiMessage || error?.message || 'Erro desconhecido'];

  if (__DEV__) {
    if (error?.status) partes.push(`HTTP ${error.status}`);
    if (error?.path) partes.push(error.path);
    if (error?.method) partes.push(error.method);
  }

  return `${contexto}: ${partes.filter(Boolean).join(' | ')}`;
};

export const msgToast = (msg) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('Aviso', msg);
  }
};

export const mesesOptions = [
  { label: 'Janeiro', value: '0' },
  { label: 'Fevereiro', value: '1' },
  { label: 'Março', value: '2' },
  { label: 'Abril', value: '3' },
  { label: 'Maio', value: '4' },
  { label: 'Junho', value: '5' },
  { label: 'Julho', value: '6' },
  { label: 'Agosto', value: '7' },
  { label: 'Setembro', value: '8' },
  { label: 'Outubro', value: '9' },
  { label: 'Novembro', value: '10' },
  { label: 'Dezembro', value: '11' },
];
