import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import AppIcon, { ModalCloseButton } from '../AppIcon';
import { CORES_CATEGORIA, ICONES_CATEGORIA } from '../../utils/categorias';

export default function NovaCategoriaModal({ visible, onClose, onSalvar }) {
  const [nome, setNome] = useState('');
  const [icone, setIcone] = useState('pricetag-outline');
  const [cor, setCor] = useState(CORES_CATEGORIA[0]);
  const [salvando, setSalvando] = useState(false);

  const reset = () => {
    setNome('');
    setIcone('pricetag-outline');
    setCor(CORES_CATEGORIA[0]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Informe o nome da categoria.');
      return;
    }

    setSalvando(true);
    try {
      const nova = await onSalvar({ nome: nome.trim(), icone, cor });
      reset();
      onClose(nova);
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível salvar a categoria.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ModalCloseButton onPress={handleClose} style={styles.close} color="#666" />

          <Text style={styles.title}>Nova categoria</Text>

          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Mercado"
            value={nome}
            onChangeText={setNome}
            maxLength={40}
          />

          <Text style={styles.label}>Ícone</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconRow}>
            {ICONES_CATEGORIA.map((item) => {
              const selected = icone === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.iconChip, selected && styles.iconChipSelected]}
                  onPress={() => setIcone(item.id)}
                  accessibilityLabel={item.label}
                >
                  <AppIcon name={item.id} size={22} color={selected ? '#fff' : cor} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Cor (opcional)</Text>
          <View style={styles.coresRow}>
            {CORES_CATEGORIA.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.corDot,
                  { backgroundColor: c },
                  cor === c && styles.corDotSelected,
                ]}
                onPress={() => setCor(c)}
              />
            ))}
          </View>

          <View style={styles.preview}>
            <View style={[styles.previewIcon, { backgroundColor: `${cor}22` }]}>
              <AppIcon name={icone} size={24} color={cor} />
            </View>
            <Text style={styles.previewNome}>{nome.trim() || 'Prévia'}</Text>
          </View>

          <TouchableOpacity
            style={[styles.btnSalvar, salvando && styles.btnDisabled]}
            onPress={handleSalvar}
            disabled={salvando}
          >
            <Text style={styles.btnSalvarText}>{salvando ? 'Salvando...' : 'Salvar categoria'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
  },
  close: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
    color: '#444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 14,
    color: '#333',
  },
  iconRow: {
    marginBottom: 14,
    maxHeight: 52,
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#fafafa',
  },
  iconChipSelected: {
    backgroundColor: '#1E4DB7',
    borderColor: '#1E4DB7',
  },
  coresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  corDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  corDotSelected: {
    borderColor: '#333',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f7fa',
    borderRadius: 8,
    marginBottom: 16,
  },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  previewNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  btnSalvar: {
    backgroundColor: '#28a745',
    padding: 14,
    borderRadius: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  btnSalvarText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
  },
});
