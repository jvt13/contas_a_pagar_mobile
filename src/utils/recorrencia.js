export const OPCOES_RECORRENCIA = [3, 6, 12, 24];

export function isCategoriaFixa(categoriaId) {
  return String(categoriaId || '').trim().toLowerCase() === 'fixa';
}
