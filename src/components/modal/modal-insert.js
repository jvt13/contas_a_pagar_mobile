// src/components/modal/modal-insert.js
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatarDataBR, aplicarMascaraValor, formatarMoeda } from '../../utils/util';

export default function Modal_Nova_Conta({ visible, onClose, form, setForm, onSave, cartoes, getCartaoById }) {
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [valorDisplay, setValorDisplay] = useState('0.00');

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const formatted = selectedDate.toLocaleDateString('pt-BR');
            setForm(f => ({ ...f, vencimento: formatted }));
        }
    };

    const trataSelect = async (id) => {
        setForm(f => ({ ...f, tipo_cartao: id }));
        if (!id) return;

        const cartao = await getCartaoById(id);
        console.log(cartao.vencimento);
        if (cartao?.vencimento) {
            const dataFormatada = formatarDataBR(cartao.vencimento); // ⬅ conversão
            setForm(f => ({ ...f, vencimento: dataFormatada }));
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
                            <Picker.Item key={cartao.id} label={cartao.nome} value={cartao.id} />
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
                                <Text>{form.vencimento || 'dd/mm/aaaa'}</Text>
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
                                value={valorDisplay}
                                onChangeText={(text) => {
                                    const {display, backend} = formatarMoeda(text);
                                    setForm(f => ({ ...f, valor: backend }));
                                    setValorDisplay(display);
                                }}
                            />
                        </View>
                    </View>

                    <TouchableOpacity onPress={onSave} style={styles.btnSalvar}>
                        <Text style={styles.btnText}>Salvar Conta</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={onClose} style={[styles.btnSalvar, { backgroundColor: '#ccc' }]}>
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
});
