import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppIcon from '../AppIcon';
import {
  formatarLabelCategoria,
  formatarLabelCategoriaCompleta,
  resolverCategoria,
  resolverSubcategoria,
} from '../../utils/categorias';

/**
 * Exibe ícone + nome da categoria (e subcategoria, se houver) a partir dos ids gravados na conta.
 * Passe `categorias` da lista mesclada (useCategorias) em listas longas.
 */
export default function CategoriaLabel({
  categoriaId,
  subcategoriaId,
  categorias,
  subcategorias,
  style,
  textStyle,
  showIcon = true,
}) {
  const cat = categorias ? resolverCategoria(categoriaId, categorias) : null;
  const sub =
    subcategoriaId && categoriaId
      ? subcategorias
        ? resolverSubcategoria(subcategoriaId, categoriaId, subcategorias)
        : resolverSubcategoria(subcategoriaId, categoriaId, [])
      : null;

  const nomeCompleto = subcategorias
    ? formatarLabelCategoriaCompleta(categoriaId, subcategoriaId, categorias || [], subcategorias)
    : subcategoriaId && sub
      ? `${cat?.nome || formatarLabelCategoria(categoriaId, categorias || [])} › ${sub.nome}`
      : cat?.nome || formatarLabelCategoria(categoriaId, categorias || []);

  if (!categoriaId) {
    return (
      <Text style={[styles.text, textStyle, style]} numberOfLines={1}>
        Sem categoria
      </Text>
    );
  }

  if (!showIcon || !cat) {
    return (
      <Text style={[styles.text, textStyle, style]} numberOfLines={1}>
        {nomeCompleto}
      </Text>
    );
  }

  return (
    <View style={[styles.row, style]}>
      <View style={[styles.iconWrap, { backgroundColor: `${cat.cor || '#6B7280'}18` }]}>
        <AppIcon name={cat.icone || 'pricetag-outline'} size={14} color={cat.cor || '#6B7280'} />
      </View>
      <Text style={[styles.text, textStyle]} numberOfLines={1}>
        {nomeCompleto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  text: {
    color: '#333',
    flexShrink: 1,
  },
});
