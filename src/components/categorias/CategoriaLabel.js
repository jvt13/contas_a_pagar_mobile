import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppIcon from '../AppIcon';
import { formatarLabelCategoria, resolverCategoria } from '../../utils/categorias';

/**
 * Exibe ícone + nome da categoria a partir do id gravado na conta.
 * Passe `categorias` da lista mesclada (useCategorias) em listas longas.
 */
export default function CategoriaLabel({
  categoriaId,
  categorias,
  style,
  textStyle,
  showIcon = true,
}) {
  const cat = categorias ? resolverCategoria(categoriaId, categorias) : null;
  const nome = cat?.nome || formatarLabelCategoria(categoriaId, categorias || []);

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
        {nome}
      </Text>
    );
  }

  return (
    <View style={[styles.row, style]}>
      <View style={[styles.iconWrap, { backgroundColor: `${cat.cor || '#6B7280'}18` }]}>
        <AppIcon name={cat.icone || 'pricetag-outline'} size={14} color={cat.cor || '#6B7280'} />
      </View>
      <Text style={[styles.text, textStyle]} numberOfLines={1}>
        {nome}
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
