// src/components/modal/modal-insert.js
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatarDataBR, aplicarMascaraValor, formatarMoeda } from '../../utils/util';
import useCartaoManager from '../../hooks/useCartaoManager';
import useNovaConta from '../../hooks/useNovaConta';

export default function Modal_Nova_Conta({ visible, onClose, onSuccess, onSave, ano, mes, contaSelecionada, setContaSelecionada }) {

    const [editarConta, setEditarConta] = useState(false);

    const {
        cartoes,
        carregarCartoes,
        setCartoes, // se quiser resetar manualmente
        getCartaoById,
    } = useCartaoManager();

    const { 
        form,
        setForm,
        valorBackend,
        setValorBackend,
        salvarConta,
    } = useNovaConta(ano, mes, onSuccess, editarConta);


    const setValoresSelecionados = () => {
        console.log('Conta selecionada:', contaSelecionada);
        if (contaSelecionada) {
            setEditarConta(true); // Define que estamos editando uma conta existente
            // Preenche os campos com os dados da conta selecionada
            setForm({
                ...form,
                id: contaSelecionada.id || '', // Preserva o ID para edição
                tipo_cartao: parseInt(contaSelecionada.tipo_cartao) || '',
                nome: contaSelecionada.nome || '',
                categoria: contaSelecionada.categoria || '',
                vencimento: contaSelecionada.vencimento || '',
                valor: contaSelecionada.valor.toString() || '',
            });
            // Formata o valor para o backend
            setValorBackend({ valor: contaSelecionada.valor });
        }
    }

    const reseteForms_onClose = () => {
        setForm({
            tipo_cartao: '',
            nome: '',
            categoria: '',
            vencimento: '',
            valor: '',
            conta_user: '',
            organization: '',
        }); // Reseta o formulário ao fechar o modal
        setValorBackend(''); // Reseta o valor backend ao fechar o modal
        console.log('Fechando modal');
        setContaSelecionada(null); // Reseta a conta selecionada se não houver
        setEditarConta(false); // Reseta o estado de edição ao fechar o modal
        onClose(); // Fecha o modal
    };

    useEffect(() => {

        if (visible) {
            setValoresSelecionados(); // Preenche os campos com os dados da conta selecionada, se houver
            if (visible && form.valor && !form.valor.toString().startsWith('R$')) {
                const valorFloat = parseFloat(form.valor);
                const display = valorFloat.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });

                setForm(f => ({ ...f, valor: display }));
            }

            carregarCartoes(); // Recarrega os cartões ao abrir o modal
        }

    }, [visible]);



    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const formatted = selectedDate.toLocaleDateString('pt-BR');
            setForm(f => ({ ...f, vencimento: formatted }));
        }
    };

    const trataSelect = async (id) => {
        console.log('ID selecionado:', id);
        setForm(f => ({ ...f, tipo_cartao: id }));
        if (!id) return;

        const cartao = await getCartaoById(id);
        console.log('Cartão obtido:', cartao);
        if (cartao?.vencimento) {
            const dataFormatada = formatarDataBR(cartao.vencimento); // ⬅ conversão
            setForm(f => ({ ...f, vencimento: dataFormatada }));
        }
    };

    const salvar = async () => {
        const success = await salvarConta();
        if (success) {
            reseteForms_onClose(); // Reseta o formulário e fecha o modal
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.titulo}>Adicionar Nova Conta</Text>

                    <Text style={styles.label}>Tipo de Cartão:</Text>
                    <View style={styles.selectWrapper}><Picker
                        selectedValue={form.tipo_cartao}
                        onValueChange={(value) => trataSelect(value)} // CHAMA O trataSelect
                        style={styles.select}
                    >
                        <Picker.Item label="Selecione" value="" />
                        {cartoes.map(cartao => (
                            <Picker.Item
                                key={cartao.id}
                                label={String(cartao.nome || '')}
                                value={cartao.id}
                            />
                        ))}

                    </Picker>
                    </View>

                    <Text style={styles.label}>Tipo de gasto:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Nome do gasto"
                        value={form.nome}
                        onChangeText={(text) => setForm(f => ({ ...f, nome: text }))}
                    />

                    <Text style={styles.label}>Categoria:</Text>
                    <View style={styles.selectWrapper}>
                        <Picker style={styles.select}
                            selectedValue={form.categoria}
                            onValueChange={(value) => setForm(f => ({ ...f, categoria: value }))}
                        >
                            <Picker.Item label="Selecione" value="" />
                            <Picker.Item label="Fixa" value="fixa" />
                            <Picker.Item label="Variável" value="variavel" />
                            <Picker.Item label="Renda" value="renda" />
                        </Picker>
                    </View>


                    <View style={styles.row}>
                        <View style={styles.column}>
                            <Text style={styles.label}>Vencimento:</Text>
                            <TouchableOpacity
                                style={styles.input}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={styles.inputText}>{form.vencimento || 'dd/mm/aaaa'}</Text>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    mode="date"
                                    value={new Date()}
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={handleDateChange}
                                />
                            )}
                        </View>
                        <View style={styles.column}>
                            <Text style={styles.label}>Valor:</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Valor"
                                keyboardType="numeric"
                                value={form.valor}
                                onChangeText={(text) => {
                                    const { display, backend } = formatarMoeda(text);
                                    setValorBackend({ valor: backend });
                                    setForm(f => ({ ...f, valor: display }));
                                    /*setValorDisplay(display);*/
                                }}
                            />
                        </View>
                    </View>

                    <TouchableOpacity onPress={salvar} style={styles.btnSalvar}>
                        <Text style={styles.btnText}>Salvar Conta</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={reseteForms_onClose} style={[styles.btnSalvar, { backgroundColor: '#ccc' }]}>
                        <Text style={[styles.btnText, { color: '#333' }]}>Cancelar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    titulo: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
        backgroundColor: '#c0c0c0',
        padding: 10,
        color: 'white',
        borderRadius: 6
    },
    label: {
        fontWeight: '600',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        marginBottom: 12,
        padding: 8,
        borderRadius: 6,
    },
    selectWrapper: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        marginBottom: 12,
        overflow: 'hidden', // necessário para Android não ultrapassar a borda
    },

    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    column: {
        flex: 1,
        marginRight: 8,
    },
    btnSalvar: {
        backgroundColor: '#28a745',
        padding: 12,
        borderRadius: 6,
        marginTop: 10,
    },
    btnText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    inputText: {
        color: '#333'
    },
});
