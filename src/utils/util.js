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

