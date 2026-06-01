import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AppIcon from '../components/AppIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Modal_Nova_Conta from '../components/modal/modal-insert';
import ModalConfig from '../components/modal/ModalConfig';
import MenuHeader from '../components/MenuHeader';
import useContas from '../hooks/useContas';
import useCategorias from '../hooks/useCategorias';
import useCartoes from '../hooks/useCartaoManager';
import ModalGerenciarCartao from '../components/modal/ModalGerenciarCartao';
import ModalGerenciarLimite from '../components/modal/ModalGerenciarLimite';
import ModalContaAcoes from '../components/modal/ModalContaAcoes';
import ModalShareOrganization from '../components/modal/ModalShareOrganization';
import { deleteDados } from '../utils/services';
import { formatCurrency, mesesOptions, msgToast, obterMensagemErro } from '../utils/util';
import {
  contaPertenceGrupoParcela,
  perguntarEscopoParcela,
} from '../utils/parcelamento';
import { verificarAtualizacao } from '../utils/check_version';
import CustomPicker from '../components/modal/CustomPicker';
import CategoriaLabel from '../components/categorias/CategoriaLabel';

function CustomCheckBox({ value, onValueChange }) {
  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      style={[
        styles.checkbox,
        value ? styles.checkboxChecked : styles.checkboxUnchecked,
      ]}
    >
      {value ? <AppIcon name="check" size={12} color="#fff" /> : null}
    </TouchableOpacity>
  );
}

export default function AppContent() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear().toString());
  const [mes, setMes] = useState(hoje.getMonth().toString());

  const [modalNovaContaVisible, setModalNovaContaVisible] = useState(false);
  const [modalConfigVisible, setModalConfigVisible] = useState(false);
  const [modalLimiteVisible, setModalLimiteVisible] = useState(false);
  const [modalGerenciarVisible, setModalGerenciarVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const [sharedOrgKey, setSharedOrgKey] = useState('');
  const [contaSelecionada, setContaSelecionada] = useState(null);
  const [modalAcoesVisible, setModalAcoesVisible] = useState(false);
  const [posicaoTabelaY, setPosicaoTabelaY] = useState(0);
  const [alturaDisponivel, setAlturaDisponivel] = useState(400);

  const screenHeight = Dimensions.get('window').height;
  const { carregarCartoes } = useCartoes();
  const { contas, totais, anos, loading, loadContas, marcarComoPaga } = useContas(
    ano,
    mes,
    sharedOrgKey
  );
  const { categorias } = useCategorias();

  useEffect(() => {
    if (posicaoTabelaY > 0) {
      setAlturaDisponivel(screenHeight - posicaoTabelaY - 90);
    }
  }, [posicaoTabelaY, screenHeight]);

  useEffect(() => {
    async function carregarDadosIniciais() {
      try {
        await verificarAtualizacao();
        await carregarCartoes();

        const key = await AsyncStorage.getItem('@userKeyShareId');
        if (key) {
          setSharedOrgKey(key);
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      }
    }

    carregarDadosIniciais();
  }, []);

  const cardsResumo = useMemo(
    () => [
      { titulo: 'Limite do mês', valor: formatCurrency(totais.total_limite), cor: '#E9F5FF' },
      { titulo: 'Total de contas', valor: String(totais.total_contas || 0), cor: '#F1F8EC' },
      { titulo: 'Contas pagas', valor: String(totais.total_contas_pagas || 0), cor: '#EAF9EF' },
      { titulo: 'Pendentes', valor: String(totais.total_contas_pendentes || 0), cor: '#FFF3E8' },
    ],
    [totais]
  );

  const handleLongPress = (conta) => {
    setContaSelecionada(conta);
    setModalAcoesVisible(true);
  };

  const excluirConta = async () => {
    if (!contaSelecionada?.id) {
      return;
    }

    let escopo = 'apenas_esta';

    if (contaPertenceGrupoParcela(contaSelecionada)) {
      const escopoEscolhido = await perguntarEscopoParcela(
        'Excluir ocorrência',
        'Esta conta faz parte de um grupo (parcelamento/recorrência). Deseja excluir:'
      );
      if (!escopoEscolhido) {
        return;
      }
      escopo = escopoEscolhido;
    } else {
      const confirmacao = await new Promise((resolve) => {
        Alert.alert('Excluir conta', 'Deseja excluir esta conta?', [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Excluir', style: 'destructive', onPress: () => resolve(true) },
        ]);
      });
      if (!confirmacao) {
        return;
      }
    }

    try {
      await deleteDados(`/delete_conta/${contaSelecionada.id}?escopo=${escopo}`);
      msgToast('Conta excluída com sucesso!');
      setModalAcoesVisible(false);
      setContaSelecionada(null);
      loadContas();
    } catch (error) {
      Alert.alert('Erro', obterMensagemErro(error, 'Erro ao excluir a conta.'));
    }
  };

  const editarConta = () => {
    setModalAcoesVisible(false);
    setModalNovaContaVisible(true);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Gerenciamento de Contas</Text>
      <MenuHeader onOpenConfig={() => setModalConfigVisible(true)} />

      <TouchableOpacity
        style={styles.botaoNovaConta}
        onPress={() => {
          setContaSelecionada(null);
          setModalNovaContaVisible(true);
        }}
      >
        <AppIcon name="plus" size={16} color="#fff" />
        <Text style={styles.textoBotao}> Nova conta</Text>
      </TouchableOpacity>

      <View style={styles.filtros}>
        <View style={styles.pickerContainer}>
          <CustomPicker
            selectedValue={ano}
            onValueChange={setAno}
            options={anos}
            placeholder="Selecione o ano"
            style={styles.picker}
          />
        </View>

        <View style={styles.pickerContainer}>
          <CustomPicker
            selectedValue={mes}
            onValueChange={setMes}
            options={mesesOptions}
            placeholder="Selecione o mês"
            style={styles.picker}
          />
        </View>
      </View>

      <View style={styles.cards}>
        {cardsResumo.map((card) => (
          <View key={card.titulo} style={[styles.cardResumo, { backgroundColor: card.cor }]}>
            <Text style={styles.tituloResumo}>{card.titulo}</Text>
            <Text style={styles.valorResumo}>{card.valor}</Text>
          </View>
        ))}
      </View>

      <View
        style={[styles.tabelaContainer, { height: Math.max(alturaDisponivel, 280) }]}
        onLayout={(event) => {
          const { y } = event.nativeEvent.layout;
          setPosicaoTabelaY(y);
        }}
      >
        <View style={styles.tabelaHeader}>
          <Text style={[styles.cabecalho, styles.nomeColuna]}>Nome</Text>
          <Text style={styles.cabecalho}>Vencimento</Text>
          <Text style={styles.cabecalho}>Valor</Text>
          <Text style={styles.cabecalho}>Paga</Text>
        </View>

        {loading ? (
          <View style={styles.feedbackContainer}>
            <ActivityIndicator size="large" color="#1E4DB7" />
            <Text style={styles.feedbackText}>Carregando contas...</Text>
          </View>
        ) : (
          <FlatList
            data={contas}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.itemCard,
                  item.paga ? styles.itemCardPago : styles.itemCardPendente,
                ]}
              >
                <TouchableOpacity
                  onLongPress={() => handleLongPress(item)}
                  delayLongPress={250}
                  style={styles.itemContent}
                >
                  <View style={styles.nomeColuna}>
                    <Text style={styles.itemTitulo} numberOfLines={1}>
                      {item.nome}
                    </Text>
                    <CategoriaLabel
                      categoriaId={item.categoria}
                      categorias={categorias}
                      textStyle={styles.itemCategoria}
                    />
                  </View>
                  <Text style={styles.coluna}>{item.vencimento}</Text>
                  <Text style={styles.coluna}>{formatCurrency(item.valor)}</Text>
                  <CustomCheckBox
                    value={!!item.paga}
                    onValueChange={(novoValor) => marcarComoPaga(item.id, novoValor)}
                  />
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.feedbackContainer}>
                <AppIcon name="inbox" size={24} color="#7B8BA3" />
                <Text style={styles.feedbackText}>
                  Nenhuma conta encontrada para o período selecionado.
                </Text>
              </View>
            }
            showsVerticalScrollIndicator
            contentContainerStyle={styles.listaContent}
          />
        )}
      </View>

      <Modal_Nova_Conta
        visible={modalNovaContaVisible}
        onClose={() => setModalNovaContaVisible(false)}
        onSuccess={(filtro) => {
          if (filtro?.mes != null && filtro?.mes !== '') {
            setMes(String(filtro.mes));
          }
          if (filtro?.ano) {
            setAno(String(filtro.ano));
          }
          if (!filtro?.mes && !filtro?.ano) {
            loadContas();
          }
          setModalNovaContaVisible(false);
        }}
        ano={ano}
        mes={mes}
        contaSelecionada={contaSelecionada}
        setContaSelecionada={setContaSelecionada}
      />

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
        abrirModalContrlOrga={() => {
          setShareModalVisible(true);
          setModalConfigVisible(false);
        }}
      />

      <ModalGerenciarCartao
        visible={modalGerenciarVisible}
        onClose={() => setModalGerenciarVisible(false)}
      />

      <ModalGerenciarLimite
        visible={modalLimiteVisible}
        onClose={() => setModalLimiteVisible(false)}
        anos={[2024, 2025, 2026]}
        onSalvarLimite={(dados) => {
          console.log('Salvar dados limite:', dados);
        }}
        loadContas={loadContas}
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
          loadContas();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 35,
    padding: 10,
    backgroundColor: '#F4F8FF',
  },
  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    backgroundColor: '#1E4DB7',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#17305C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  botaoNovaConta: {
    backgroundColor: '#1E8E5A',
    paddingVertical: 13,
    borderRadius: 12,
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  textoBotao: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  filtros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 10,
  },
  pickerContainer: {
    borderRadius: 10,
    overflow: 'hidden',
    width: '48%',
  },
  picker: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardResumo: {
    width: '48%',
    padding: 16,
    borderRadius: 14,
    marginVertical: 5,
    alignItems: 'flex-start',
    elevation: 3,
    shadowColor: '#17305C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  tituloResumo: {
    fontSize: 13,
    color: '#5D6F86',
    marginBottom: 6,
  },
  valorResumo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16324F',
  },
  tabelaContainer: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#D9E4F2',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  tabelaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EDF4FF',
    padding: 12,
  },
  cabecalho: {
    fontWeight: '800',
    fontSize: 13,
    color: '#33415C',
    width: '22%',
    textAlign: 'center',
  },
  nomeColuna: {
    width: '34%',
  },
  itemCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  itemCardPago: {
    backgroundColor: '#F2FBF5',
  },
  itemCardPendente: {
    backgroundColor: '#FFF8F2',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B263B',
  },
  itemCategoria: {
    fontSize: 12,
    color: '#6B7A90',
    marginTop: 2,
  },
  coluna: {
    width: '22%',
    fontSize: 13,
    color: '#33415C',
    textAlign: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1E8E5A',
    borderColor: '#1E8E5A',
  },
  checkboxUnchecked: {
    backgroundColor: '#fff',
    borderColor: '#8CA0B3',
  },
  feedbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  feedbackText: {
    color: '#607086',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  listaContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
});
