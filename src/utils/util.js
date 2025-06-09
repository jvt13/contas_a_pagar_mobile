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

export const mesesOptions = [
  { label: "Selecione um mês", value: "" },
  { label: "Janeiro", value: "0" },
  { label: "Fevereiro", value: "1" },
  { label: "Março", value: "2" },
  { label: "Abril", value: "3" },
  { label: "Maio", value: "4" },
  { label: "Junho", value: "5" },
  { label: "Julho", value: "6" },
  { label: "Agosto", value: "7" },
  { label: "Setembro", value: "8" },
  { label: "Outubro", value: "9" },
  { label: "Novembro", value: "10" },
  { label: "Dezembro", value: "11" }
];