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
  return `R$ ${valor.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};
