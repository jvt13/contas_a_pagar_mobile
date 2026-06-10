import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import AppIcon, { ModalCloseButton } from '../AppIcon';
import { filtrarSubcategorias } from '../../utils/categorias';
import NovaSubcategoriaModal from './NovaSubcategoriaModal';

function SubcategoryItem({ item, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.item, selected && styles.itemSelected]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={[styles.itemIconWrap, { backgroundColor: `${item.cor || '#1E4DB7'}22` }]}>
        <AppIcon name={item.icone || 'pricetag-outline'} size={20} color={item.cor || '#1E4DB7'} />
      </View>
      <Text style={[styles.itemNome, selected && styles.itemNomeSelected]} numberOfLines={2}>
        {item.nome}
      </Text>
      {selected ? (
        <View style={styles.checkWrap}>
          <AppIcon name="check" size={14} color="#fff" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function SubcategoryPickerModal({
  visible,
  onClose,
  parentId,
  categoriaPai,
  subcategorias = [],
  value,
  onSelect,
  onCriarSubcategoria,
}) {
  const [busca, setBusca] = useState('');
  const [novaVisible, setNovaVisible] = useState(false);

  const listaFiltrada = useMemo(
    () => filtrarSubcategorias(subcategorias, busca),
    [subcategorias, busca]
  );

  const handleClose = () => {
    setBusca('');
    onClose();
  };

  const handleSelect = (item) => {
    onSelect(item?.id || '');
    handleClose();
  };

  const handleClear = () => {
    onSelect('');
    handleClose();
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Subcategoria</Text>
              <ModalCloseButton onPress={handleClose} color="#666" />
            </View>

            {categoriaPai ? (
              <Text style={styles.subtitle}>Em {categoriaPai.nome}</Text>
            ) : null}

            <TextInput
              style={styles.search}
              placeholder="Pesquisar subcategoria"
              placeholderTextColor="#999"
              value={busca}
              onChangeText={setBusca}
              clearButtonMode="while-editing"
            />

            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <AppIcon name="close-circle-outline" size={18} color="#666" />
              <Text style={styles.clearBtnText}>Sem subcategoria</Text>
            </TouchableOpacity>

            <FlatList
              data={listaFiltrada}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.empty}>Nenhuma subcategoria encontrada.</Text>
              }
              renderItem={({ item }) => (
                <SubcategoryItem
                  item={item}
                  selected={String(value) === String(item.id)}
                  onPress={handleSelect}
                />
              )}
            />

            <TouchableOpacity style={styles.novaBtn} onPress={() => setNovaVisible(true)}>
              <AppIcon name="plus" size={20} color="#1E4DB7" />
              <Text style={styles.novaBtnText}>Nova subcategoria</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <NovaSubcategoriaModal
        visible={novaVisible}
        parentId={parentId}
        categoriaPai={categoriaPai}
        onClose={(nova) => {
          setNovaVisible(false);
          if (nova?.id) {
            onSelect(nova.id);
            handleClose();
          }
        }}
        onSalvar={onCriarSubcategoria}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
    marginTop: 8,
  },
  search: {
    margin: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingVertical: 8,
    gap: 6,
  },
  clearBtnText: {
    color: '#666',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fafafa',
    marginBottom: 8,
    minHeight: 52,
  },
  itemSelected: {
    borderColor: '#1E4DB7',
    backgroundColor: '#eef3fc',
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemNome: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  itemNomeSelected: {
    color: '#1E4DB7',
    fontWeight: '700',
  },
  checkWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1E4DB7',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  empty: {
    textAlign: 'center',
    color: '#888',
    padding: 24,
  },
  novaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    marginTop: 4,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E4DB7',
    borderStyle: 'dashed',
    gap: 8,
  },
  novaBtnText: {
    color: '#1E4DB7',
    fontWeight: '700',
    fontSize: 15,
  },
});
