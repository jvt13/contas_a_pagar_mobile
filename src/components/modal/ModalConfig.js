import { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';

export default function ModalConfig({ visible, onClose, loadContas, abrirModalLimite, abrirModalGerenciar }) {

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.backdrop}>
                <View style={styles.modalContent}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeText}>X</Text>
                    </TouchableOpacity>

                    <Text style={styles.title}>Opções</Text>

                    <TouchableOpacity style={styles.button}
                    onPress={() => {abrirModalLimite()}}>
                        <Text style={styles.buttonText}>Gerenciar limite</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.button}
                    onPress={() => abrirModalGerenciar()}>
                        <Text style={styles.buttonText}>Criar novo cartão</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.button}>
                        <Text style={styles.buttonText}>Excluir cartão</Text>
                    </TouchableOpacity>
                </View>
            </View>


        </Modal>

    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        elevation: 10,
    },
    title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
    button: {
        backgroundColor: '#007bff',
        padding: 12,
        borderRadius: 6,
        marginVertical: 6,
    },
    buttonText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
    closeButton: {
        position: 'absolute',
        top: 8,
        right: 10,
        zIndex: 10,
    },
    closeText: { fontSize: 24, color: '#999' },
});
