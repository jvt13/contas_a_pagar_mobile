/**
 * Catálogo e helpers de categorias.
 * O campo conta.categoria continua sendo string (id/slug) — compatível com o backend atual.
 */

export const CORES_CATEGORIA = [
  '#1E4DB7',
  '#28A745',
  '#E67E22',
  '#9C27B0',
  '#E53935',
  '#00897B',
  '#5C6BC0',
  '#795548',
  '#607D8B',
  '#F59E0B',
];

/** Ícones Ionicons disponíveis ao criar categoria (sem emojis). */
export const ICONES_CATEGORIA = [
  { id: 'restaurant-outline', label: 'Alimentação' },
  { id: 'car-outline', label: 'Transporte' },
  { id: 'home-outline', label: 'Casa' },
  { id: 'school-outline', label: 'Educação' },
  { id: 'medkit-outline', label: 'Saúde' },
  { id: 'airplane-outline', label: 'Viagem' },
  { id: 'cart-outline', label: 'Compras' },
  { id: 'construct-outline', label: 'Serviços' },
  { id: 'business-outline', label: 'Bancário' },
  { id: 'phone-portrait-outline', label: 'Assinaturas' },
  { id: 'game-controller-outline', label: 'Lazer' },
  { id: 'briefcase-outline', label: 'Trabalho' },
  { id: 'paw-outline', label: 'Pets' },
  { id: 'gift-outline', label: 'Presentes' },
  { id: 'book-outline', label: 'Cursos' },
  { id: 'flash-outline', label: 'Contas' },
  { id: 'shirt-outline', label: 'Vestuário' },
  { id: 'fitness-outline', label: 'Esportes' },
];

export const CATEGORIAS_PADRAO = [
  { id: 'alimentacao', nome: 'Alimentação', icone: 'restaurant-outline', cor: '#E67E22' },
  { id: 'transporte', nome: 'Transporte', icone: 'car-outline', cor: '#3498DB' },
  { id: 'casa', nome: 'Casa', icone: 'home-outline', cor: '#795548' },
  { id: 'educacao', nome: 'Educação', icone: 'school-outline', cor: '#5C6BC0' },
  { id: 'saude', nome: 'Saúde', icone: 'medkit-outline', cor: '#E53935' },
  { id: 'viagem', nome: 'Viagem', icone: 'airplane-outline', cor: '#00897B' },
  { id: 'supermercado', nome: 'Supermercado', icone: 'cart-outline', cor: '#F59E0B' },
  { id: 'servicos', nome: 'Serviços', icone: 'construct-outline', cor: '#607D8B' },
  { id: 'bancario', nome: 'Bancário', icone: 'business-outline', cor: '#1E4DB7' },
  { id: 'assinaturas', nome: 'Assinaturas', icone: 'phone-portrait-outline', cor: '#9C27B0' },
  { id: 'lazer', nome: 'Lazer', icone: 'game-controller-outline', cor: '#8E24AA' },
  { id: 'trabalho', nome: 'Trabalho', icone: 'briefcase-outline', cor: '#455A64' },
  { id: 'pets', nome: 'Pets', icone: 'paw-outline', cor: '#A1887F' },
  { id: 'presentes', nome: 'Presentes', icone: 'gift-outline', cor: '#EC407A' },
  { id: 'cursos', nome: 'Cursos', icone: 'book-outline', cor: '#3949AB' },
  // Legado — contas já cadastradas com estes valores
  { id: 'fixa', nome: 'Despesa fixa', icone: 'repeat-outline', cor: '#6B7280', legado: true },
  { id: 'variavel', nome: 'Despesa variável', icone: 'pulse-outline', cor: '#6B7280', legado: true },
  { id: 'renda', nome: 'Renda', icone: 'trending-up-outline', cor: '#28A745', legado: true },
];

export function slugifyCategoria(nome) {
  return String(nome || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}

export function mesclarCategorias(padrao = CATEGORIAS_PADRAO, custom = []) {
  const map = new Map();

  padrao.forEach((item) => map.set(item.id, { ...item }));
  custom.forEach((item) => {
    if (item?.id) {
      map.set(item.id, { ...item, custom: true });
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    if (a.legado && !b.legado) return 1;
    if (!a.legado && b.legado) return -1;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

export function resolverCategoria(categoriaId, lista = []) {
  if (!categoriaId) {
    return null;
  }

  const id = String(categoriaId);
  const found = lista.find((c) => c.id === id);
  if (found) {
    return found;
  }

  return {
    id,
    nome: formatarCategoriaLegado(id),
    icone: 'pricetag-outline',
    cor: '#6B7280',
    desconhecida: true,
  };
}

export function formatarCategoriaLegado(id) {
  const map = {
    fixa: 'Despesa fixa',
    variavel: 'Despesa variável',
    renda: 'Renda',
  };
  return map[id] || id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' ');
}

export function formatarLabelCategoria(categoriaId, lista = []) {
  return resolverCategoria(categoriaId, lista)?.nome || 'Sem categoria';
}

export function filtrarCategorias(lista, termo) {
  const q = String(termo || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (!q) {
    return lista;
  }

  return lista.filter((c) => {
    const nome = String(c.nome || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return nome.includes(q) || String(c.id).includes(q);
  });
}
