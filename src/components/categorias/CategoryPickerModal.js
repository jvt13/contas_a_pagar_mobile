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
import { filtrarCategorias } from '../../utils/categorias';
import NovaCategoriaModal from './NovaCategoriaModal';

function CategoryItem({ item, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.item, selected && styles.itemSelected]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={[styles.itemIconWrap, { backgroundColor: `${item.cor || '#1E4DB7'}22` }]}>
        <AppIcon name={item.icone || 'pricetag-outline'} size={22} color={item.cor || '#1E4DB7'} />
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

export default function CategoryPickerModal({
  visible,
  onClose,
  categorias = [],
  value,
  onSelect,
  onCriarCategoria,
}) {
  const [busca, setBusca] = useState('');
  const [novaVisible, setNovaVisible] = useState(false);

  const listaFiltrada = useMemo(
    () => filtrarCategorias(categorias, busca),
    [categorias, busca]
  );

  const handleClose = () => {
    setBusca('');
    onClose();
  };

  const handleSelect = (item) => {
    onSelect(item.id);
    handleClose();
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Categoria</Text>
              <ModalCloseButton onPress={handleClose} color="#666" />
            </View>

            <TextInput
              style={styles.search}
              placeholder="Pesquisar categoria"
              placeholderTextColor="#999"
              value={busca}
              onChangeText={setBusca}
              clearButtonMode="while-editing"
            />

            <FlatList
              data={listaFiltrada}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.row}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.empty}>Nenhuma categoria encontrada.</Text>
              }
              renderItem={({ item }) => (
                <CategoryItem
                  item={item}
                  selected={String(value) === String(item.id)}
                  onPress={handleSelect}
                />
              )}
            />

            <TouchableOpacity style={styles.novaBtn} onPress={() => setNovaVisible(true)}>
              <AppIcon name="plus" size={20} color="#1E4DB7" />
              <Text style={styles.novaBtnText}>Nova categoria</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <NovaCategoriaModal
        visible={novaVisible}
        onClose={(nova) => {
          setNovaVisible(false);
          if (nova?.id) {
            onSelect(nova.id);
            handleClose();
          }
        }}
        onSalvar={onCriarCategoria}
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
  search: {
    margin: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  item: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fafafa',
    minHeight: 56,
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
    marginRight: 8,
  },
  itemNome: {
    flex: 1,
    fontSize: 13,
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
