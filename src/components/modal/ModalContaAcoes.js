import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ModalCloseButton } from '../AppIcon';
import { formatarLabelParcela } from '../../utils/parcelamento';

export default function ModalContaAcoes({ visible, onClose, contaSelecionada, onEditar, onExcluir }) {
  const labelParcela = formatarLabelParcela(contaSelecionada);
  const ehRecorrencia = Boolean(contaSelecionada?.grupo_recorrencia);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ModalCloseButton onPress={onClose} style={styles.close} color="#666" />
          <Text style={styles.title}>Conta Selecionada</Text>
          <Text style={styles.info}>{contaSelecionada?.nome}</Text>
          {labelParcela ? (
            <Text style={styles.parcelaInfo}>
              {ehRecorrencia ? 'Recorrência' : 'Parcela'} {labelParcela}
              {contaSelecionada?.paga ? ' · Paga' : ' · Pendente'}
            </Text>
          ) : null}

          <View style={styles.botoes}>
            <TouchableOpacity style={styles.btn} onPress={onEditar}>
              <Text style={styles.btnText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#dc3545' }]} onPress={onExcluir}>
              <Text style={styles.btnText}>Excluir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modal: {
    backgroundColor: 'white', padding: 20, borderRadius: 10, width: '85%'
  },
  close: { position: 'absolute', right: 10, top: 10 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  info: { textAlign: 'center', marginBottom: 20 },
  parcelaInfo: { textAlign: 'center', marginBottom: 16, color: '#1E4DB7', fontSize: 13 },
  botoes: { flexDirection: 'row', justifyContent: 'space-around' },
  btn: {
    backgroundColor: '#007bff', padding: 10, borderRadius: 6, width: '40%'
  },
  btnText: { color: 'white', textAlign: 'center', fontWeight: 'bold' }
});
