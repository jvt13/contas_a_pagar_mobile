import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { listarBancos, resolverBancoOutro } from '../../utils/bancos';
import BancoBadge from './BancoBadge';

export default function BancoSelectorGrid({ value, onChange }) {
  const bancos = [...listarBancos(), resolverBancoOutro()];

  return (
    <View style={styles.grid}>
      {bancos.map((banco) => {
        const selecionado = value === banco.slug;
        return (
          <TouchableOpacity
            key={banco.slug}
            style={[styles.item, selecionado && styles.itemSelecionado]}
            onPress={() => onChange?.(banco.slug)}
            accessibilityLabel={`Banco ${banco.nome}`}
            accessibilityState={{ selected: selecionado }}
          >
            <BancoBadge banco={banco} size="md" />
            <Text style={[styles.label, selecionado && styles.labelSelecionado]} numberOfLines={2}>
              {banco.nome}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  item: {
    width: '30%',
    minWidth: 88,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F7F9FC',
  },
  itemSelecionado: {
    borderColor: '#3b5998',
    backgroundColor: '#E9F0FF',
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    color: '#5D6F86',
    textAlign: 'center',
    fontWeight: '600',
  },
  labelSelecionado: {
    color: '#1E4DB7',
    fontWeight: '800',
  },
});
