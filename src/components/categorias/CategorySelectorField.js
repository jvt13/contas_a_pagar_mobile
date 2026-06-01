import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppIcon from '../AppIcon';
import CategoryPickerModal from './CategoryPickerModal';
import useCategorias from '../../hooks/useCategorias';

export default function CategorySelectorField({ value, onChange, label = 'Categoria:' }) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const { categorias, criarCategoria, getCategoria } = useCategorias();

  const selecionada = getCategoria(value);

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.field, value && styles.fieldSelected]}
        onPress={() => setPickerVisible(true)}
        accessibilityRole="button"
      >
        {selecionada ? (
          <>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: `${selecionada.cor || '#1E4DB7'}22` },
              ]}
            >
              <AppIcon
                name={selecionada.icone || 'pricetag-outline'}
                size={20}
                color={selecionada.cor || '#1E4DB7'}
              />
            </View>
            <Text style={styles.fieldText} numberOfLines={1}>
              {selecionada.nome}
            </Text>
          </>
        ) : (
          <Text style={styles.placeholder}>Selecione a categoria</Text>
        )}
        <AppIcon name="chevron-down-outline" size={18} color="#888" />
      </TouchableOpacity>

      <CategoryPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        categorias={categorias}
        value={value}
        onSelect={onChange}
        onCriarCategoria={criarCategoria}
      />
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: '600',
    marginBottom: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  fieldSelected: {
    borderColor: '#1E4DB7',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  fieldText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    flex: 1,
    fontSize: 15,
    color: '#999',
  },
});
