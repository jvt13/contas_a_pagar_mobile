import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getDados, postDados, deleteDados, putDados } from '../../utils/services';

export default function ModalGerenciarCartao({ visible, onClose }) {
  const [form, setForm] = useState({
    nome: '',
    tipo_cartao: '',
    vencimento: '',
    dia_util: ''
  });

  const [cartoes, setCartoes] = useState([]);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    if (visible) {
      carregarCartoes();
    }
  }, [visible]);

  const carregarCartoes = async () => {
    try {
      const res = await getDados('/get_cartoes');
      if (res.sucess) {
        setCartoes(res.data);
      } else {
        Alert.alert('Erro', 'Erro ao carregar cartões');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha ao conectar com servidor');
    }
  };

  const handleAddOrEdit = async () => {
    if (!form.nome || !form.tipo_cartao || !form.vencimento || !form.dia_util) {
      Alert.alert('Campos obrigatórios', 'Preencha todos os campos!');
      return;
    }

    try {
      if (editId) {
        await putDados(`/update_cartao/${editId}`, form);
        Alert.alert('Sucesso', 'Cartão atualizado com sucesso!');
      } else {
        console.log(form); 
        await postDados('/add_cartao', form);
        Alert.alert('Sucesso', 'Cartão adicionado com sucesso!');
      }
      setForm({ nome: '', tipo_cartao: '', vencimento: '', dia_util: '' });
      setEditId(null);
      carregarCartoes();
    } catch (error) {
      Alert.alert('Erro', 'Erro ao salvar cartão');
    }
  };

  const handleEditar = (cartao) => {
    setForm({
      nome: cartao.nome,
      tipo_cartao: cartao.tipo_cartao,
      vencimento: String(cartao.vencimento),
      dia_util: String(cartao.dia_util)
    });
    setEditId(cartao.id);
  };

  const handleExcluir = async (id) => {
    try {
      await deleteDados(`/delete_cartao/${id}`);
      Alert.alert('Sucesso', 'Cartão excluído com sucesso!');
      carregarCartoes();
    } catch (error) {
      Alert.alert('Erro', 'Erro ao excluir cartão');
    }
  };

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
          <Picker
            selectedValue={form.tipo_cartao_cartao}
            onValueChange={(value) => setForm({ ...form, tipo_cartao: value })}
            style={styles.picker}
          >
            <Picker.Item label="Selecione" value="" />
            <Picker.Item label="Crédito" value="credito" />
            <Picker.Item label="Débito" value="debito" />
          </Picker>

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
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginTop: 4 },
  picker: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, marginTop: 4 },
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
