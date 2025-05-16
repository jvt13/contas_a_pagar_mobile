// src/hooks/useContas.js
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { getDados, postDados, putDados, deleteDados } from '../utils/services';

export default function useContas(ano, mes) {
    const [contas, setContas] = useState([]);
    const [totais, setTotais] = useState({
        total_limite: 0,
        total_contas: 0,
        total_contas_pagas: 0,
        total_contas_pendentes: 0,
    });

    const loadContas = async () => {
        try {
            const data = await postDados('/dados_tab', { ano, mes });
            if (data.sucess) {
                setContas(data.contas || []);
                setTotais({
                    total_limite: data.total_limite,
                    total_contas: data.total_contas,
                    total_contas_pagas: data.total_contas_pagas,
                    total_contas_pendentes: data.total_contas_pendentes,
                });
            } else {
                Alert.alert('Erro', data.message || 'Erro ao carregar dados');
            }
        } catch {
            Alert.alert('Erro', 'Falha na conexão com servidor');
        }
    };

    useEffect(() => {
        loadContas();
    }, [ano, mes]);

    const marcarComoPaga = async (index, paga) => {
        try {
            const data = await postDados('/marcar-paga', { mes, index, paga });
            if (data.sucess) {
                setContas(prev =>
                    prev.map(c => (c.id === index ? { ...c, paga } : c))
                );
                loadContas();
            } else {
                Alert.alert('Erro', 'Não foi possível atualizar o status.');
            }
        } catch {
            Alert.alert('Erro', 'Erro de comunicação com o servidor.');
        }
    };

    const salvarConta = async (form, setForm, setModalVisible) => {
        try {
            // Remove máscara do valor
            const valorNumerico = parseFloat(form.valor.replace(/\D/g, '')) / 100;

            const contaParaSalvar = {
                ...form,
                valor: valorNumerico,
                ano,
                mes,
            };

            const data = await postDados('/form_conta', contaParaSalvar);

            if (data.sucess) {
                Alert.alert('Sucesso', 'Conta salva com sucesso!');
                setModalVisible(false);
                setForm({
                    nome: '',
                    vencimento: '',
                    valor: '',
                    categoria: '',
                    tipo_cartao: '',
                });
                loadContas(); // recarrega a lista atualizada
            } else {
                Alert.alert('Erro', data.message || 'Não foi possível salvar a conta.');
            }
        } catch {
            Alert.alert('Erro', 'Erro de comunicação com o servidor.');
        }
    };


    return { contas, totais, setContas, loadContas, marcarComoPaga, salvarConta };
}
