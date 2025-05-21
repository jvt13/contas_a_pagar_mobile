import { Platform, ToastAndroid, Alert } from "react-native";
const crypto = require('crypto');

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
}

export function encrypt(key, data) {
    var cipher = crypto.createCipher('aes-256-cbc', key);
    var crypted = cipher.update(data, 'utf-8', 'hex');
    crypted += cipher.final('hex');

    console.log("Criptografia concluida!");
    return crypted;
}

export function decrypt(key, data) {
    var decipher = crypto.createDecipher('aes-256-cbc', key);
    var decrypted = decipher.update(data, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');

    console.log("Descriptografia concluida!");
    return decrypted;
}