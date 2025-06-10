import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Picker } from '@react-native-picker/picker';
import { Dimensions } from 'react-native';
import Modal_Nova_Conta from '../components/modal/modal-insert';
import ModalConfig from '../components/modal/ModalConfig';
import MenuHeader from '../components/MenuHeader';
import useContas from '../hooks/useContas';
import useCartoes from '../hooks/useCartaoManager';
import ModalGerenciarCartao from '../components/modal/ModalGerenciarCartao';
import ModalGerenciarLimite from '../components/modal/ModalGerenciarLimite';
import ModalContaAcoes from '../components/modal/ModalContaAcoes';
import { deleteDados } from '../utils/services'
import * as util from '../utils/util';
import { LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ModalShareOrganization from '../components/modal/ModalShareOrganization';
import { verificarAtualizacao } from '../utils/check_version';
import CustomPicker from '../components/modal/CustomPicker';

function CustomCheckBox({ value, onValueChange }) {
    return (
        <TouchableOpacity
            onPress={() => onValueChange(!value)}
            style={{
                width: 20,
                height: 20,
                borderRadius: 3,
                borderWidth: 1,
                borderColor: '#333',
                backgroundColor: value ? '#007bff' : 'white',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            {value && <Text style={{ color: 'white', fontWeight: 'bold' }}>✓</Text>}
        </TouchableOpacity>
    );
}

export default function App() {

    //LogBox.ignoreAllLogs();  //Uso para ignorar todos os logs de aviso (testes)

    const data = new Date();
    const ano_atual = data.getFullYear().toString();
    const mes_atual = data.getMonth().toString();
    const [ano, setAno] = useState(ano_atual);
    const [mes, setMes] = useState(mes_atual); // Maio = 4
    const [anosOptions, setAnosOptions] = useState([]);

    const [modalNovaContaVisible, setModalNovaContaVisible] = useState(false);
    const [modalConfigVisible, setModalConfigVisible] = useState(false);
    const [modalLimiteVisible, setModalLimiteVisible] = useState(false);
    const [modalGerenciarVisible, setModalGerenciarVisible] = useState(false);
    const [shareModalVisible, setShareModalVisible] = useState(false);

    const [sharedOrgKey, setSharedOrgKey] = useState('');
    const [sharedOrgId, setSharedOrgId] = useState(''); // Se precisar do ID da organização compartilhada


    const { cartoes, getCartaoById } = useCartoes(); // ✅ correto

    const [posicaoTabelaY, setPosicaoTabelaY] = useState(0);
    const [alturaDisponivel, setAlturaDisponivel] = useState(400);

    const screenHeight = Dimensions.get('window').height;

    useEffect(() => {
        if (posicaoTabelaY > 0) {
            const novaAltura = screenHeight - posicaoTabelaY - 80;
            setAlturaDisponivel(novaAltura);
        }
    }, [posicaoTabelaY, screenHeight]);

    const [form, setForm] = useState({
        nome: '',
        vencimento: '',
        valor: '',
        categoria: '',
        tipo_cartao: '',
        organization: '',
    });

    const [valorBackend, setValorBackend] = useState({
        valor: '',
    });

    const {
        contas,
        totais,
        anos,
        loadContas,
        marcarComoPaga,
        salvarConta,
        getCartoes,
    } = useContas(ano, mes, sharedOrgKey, form, setForm, valorBackend, setValorBackend, setModalNovaContaVisible);

    /*Trata ModalContaAcoes */
    const [modalAcoesVisible, setModalAcoesVisible] = useState(false);
    const [contaSelecionada, setContaSelecionada] = useState(null);

    useEffect(() => {

        async function verificar() { // Verifica atualizações ao carregar o componente
            await verificarAtualizacao();
        }
        //verificar();

        const carregarCartoes = async () => {
            const lista = await getCartoes();
            if (Array.isArray(lista)) setCartoes(lista);
        };
        carregarCartoes();

        AsyncStorage.getItem('@userKeyShareId')
            .then(key => {
                if (key) {
                    setSharedOrgKey(key);
                    setForm(prevForm => ({
                        ...prevForm,
                        organization: key
                    }));

                }
            })
            .catch(err => console.error('Erro lendo keyShare:', err));

    }, []);

    const handleLongPress = (conta) => {
        //console.log('Conta selecionada:', conta.id);
        setContaSelecionada(conta);
        setModalAcoesVisible(true);
    };

    const excluirConta = async () => {
        try {
            await deleteDados('/delete_conta/' + contaSelecionada.id);
            util.msgToast('Conta excluída com sucesso!');
            //Alert.alert('Sucesso', 'Conta excluída com sucesso!');
            loadContas(); // atualiza a lista
            setModalAcoesVisible(false);
        } catch (err) {
            Alert.alert('Erro', 'Erro ao excluir a conta');
        }
    };

    const editarConta = () => {
        setModalNovaContaVisible(true);
        setModalAcoesVisible(false);
    };

    /*Fim ModalContaAcoes */

    return (
        <View style={styles.container}>
            <Text style={styles.titulo}>GERENCIAMENTO DE CONTAS</Text>
            <MenuHeader onOpenConfig={() => setModalConfigVisible(true)} />

            <TouchableOpacity style={styles.botaoNovaConta} onPress={() => setModalNovaContaVisible(true)}>
                <Text style={styles.textoBotao}>
                    <Text style={styles.textoBotao}>
                        <Icon name="plus" size={16} color="#fff" /> Nova Conta
                    </Text>

                </Text>
            </TouchableOpacity>

            {/* Filtros */}
            <View style={styles.filtros}>
                <View style={styles.pickerContainer}>
                    <CustomPicker
                        selectedValue={ano}
                        onValueChange={setAno}
                        options={anos}
                        placeholder="Selecione o ano"
                        style={styles.picker}
                        dropdownIconColor="#000"
                    />
                </View>

                {/* Picker de Mês */}
                <View style={styles.pickerContainer}>
                    <CustomPicker
                        selectedValue={mes}
                        onValueChange={setMes}
                        options={util.mesesOptions}
                        placeholder="Selecione o mês"
                        style={styles.picker}
                    />
                </View>
            </View>

            {/* Cards resumo */}
            <View style={styles.cards}>
                <Resumo titulo="Limite mês:" valor={totais.total_limite} />
                <Resumo titulo="Total de Contas:" valor={totais.total_contas} />
                <Resumo titulo="Contas Pagas:" valor={totais.total_contas_pagas} />
                <Resumo titulo="Contas Pendentes:" valor={totais.total_contas_pendentes} />
            </View>

            {/* Tabela */}
            <View
                style={[
                    styles.tabelaContainer,
                    { height: alturaDisponivel || 400 } // Usar height para limitar e permitir rolagem
                ]}
                onLayout={(event) => {
                    const { y } = event.nativeEvent.layout;
                    setPosicaoTabelaY(y);
                }}
            >
                <View style={styles.cabecalhoLinha}>
                    <Text style={styles.cabecalho}>Nome</Text>
                    <Text style={styles.cabecalho}>Vencimento</Text>
                    <Text style={styles.cabecalho}>Valor</Text>
                    <Text style={styles.cabecalho}>Paga</Text>
                </View>

                <FlatList
                    data={contas}
                    keyExtractor={item => item.id.toString()}
                    renderItem={({ item }) => (
                        <View
                            style={[
                                styles.itemCard,
                                item.paga ? styles.itemCardPago : styles.itemCardPendente
                            ]}
                        >
                            <TouchableOpacity
                                onLongPress={() => handleLongPress(item)}
                                delayLongPress={300}
                                style={styles.itemContent}
                            >
                                <Text style={styles.coluna}>{item.nome}</Text>
                                <Text style={styles.coluna}>{item.vencimento}</Text>
                                <Text style={styles.coluna}>R$ {item.valor.toFixed(2).replace('.', ',')}</Text>
                                <CustomCheckBox
                                    value={item.paga}
                                    onValueChange={(novoValor) => marcarComoPaga(item.id, novoValor)}
                                />
                            </TouchableOpacity>
                        </View>
                    )}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            </View>



            <View>

            </View>
            {/* Modal */}
            {form && (
                /*<Modal_Nova_Conta
                    visible={modalNovaContaVisible}
                    onClose={() => setModalNovaContaVisible(false)}
                    form={form}
                    setForm={setForm}
                    valorBackend={valorBackend}
                    setValorBackend={setValorBackend}
                    onSave={() => salvarConta(form, setForm, modalNovaContaVisible)}
                    /*cartoes={cartoes}
                    getCartaoById={getCartaoById}*/
                ///>
                <Modal_Nova_Conta
                    visible={modalNovaContaVisible}
                    onClose={() => setModalNovaContaVisible(false)}
                    onSuccess={() => {
                        loadContas();              // recarrega a tabela
                        setModalNovaContaVisible(false);
                    }}
                    ano={ano}
                    mes={mes}
                    contaSelecionada={contaSelecionada}
                    setContaSelecionada={setContaSelecionada}
                />
            )}

            <ModalConfig
                visible={modalConfigVisible}
                onClose={() => setModalConfigVisible(false)}
                loadContas={loadContas}
                abrirModalLimite={() => {
                    setModalLimiteVisible(true);
                    setModalConfigVisible(false);
                }}
                abrirModalGerenciar={() => {
                    setModalGerenciarVisible(true);
                    setModalConfigVisible(false);
                }}
                abrirModalContrlOrga={() => setShareModalVisible(true)}
            />

            <ModalGerenciarCartao
                visible={modalGerenciarVisible}
                onClose={() => setModalGerenciarVisible(false)}
            />

            <ModalGerenciarLimite
                visible={modalLimiteVisible}
                onClose={() => setModalLimiteVisible(false)}
                anos={[2024, 2025, 2026]} // Exemplo de anos
                onSalvarLimite={(dados) => {
                    console.log('Salvar dados limite:', dados);
                    // Aqui chama sua API: inserirLimite ou atualizarLimite
                }}
                loadContas={loadContas} // Passa a função loadContas para o ModalGerenciarLimite
            />

            <ModalContaAcoes
                visible={modalAcoesVisible}
                contaSelecionada={contaSelecionada}
                onClose={() => setModalAcoesVisible(false)}
                onEditar={editarConta}
                onExcluir={excluirConta}
            />

            <ModalShareOrganization
                visible={shareModalVisible}
                onClose={() => setShareModalVisible(false)}
                existingKey={sharedOrgKey}
                onSave={(key) => {
                    setSharedOrgKey(key);
                    loadContas(); // atualiza a tabela com base na nova chave
                }}
            />


        </View>
    );
}

function Resumo({ titulo, valor }) {
    return (
        <View style={styles.cardResumo}>
            <Text style={styles.tituloResumo}>{titulo}</Text>
            <Text style={styles.valorResumo}>R$ {parseFloat(valor).toFixed(2).replace('.', ',')}</Text>
        </View>
    );
}


const styles = StyleSheet.create({
    container: { marginTop: 35, padding: 10, backgroundColor: 'white' },
    titulo: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff', // harmoniza com o header azul
        textAlign: 'center',
        marginBottom: 1,
        textTransform: 'uppercase', // deixa tudo em caixa alta
        letterSpacing: 1, // mais espaço entre letras
        backgroundColor: '#3b5998', // mesmo azul do header
        paddingVertical: 10,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4, // Android
    },

    botaoNovaConta: {
        backgroundColor: '#28a745',
        paddingVertical: 12,
        borderRadius: 8,
        marginVertical: 10,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        marginTop: 5,
        marginBottom: 10,

    },
    textoBotao: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

    filtros: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 10 },
    pickerContainer: {
        /*borderWidth: 1,
        borderColor: '#999',*/
        borderRadius: 5,
        overflow: 'hidden',
        width: '48%', // Deixa um pequeno espaço entre os Pickers
    },
    picker: {
        width: '100%',
        height: 50,
        backgroundColor: '#fff',
        borderRadius: 10,
        marginVertical: 5,
        alignItems: 'center',
        elevation: 4, // sombra no Android
        shadowColor: '#000', // sombra no iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    item_mes: { color: '#000' },

    cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    cardResumo: {
        width: '48%',
        backgroundColor: '#f0f8ff',  //Cinza claro (#f7f7f7)
        padding: 15,
        borderRadius: 10,
        marginVertical: 5,
        alignItems: 'center',
        elevation: 4, // sombra no Android
        shadowColor: '#000', // sombra no iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    tituloResumo: {
        fontSize: 14,
        color: '#555',
        marginBottom: 5,
        textAlign: 'center',
    },
    valorResumo: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },

    tabelaContainer: {
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        overflow: 'hidden',
    },

    cabecalhoLinha: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f0f8ff', // Mesma cor dos cards ou outra cor suave
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
        marginBottom: 5,
        elevation: 3, // Sombra Android
        shadowColor: '#000', // Sombra iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    cabecalho: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#333',
        width: '23%',
        textAlign: 'center',
    },

    itemCard: {
        backgroundColor: '#fff',
        padding: 10,
        borderRadius: 8,
        marginBottom: 10,
        elevation: 3, // Android
        shadowColor: '#000', // iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    itemCardPago: {
        backgroundColor: '#e6ffe6', // Verde clarinho
    },
    itemCardPendente: {
        backgroundColor: '#fff3f3', // Vermelho clarinho
    },
    itemContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    coluna: {
        width: '23%',
        fontSize: 14,
        color: '#333',
    },

});
