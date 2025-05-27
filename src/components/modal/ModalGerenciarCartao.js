import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { loadCartoes, getCartaoById } from '../../hooks/useCartaoManager';
import { getDados, postDados, deleteDados, putDados } from '../../utils/services';
import { setStorageItem, getStorageItem } from '../../utils/util';
import useCartaoManager from '../../hooks/useCartaoManager';

export default function ModalGerenciarCartao({ visible, onClose }) {
  const {
    form, setForm,
    cartoes, setCartoes,
    editId,
    resetForm,
    carregarCartoes,
    handleAddOrEdit,
    handleEditar,
    handleExcluir
  } = useCartaoManager();

  useEffect(() => {

    const loadKeyShare = async () => {
      const key_share = await getStorageItem('@userKeyShareId');
      const user = await getStorageItem('@userId');
      /*console.log('Chave de Organização:', key_share);
      console.log('ID do Usuário:', user);*/

      //setKey(key_share) || '';
      setForm(prevForm => ({
        ...prevForm,
        conta_user: user || '',
        organization: key_share || ''
      }));
      //console.log('Formulário inicial:', form);
    }

    if (visible) {
      loadKeyShare(); // Carrega a chave de organização ao abrir o modal
      carregarCartoes();  // 🔁 Recarrega os cartões ao abrir o modal
    }else{
      setCartoes([]); // Limpa a lista de cartões ao fechar o modal
      resetForm(); // Reseta o formulário ao fechar o modal
    }

  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Gerenciar Cartão</Text>

          <Text style={styles.label}>Nome do Cartão:</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite o nome do cartão"
            value={form.nome}
            onChangeText={text => setForm({ ...form, nome: text })}
          />

          <Text style={styles.label}>Crédito/Débito:</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.tipo_cartao_cartao}
              onValueChange={(value) => setForm({ ...form, tipo_cartao: value })}
              style={styles.picker}
            >
              <Picker.Item label="Selecione" value="selecione" />
              <Picker.Item label="Crédito" value="credito" />
              <Picker.Item label="Débito" value="debito" />
            </Picker>
          </View>


          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>Vencimento:</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite o dia"
                keyboardType="numeric"
                value={form.vencimento}
                onChangeText={text => setForm({ ...form, vencimento: text })}
              />
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Dia Útil:</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite o dia"
                keyboardType="numeric"
                value={form.dia_util}
                onChangeText={text => setForm({ ...form, dia_util: text })}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.btnAdd} onPress={handleAddOrEdit}>
            <Text style={styles.btnText}>{editId ? 'Atualizar Cartão' : 'Adicionar Cartão'}</Text>
          </TouchableOpacity>

          {/* Lista de Cartões */}
          <FlatList
            data={cartoes}
            keyExtractor={item => item.id.toString()}
            style={{ marginTop: 20 }}
            ListHeaderComponent={() => (
              <View style={styles.headerRow}>
                <Text style={styles.headerCol}>Nome</Text>
                <Text style={styles.headerCol}>Venc.</Text>
                <Text style={styles.headerCol}>Dia Útil</Text>
                <Text style={styles.headerCol}>Ações</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View style={styles.itemRow}>
                <Text style={styles.itemCol}>{item.nome}</Text>
                <Text style={styles.itemCol}>{item.vencimento}</Text>
                <Text style={styles.itemCol}>{item.dia_util}</Text>
                <View style={styles.actionsCol}>
                  <TouchableOpacity style={styles.btnEdit} onPress={() => handleEditar(item)}>
                    <Text style={styles.btnActionText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnExcluir} onPress={() => handleExcluir(item.id)}>
                    <Text style={styles.btnActionText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />

          <TouchableOpacity onPress={onClose} style={styles.btnClose}>
            <Text style={styles.btnText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', padding: 20, width: '90%', borderRadius: 8 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  label: { marginTop: 10, fontWeight: '600' },
  input: { color: '#000', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginTop: 4 },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 5,
    overflow: 'hidden',
    width: '100%', // Deixa um pequeno espaço entre os Pickers
  },
  picker: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { flex: 0.48 },
  btnAdd: { backgroundColor: '#28a745', padding: 12, borderRadius: 6, marginTop: 10 },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  headerCol: { flex: 1, fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemCol: { flex: 1 },
  actionsCol: { flexDirection: 'row', gap: 5 },
  btnEdit: { backgroundColor: '#ffc107', padding: 6, borderRadius: 4 },
  btnExcluir: { backgroundColor: '#dc3545', padding: 6, borderRadius: 4 },
  btnActionText: { color: '#fff', fontSize: 12 },
  btnClose: { backgroundColor: '#6c757d', padding: 10, borderRadius: 6, marginTop: 10 }
});
