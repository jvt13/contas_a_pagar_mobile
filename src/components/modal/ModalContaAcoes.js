import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function ModalContaAcoes({ visible, onClose, contaSelecionada, onEditar, onExcluir }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.close} onPress={onClose}>
            <Text style={{ fontSize: 24 }}>X</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Conta Selecionada</Text>
          <Text style={styles.info}>{contaSelecionada?.nome}</Text>

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
  botoes: { flexDirection: 'row', justifyContent: 'space-around' },
  btn: {
    backgroundColor: '#007bff', padding: 10, borderRadius: 6, width: '40%'
  },
  btnText: { color: 'white', textAlign: 'center', fontWeight: 'bold' }
});
