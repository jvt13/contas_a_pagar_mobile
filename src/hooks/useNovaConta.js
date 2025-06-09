import { useState } from 'react';
import { Alert } from 'react-native';
import { postDados } from '../utils/services';
import { msgToast } from '../utils/util';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function useNovaConta(ano, mes, onSuccess, editarConta) {
    const [form, setForm] = useState({
        tipo_cartao: '',
        nome: '',
        categoria: '',
        vencimento: '',
        valor: '',
        conta_user: '',
        organization: ''
    });
    const [valorBackend, setValorBackend] = useState('');

    async function salvarConta() {
        const { tipo_cartao, nome, categoria, vencimento } = form;
        if (!tipo_cartao || !nome || !categoria || !vencimento || !valorBackend) {
            return Alert.alert('Erro', 'Preencha todos os campos.');
        }

        const organization = await AsyncStorage.getItem('@userKeyShareId');
        const userId = await AsyncStorage.getItem('@userId');

        if (!organization) {
            return Alert.alert('Erro', 'Organização não encontrada.');
        }

        const payload = {
            ...form,
            ano,
            mes,
            valor: valorBackend.valor,
            conta_user: userId,
            organization,
        };

        try {

            console.log('Pode editar conta:', editarConta);
            if (editarConta) {
                const res = await postDados('/form_conta/editar', payload);
                if (res.success) {
                    //Alert.alert('Sucesso', 'Conta editada!');
                    finalizaSets(); // Chama a função de finalização
                    msgToast('Conta atualizada com sucesso!');
                    return true;
                } else {
                    Alert.alert('Erro', res.message || 'Falha ao editar conta');
                }
            } else {
                const res = await postDados('/form_conta', payload);
                if (res.success) {
                    //Alert.alert('Sucesso', 'Conta adicionada!');
                    finalizaSets(); // Chama a função de finalização
                    msgToast('Conta adicionada com sucesso!');
                    return true;
                } else {
                    Alert.alert('Erro', res.message || 'Falha ao adicionar conta');
                }
            }
        } catch {
            Alert.alert('Erro', 'Falha de conexão');
        }
        return false;
    }

    const finalizaSets = () => {
        setValorBackend('');
        onSuccess(); // Chama a função de sucesso passada
    };

    return { form, setForm, valorBackend, setValorBackend, salvarConta };
}
