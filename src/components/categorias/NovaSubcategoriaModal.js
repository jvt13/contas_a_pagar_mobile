import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import AppIcon, { ModalCloseButton } from '../AppIcon';

export default function NovaSubcategoriaModal({
  visible,
  onClose,
  parentId,
  categoriaPai,
  onSalvar,
}) {
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);

  const reset = () => {
    setNome('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'Informe o nome da subcategoria.');
      return;
    }

    setSalvando(true);
    try {
      const nova = await onSalvar(parentId, {
        nome: nome.trim(),
        icone: 'pricetag-outline',
        cor: categoriaPai?.cor,
      });
      reset();
      onClose(nova);
    } catch (error) {
      Alert.alert('Erro', error?.message || 'Não foi possível salvar a subcategoria.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ModalCloseButton onPress={handleClose} style={styles.close} color="#666" />

          <Text style={styles.title}>Nova subcategoria</Text>
          {categoriaPai ? (
            <Text style={styles.subtitle}>Em {categoriaPai.nome}</Text>
          ) : null}

          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex.: Padaria"
            value={nome}
            onChangeText={setNome}
            maxLength={40}
          />

          <View style={styles.preview}>
            <View
              style={[
                styles.previewIcon,
                { backgroundColor: `${categoriaPai?.cor || '#1E4DB7'}22` },
              ]}
            >
              <AppIcon
                name="pricetag-outline"
                size={22}
                color={categoriaPai?.cor || '#1E4DB7'}
              />
            </View>
            <Text style={styles.previewNome}>{nome.trim() || 'Prévia'}</Text>
          </View>

          <TouchableOpacity
            style={[styles.btnSalvar, salvando && styles.btnDisabled]}
            onPress={handleSalvar}
            disabled={salvando}
          >
            <Text style={styles.btnSalvarText}>
              {salvando ? 'Salvando...' : 'Salvar subcategoria'}
            </Text>
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
    marginBottom: 4,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
    fontSize: 14,
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
