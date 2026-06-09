import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useCartaoManager from '../../hooks/useCartaoManager';
import { STORAGE_KEYS } from '../../utils/authSession';
import { formatarNomeCartao } from '../../utils/cartao';
import { isCartaoDebito } from '../../utils/tipoCartao';
import { ModalCloseButton } from '../AppIcon';
import BancoSelectorGrid from '../bancos/BancoSelectorGrid';
import BancoBadge from '../bancos/BancoBadge';

export default function ModalGerenciarCartao({ visible, onClose }) {
  const {
    form,
    setForm,
    cartoes,
    setCartoes,
    editId,
    resetForm,
    carregarCartoes,
    handleAddOrEdit,
    handleEditar,
    handleExcluir,
  } = useCartaoManager();

  useEffect(() => {
    const loadKeyShare = async () => {
      const key_share = await AsyncStorage.getItem(STORAGE_KEYS.userKeyShareId);
      const user = await AsyncStorage.getItem(STORAGE_KEYS.userId);

      setForm((prevForm) => ({
        ...prevForm,
        conta_user: user || '',
        organization: key_share || '',
      }));
    };

    if (visible) {
      loadKeyShare();
      carregarCartoes();
    } else {
      setCartoes([]);
      resetForm();
    }
  }, [visible]);

  const ehCredito = form.tipo_cartao === 'credito';
  const ehDebito = form.tipo_cartao === 'debito';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ModalCloseButton onPress={onClose} style={styles.fechar} color="#333" />
          <Text style={styles.title}>Gerenciar Cartão</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            <Text style={styles.label}>Banco emissor:</Text>
            <BancoSelectorGrid
              value={form.banco_slug}
              onChange={(slug) => setForm({ ...form, banco_slug: slug })}
            />

            <Text style={styles.label}>Apelido do cartão (opcional):</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: Roxinho, Conta conjunta..."
              value={form.nome}
              onChangeText={(text) => setForm({ ...form, nome: text })}
            />

            <Text style={styles.label}>Tipo do cartão:</Text>
            <View style={styles.tipoRow}>
              <TouchableOpacity
                style={[styles.tipoChip, form.tipo_cartao === 'credito' && styles.tipoChipAtivo]}
                onPress={() => setForm({ ...form, tipo_cartao: 'credito' })}
              >
                <Text
                  style={[
                    styles.tipoChipText,
                    form.tipo_cartao === 'credito' && styles.tipoChipTextAtivo,
                  ]}
                >
                  Crédito
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tipoChip, form.tipo_cartao === 'debito' && styles.tipoChipAtivo]}
                onPress={() =>
                  setForm({
                    ...form,
                    tipo_cartao: 'debito',
                    limite_credito: '',
                    vencimento: '1',
                    dia_util: '1',
                  })
                }
              >
                <Text
                  style={[
                    styles.tipoChipText,
                    form.tipo_cartao === 'debito' && styles.tipoChipTextAtivo,
                  ]}
                >
                  Débito
                </Text>
              </TouchableOpacity>
            </View>

            {ehCredito ? (
              <>
                <View style={styles.row}>
                  <View style={styles.column}>
                    <Text style={styles.label}>Dia de vencimento:</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex.: 15"
                      keyboardType="numeric"
                      value={form.vencimento}
                      onChangeText={(text) => setForm({ ...form, vencimento: text })}
                    />
                  </View>
                  <View style={styles.column}>
                    <Text style={styles.label}>Dia de fechamento:</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex.: 7"
                      keyboardType="numeric"
                      value={form.dia_util}
                      onChangeText={(text) => setForm({ ...form, dia_util: text })}
                    />
                  </View>
                </View>

                <Text style={styles.label}>Limite de crédito (R$):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex.: 5000"
                  keyboardType="numeric"
                  value={form.limite_credito}
                  onChangeText={(text) => setForm({ ...form, limite_credito: text })}
                />
              </>
            ) : null}

            {ehDebito ? (
              <Text style={styles.hintDebito}>
                Cartão débito: limite, fechamento e vencimento de fatura não se aplicam. Despesas
                são lançadas como pagas na data da compra.
              </Text>
            ) : null}

            <TouchableOpacity style={styles.btnAdd} onPress={handleAddOrEdit}>
              <Text style={styles.btnText}>{editId ? 'Atualizar Cartão' : 'Adicionar Cartão'}</Text>
            </TouchableOpacity>

            <FlatList
              data={cartoes}
              keyExtractor={(item) => item.id.toString()}
              style={{ marginTop: 20, maxHeight: 220 }}
              scrollEnabled={false}
              ListHeaderComponent={() => (
                <View style={styles.headerRow}>
                  <Text style={[styles.headerCol, styles.colBanco]}>Banco</Text>
                  <Text style={styles.headerCol}>Cartão</Text>
                  <Text style={styles.headerCol}>Venc.</Text>
                  <Text style={styles.headerCol}>Ações</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <View style={styles.itemRow}>
                  <View style={styles.colBanco}>
                    <BancoBadge cartao={item} size="sm" />
                  </View>
                  <Text style={styles.itemCol} numberOfLines={2}>
                    {formatarNomeCartao(item)}
                  </Text>
                  <Text style={styles.itemCol}>{item.vencimento}</Text>
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
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={styles.btnClose}>
            <Text style={styles.btnText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fechar: {
    position: 'absolute',
    right: 12,
    top: 10,
    zIndex: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    width: '92%',
    maxHeight: '92%',
    borderRadius: 8,
  },
  scroll: {
    marginTop: 8,
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  label: { marginTop: 10, fontWeight: '600' },
  input: {
    color: '#000',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 5,
    overflow: 'hidden',
    width: '100%',
  },
  picker: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
  },
  tipoRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  tipoChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D9E4F2',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  tipoChipAtivo: {
    borderColor: '#3b5998',
    backgroundColor: '#E9F0FF',
  },
  tipoChipText: {
    fontWeight: '600',
    color: '#5D6F86',
  },
  tipoChipTextAtivo: {
    color: '#1E4DB7',
    fontWeight: '800',
  },
  hintDebito: {
    marginTop: 10,
    fontSize: 12,
    color: '#607086',
    lineHeight: 18,
    backgroundColor: '#F1F8EC',
    padding: 10,
    borderRadius: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  column: { flex: 0.48 },
  btnAdd: { backgroundColor: '#28a745', padding: 12, borderRadius: 6, marginTop: 10 },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' },
  headerCol: { flex: 1, fontWeight: 'bold', fontSize: 12 },
  colBanco: { flex: 0.6, alignItems: 'center' },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemCol: { flex: 1, fontSize: 12 },
  actionsCol: { flexDirection: 'row', gap: 4 },
  btnEdit: { backgroundColor: '#ffc107', padding: 6, borderRadius: 4 },
  btnExcluir: { backgroundColor: '#dc3545', padding: 6, borderRadius: 4 },
  btnActionText: { color: '#fff', fontSize: 11 },
  btnClose: { backgroundColor: '#6c757d', padding: 10, borderRadius: 6, marginTop: 10 },
});
