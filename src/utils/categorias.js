/**
 * Catálogo e helpers de categorias.
 * O campo conta.categoria continua sendo string (id/slug) — compatível com o backend atual.
 * Subcategorias usam parent_id no catálogo local; conta.subcategoria grava o id/slug da subcategoria.
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

export const SUBCATEGORIAS_PADRAO = [
  // Alimentação
  { id: 'mercado', nome: 'Mercado', parent_id: 'alimentacao', icone: 'cart-outline', cor: '#E67E22' },
  { id: 'restaurante', nome: 'Restaurante', parent_id: 'alimentacao', icone: 'restaurant-outline', cor: '#E67E22' },
  { id: 'delivery', nome: 'Delivery', parent_id: 'alimentacao', icone: 'bicycle-outline', cor: '#E67E22' },
  // Transporte
  { id: 'combustivel', nome: 'Combustível', parent_id: 'transporte', icone: 'water-outline', cor: '#3498DB' },
  { id: 'uber_99', nome: 'Uber/99', parent_id: 'transporte', icone: 'car-outline', cor: '#3498DB' },
  { id: 'pedagio', nome: 'Pedágio', parent_id: 'transporte', icone: 'ticket-outline', cor: '#3498DB' },
  // Casa
  { id: 'aluguel', nome: 'Aluguel', parent_id: 'casa', icone: 'home-outline', cor: '#795548' },
  { id: 'energia', nome: 'Energia', parent_id: 'casa', icone: 'flash-outline', cor: '#795548' },
  { id: 'agua', nome: 'Água', parent_id: 'casa', icone: 'water-outline', cor: '#795548' },
  { id: 'internet', nome: 'Internet', parent_id: 'casa', icone: 'wifi-outline', cor: '#795548' },
  // Saúde
  { id: 'farmacia', nome: 'Farmácia', parent_id: 'saude', icone: 'medkit-outline', cor: '#E53935' },
  { id: 'consulta', nome: 'Consulta', parent_id: 'saude', icone: 'person-outline', cor: '#E53935' },
  { id: 'exames', nome: 'Exames', parent_id: 'saude', icone: 'clipboard-outline', cor: '#E53935' },
  // Lazer
  { id: 'cinema', nome: 'Cinema', parent_id: 'lazer', icone: 'film-outline', cor: '#8E24AA' },
  { id: 'streaming', nome: 'Streaming', parent_id: 'lazer', icone: 'tv-outline', cor: '#8E24AA' },
  { id: 'passeios', nome: 'Passeios', parent_id: 'lazer', icone: 'walk-outline', cor: '#8E24AA' },
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

export const slugifySubcategoria = slugifyCategoria;

export function isCategoriaRaiz(item) {
  return item && !item.parent_id;
}

export function filtrarCategoriasRaiz(lista = []) {
  return lista.filter(isCategoriaRaiz);
}

export function mesclarCategorias(padrao = CATEGORIAS_PADRAO, custom = []) {
  const map = new Map();

  padrao.forEach((item) => map.set(item.id, { ...item }));
  custom.filter(isCategoriaRaiz).forEach((item) => {
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

export function mesclarSubcategorias(
  padrao = SUBCATEGORIAS_PADRAO,
  custom = [],
  parentId
) {
  if (!parentId) {
    return [];
  }

  const map = new Map();
  const parentStr = String(parentId);

  padrao
    .filter((item) => String(item.parent_id) === parentStr)
    .forEach((item) => map.set(item.id, { ...item }));

  custom
    .filter((item) => item?.id && String(item.parent_id) === parentStr)
    .forEach((item) => map.set(item.id, { ...item, custom: true }));

  return Array.from(map.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR')
  );
}

export function resolverCategoria(categoriaId, lista = []) {
  if (!categoriaId) {
    return null;
  }

  const id = String(categoriaId);
  const found = lista.find((c) => c.id === id && isCategoriaRaiz(c));
  if (found) {
    return found;
  }

  const foundAny = lista.find((c) => c.id === id);
  if (foundAny && isCategoriaRaiz(foundAny)) {
    return foundAny;
  }

  return {
    id,
    nome: formatarCategoriaLegado(id),
    icone: 'pricetag-outline',
    cor: '#6B7280',
    desconhecida: true,
  };
}

export function resolverSubcategoria(subcategoriaId, parentId, subcategorias = []) {
  if (!subcategoriaId || !parentId) {
    return null;
  }

  const id = String(subcategoriaId);
  const found = subcategorias.find((s) => s.id === id);
  if (found) {
    return found;
  }

  return {
    id,
    parent_id: String(parentId),
    nome: id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' '),
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

export function formatarLabelSubcategoria(subcategoriaId, parentId, subcategorias = []) {
  if (!subcategoriaId) {
    return '';
  }
  return resolverSubcategoria(subcategoriaId, parentId, subcategorias)?.nome || subcategoriaId;
}

export function formatarLabelCategoriaCompleta(
  categoriaId,
  subcategoriaId,
  categorias = [],
  subcategorias = []
) {
  const catNome = formatarLabelCategoria(categoriaId, categorias);
  if (!subcategoriaId) {
    return catNome;
  }
  const subNome = formatarLabelSubcategoria(subcategoriaId, categoriaId, subcategorias);
  return subNome ? `${catNome} › ${subNome}` : catNome;
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

export function filtrarSubcategorias(lista, termo) {
  return filtrarCategorias(lista, termo);
}
