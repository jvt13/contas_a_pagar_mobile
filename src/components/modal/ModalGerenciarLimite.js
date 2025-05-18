import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { obterIdLimite, atualizarLimite, inserirLimite } from '../../hooks/useLimites';


export default function ModalGerenciarLimite({ visible, onClose, anos, onSalvarLimite, loadContas }) {
    const [mes, setMes] = useState('');
    const [ano, setAno] = useState('');
    const [novoAno, setNovoAno] = useState('');
    const [mostrarNovoAno, setMostrarNovoAno] = useState(false);
    const [value, setValue] = useState('');
    const [limite, setLimite] = useState('0.00');

    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    const toggleNovoAno = () => setMostrarNovoAno(!mostrarNovoAno);

    const handleChange = (text) => {
        // Remove tudo que não for número
        let onlyNumbers = text.replace(/\D/g, '');
        let number = parseInt(onlyNumbers, 10);

        if (isNaN(number)) number = 0;

        // Valor para backend (duas casas decimais com ponto)
        const backendValue = (number / 100).toFixed(2);

        // Valor formatado (R$X.XXX,XX)
        let formatted = backendValue
            .replace('.', ',') // troca ponto por vírgula nos centavos
            .replace(/\B(?=(\d{3})+(?!\d))/g, '.'); // adiciona os pontos nos milhares

        setValue('R$' + formatted);
        setLimite(backendValue);
    };

    const handleSalvar = async () => {

        if ((!ano && !novoAno) || !mes || !limite) {
            Alert.alert('Atenção', 'Preencha todos os campos obrigatórios!');
            return;
        }

        const anoFinal = novoAno || ano;
        const mesFinal = parseInt(mes) + 1;
        //const limiteNumerico = formatarParaBackend(limite);
        const limiteNumerico = parseFloat(
            limite.replace(/[R$\s.]/g, '').replace(',', '.')
        );

        try {
            const id = await obterIdLimite(anoFinal, mesFinal);
            if (id) {
                console.log('Limite convertido para BAckend:', limite);
                await atualizarLimite(anoFinal, mesFinal, limite, id);
                Alert.alert('Sucesso', 'Limite atualizado!');
            } else {
                await inserirLimite(anoFinal, mesFinal, limite);
                Alert.alert('Sucesso', 'Limite inserido!');
            }

            if (typeof loadContas === 'function') loadContas();

            onClose();
            resetarCampos();
        } catch (error) {
            console.error(error);
            Alert.alert('Erro', 'Ocorreu um erro ao salvar o limite.');
        }
    };


    const resetarCampos = () => {
        setMes('');
        setAno('');
        setNovoAno('');
        setMostrarNovoAno(false);
        setLimite('');
    };

    const formatarLimite = (valor) => {
        const numero = valor.replace(/\D/g, '') / 100;
        return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <TouchableOpacity onPress={onClose} style={styles.fechar}>
                        <Text style={{ fontSize: 20 }}>X</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Gerenciar Limite</Text>

                    <Text style={styles.label}>Mês:</Text>
                    <View style={styles.selectWrapper}>
                        <Picker
                            selectedValue={mes}
                            onValueChange={setMes}
                            style={styles.picker}
                        >
                            <Picker.Item label="Selecione o Mês" value="" />
                            {meses.map((m, idx) => (
                                <Picker.Item key={idx} label={m} value={idx.toString()} />
                            ))}
                        </Picker>
                    </View>

                    <Text style={styles.label}>Ano:</Text>
                    <View style={styles.row}>
                        <View style={[styles.selectWrapper, { flex: 1 }]}>
                            <Picker
                                selectedValue={ano}
                                onValueChange={setAno}
                                style={{ height: 50, width: '100%' }}
                            >
                                <Picker.Item label="Selecione o Ano" value="" />
                                {anos.map((a, idx) => (
                                    <Picker.Item key={idx} label={a.toString()} value={a.toString()} />
                                ))}
                            </Picker>
                        </View>

                        <TouchableOpacity onPress={toggleNovoAno} style={styles.btnAdicionarAno}>
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Adicionar Novo Ano</Text>
                        </TouchableOpacity>
                    </View>


                    {mostrarNovoAno && (
                        <TextInput
                            style={styles.input}
                            placeholder="Digite um novo ano"
                            keyboardType="numeric"
                            value={novoAno}
                            onChangeText={setNovoAno}
                        />
                    )}

                    <Text style={styles.label}>Limite:</Text>
                    <TextInput
                        keyboardType="numeric"
                        value={value}
                        onChangeText={handleChange}
                        placeholder="R$0,00"
                        style={{
                            borderBottomWidth: 1,
                            fontSize: 24,
                            padding: 10,
                            marginBottom: 20,
                        }}
                    />

                    <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvar}>
                        <Text style={styles.btnSalvarText}>Salvar Limite</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)',
    },
    container: {
        backgroundColor: '#fff',
        width: '90%',
        borderRadius: 12,
        padding: 20,
    },
    fechar: {
        position: 'absolute',
        right: 12,
        top: 10,
    },
    title: {
        fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center',
    },
    label: {
        fontWeight: '600',
        marginTop: 10,
    },
    picker: {
        height: 50,
        width: '100%',
        borderColor: '#000',
    },
    selectWrapper: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        marginTop: 5,
        marginBottom: 10,
        overflow: 'hidden',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        marginTop: 8,
        borderRadius: 6,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 8,
    },
    btnAdicionarAno: {
        backgroundColor: '#007bff',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 6,
        marginLeft: 8,
        flexShrink: 0,
    },

    btnSalvar: {
        backgroundColor: '#007bff',
        padding: 12,
        borderRadius: 6,
        marginTop: 10,
        alignItems: 'center',
    },
    btnSalvarText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
