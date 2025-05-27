import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert
} from 'react-native';
import { setStorageItem, getStorageItem } from '../../utils/util';
import { postDados } from '../../utils/services';
import { msgToast } from '../../utils/util';

export default function ModalShareOrganization({
    visible,
    onClose,
    existingKey,
    onSave
}) {
    const [key, setKey] = useState('');

    useEffect(() => {

        const loadKeyShare = async () => {
            const key_share = await getStorageItem('@userKeyShare');
            if (key_share) {
                setKey(key_share) || '';
            }
        }
        
        if (visible) {
            loadKeyShare();
        }
    }, [visible, existingKey]);

    const handleSave = async () => {
        const userId = await getStorageItem('@userId');

        if (!key.trim()) {
            return Alert.alert('Erro', 'Digite uma chave válida.');
        }
        try {
            await postDados('/user/organization/share', { key, userId });
            msgToast('Chave salva com sucesso!'); 
            onSave(key);
            onClose();
        } catch (err) {
            console.error('Erro ao salvar chave:', err);
            Alert.alert('Erro', err.message || 'Não foi possível salvar a chave.');
        }
    };

    return (
        <Modal transparent visible={visible} animationType="slide">
            <View style={styles.backdrop}>
                <View style={styles.modalContent}>
                    <Text style={styles.title}>Conectar Organização</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Digite a chave da organização"
                        value={key}
                        onChangeText={setKey}
                    />
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.button} onPress={handleSave}>
                            <Text style={styles.buttonText}>Salvar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onClose}>
                            <Text style={styles.buttonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
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
        alignItems: 'center'
    },
    modalContent: {
        width: '85%',
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        elevation: 10
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center'
    },
    input: {
        borderColor: '#ccc',
        color: '#000',
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 20
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    button: {
        flex: 1,
        backgroundColor: '#007bff',
        padding: 12,
        borderRadius: 6,
        alignItems: 'center',
        marginHorizontal: 5
    },
    cancel: {
        backgroundColor: '#6c757d'
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold'
    }
});
