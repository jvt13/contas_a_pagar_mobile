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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  extrairNomeBaseParcela,
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

// Uso único na Home: barra compacta de uso do limite mensal (total lançado vs limite).
function UsoLimiteCard({ totais, contas }) {
  const previsto = Number(totais?.total_limite) || 0;

  const totalLancado = useMemo(() => {
    const lista = Array.isArray(contas) ? contas : [];
    return lista.reduce((acc, conta) => acc + (Number(conta?.valor) || 0), 0);
  }, [contas]);

  const temLimite = previsto > 0;
  const saldo = temLimite ? previsto - totalLancado : null;
  const percentualReal = temLimite ? (totalLancado / previsto) * 100 : null;
  const percentualBarra =
    percentualReal !== null ? Math.min(100, Math.max(0, percentualReal)) : 0;
  const corUso =
    percentualReal > 100 ? '#D64545' : percentualReal > 80 ? '#E6A817' : '#1E8E5A';

  return (
    <View style={styles.cardUsoLimite}>
      <View style={styles.cardUsoLimiteHeader}>
        <View style={styles.cardUsoLimiteIconWrap}>
          <AppIcon name="speedometer-outline" size={18} color="#1E4DB7" />
        </View>
        <Text style={styles.tituloUsoLimite}>Uso do limite do mês</Text>
      </View>

      {temLimite ? (
        <>
          <View style={styles.barraUsoLimiteTrack}>
            <View
              style={[
                styles.barraUsoLimiteFill,
                { width: `${percentualBarra}%`, backgroundColor: corUso },
              ]}
            />
          </View>
          <View style={styles.linhaUsoLimite}>
            <Text style={[styles.percentualUsoLimite, { color: corUso }]}>
              {Math.round(percentualReal)}% utilizado
            </Text>
            <Text
              style={[
                styles.saldoUsoLimite,
                saldo < 0 ? styles.estouroUsoLimite : styles.saldoRestanteUsoLimite,
              ]}
            >
              {saldo < 0
                ? `Estouro de ${formatCurrency(Math.abs(saldo))}`
                : `Saldo: ${formatCurrency(saldo)}`}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.semLimiteWrap}>
          <AppIcon name="information-circle-outline" size={20} color="#8CA0B3" />
          <View style={styles.semLimiteTextos}>
            <Text style={styles.semLimiteTexto}>Sem limite definido</Text>
            <Text style={styles.semLimiteDica}>Defina na Central de Controle</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function ResumoCard({ titulo, valor, icon, iconBg, iconColor, accentColor }) {
  return (
    <View style={styles.cardResumo}>
      <View style={[styles.cardResumoIconWrap, { backgroundColor: iconBg }]}>
        <AppIcon name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.tituloResumo}>{titulo}</Text>
      <Text style={[styles.valorResumo, accentColor ? { color: accentColor } : null]}>{valor}</Text>
    </View>
  );
}

function isGrupoParcelamentoHome(conta) {
  return Boolean(conta?.grupo_parcelamento && Number(conta?.total_parcelas) > 1);
}

function isGrupoRecorrenciaHome(conta) {
  return Boolean(conta?.grupo_recorrencia && Number(conta?.total_recorrencias) > 1);
}

function montarContasExibidasHome(contas) {
  if (!Array.isArray(contas) || contas.length === 0) {
    return [];
  }

  const parcelasMap = new Map();
  const recorrenciasMap = new Map();

  for (const conta of contas) {
    if (isGrupoParcelamentoHome(conta)) {
      const key = conta.grupo_parcelamento;
      if (!parcelasMap.has(key)) {
        parcelasMap.set(key, []);
      }
      parcelasMap.get(key).push(conta);
      continue;
    }

    if (isGrupoRecorrenciaHome(conta)) {
      const key = conta.grupo_recorrencia;
      if (!recorrenciasMap.has(key)) {
        recorrenciasMap.set(key, []);
      }
      recorrenciasMap.get(key).push(conta);
    }
  }

  const parcelasProcessadas = new Map();

  for (const [key, parcelas] of parcelasMap) {
    const ordenadas = [...parcelas].sort(
      (a, b) => (Number(a.parcela_atual) || 0) - (Number(b.parcela_atual) || 0)
    );
    const primeira = ordenadas[0];
    const totalParcelas = Number(primeira.total_parcelas) || ordenadas.length;
    const valorParcela = Number(primeira.valor) || 0;
    const valorTotal = ordenadas.reduce((acc, parcela) => acc + (Number(parcela.valor) || 0), 0);

    parcelasProcessadas.set(key, {
      ...primeira,
      id: `grupo-parcela-${key}`,
      _consolidadoParcelamento: true,
      _contaRepresentativa: primeira,
      nome: extrairNomeBaseParcela(primeira.nome),
      vencimento: primeira.vencimento,
      valor: valorTotal,
      _infoParcelamento: `${totalParcelas}x de ${formatCurrency(valorParcela)}`,
      paga: ordenadas.every((parcela) => Boolean(parcela.paga)),
    });
  }

  const recorrenciasProcessadas = new Map();

  for (const [key, ocorrencias] of recorrenciasMap) {
    const ordenadas = [...ocorrencias].sort(
      (a, b) => (Number(a.recorrencia_atual) || 0) - (Number(b.recorrencia_atual) || 0)
    );
    const primeira = ordenadas[0];
    const totalRecorrencias = Number(primeira.total_recorrencias) || ordenadas.length;
    const valorMensal = Number(primeira.valor) || 0;

    recorrenciasProcessadas.set(key, {
      ...primeira,
      id: `grupo-recorrencia-${key}`,
      _consolidadoRecorrencia: true,
      _contaRepresentativa: primeira,
      nome: extrairNomeBaseParcela(primeira.nome),
      vencimento: primeira.vencimento,
      valor: valorMensal,
      _infoRecorrencia: `${totalRecorrencias} recorrências de ${formatCurrency(valorMensal)}`,
      paga: ordenadas.every((ocorrencia) => Boolean(ocorrencia.paga)),
    });
  }

  const parcelasEmitidas = new Set();
  const recorrenciasEmitidas = new Set();

  return contas.reduce((lista, conta) => {
    if (isGrupoParcelamentoHome(conta)) {
      const key = conta.grupo_parcelamento;
      if (!parcelasEmitidas.has(key)) {
        parcelasEmitidas.add(key);
        lista.push(parcelasProcessadas.get(key));
      }
      return lista;
    }

    if (isGrupoRecorrenciaHome(conta)) {
      const key = conta.grupo_recorrencia;
      if (!recorrenciasEmitidas.has(key)) {
        recorrenciasEmitidas.add(key);
        lista.push(recorrenciasProcessadas.get(key));
      }
      return lista;
    }

    lista.push(conta);
    return lista;
  }, []);
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
  const insets = useSafeAreaInsets();
  const listBottomPadding = Math.max(insets.bottom + 32, 72);
  const { carregarCartoes } = useCartoes();
  const { contas, totais, anos, loading, loadContas, marcarComoPaga } = useContas(
    ano,
    mes,
    sharedOrgKey
  );
  const { categorias, getSubcategorias } = useCategorias();

  const contasExibidas = useMemo(() => montarContasExibidasHome(contas), [contas]);

  useEffect(() => {
    if (posicaoTabelaY > 0) {
      setAlturaDisponivel(screenHeight - posicaoTabelaY - 90 - insets.bottom);
    }
  }, [posicaoTabelaY, screenHeight, insets.bottom]);

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
      {
        titulo: 'Limite do mês',
        valor: formatCurrency(totais.total_limite),
        icon: 'wallet-outline',
        iconBg: '#E9F5FF',
        iconColor: '#1E4DB7',
      },
      {
        titulo: 'Total de contas',
        valor: String(totais.total_contas || 0),
        icon: 'list-outline',
        iconBg: '#F1F8EC',
        iconColor: '#4A7C3F',
      },
      {
        titulo: 'Contas pagas',
        valor: String(totais.total_contas_pagas || 0),
        icon: 'checkmark-circle-outline',
        iconBg: '#EAF9EF',
        iconColor: '#1E8E5A',
        accentColor: '#1E8E5A',
      },
      {
        titulo: 'Pendentes',
        valor: String(totais.total_contas_pendentes || 0),
        icon: 'time-outline',
        iconBg: '#FFF3E8',
        iconColor: '#C47A1A',
        accentColor: '#C47A1A',
      },
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
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 8, 12) }]}>
      <MenuHeader onOpenConfig={() => setModalConfigVisible(true)} />

      <TouchableOpacity
        style={styles.botaoNovaConta}
        activeOpacity={0.85}
        onPress={() => {
          setContaSelecionada(null);
          setModalNovaContaVisible(true);
        }}
      >
        <AppIcon name="plus" size={18} color="#fff" />
        <Text style={styles.textoBotao}>Nova conta</Text>
      </TouchableOpacity>

      <View style={styles.filtros}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerLabelRow}>
            <AppIcon name="calendar-outline" size={14} color="#1E4DB7" />
            <Text style={styles.pickerLabel}>Ano</Text>
          </View>
          <CustomPicker
            selectedValue={ano}
            onValueChange={setAno}
            options={anos}
            placeholder="Selecione o ano"
            style={styles.picker}
          />
        </View>

        <View style={styles.pickerContainer}>
          <View style={styles.pickerLabelRow}>
            <AppIcon name="calendar" size={14} color="#1E4DB7" />
            <Text style={styles.pickerLabel}>Mês</Text>
          </View>
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
          <ResumoCard key={card.titulo} {...card} />
        ))}
      </View>

      <UsoLimiteCard totais={totais} contas={contas} />

      <View style={styles.listaSectionHeader}>
        <AppIcon name="list-outline" size={18} color="#1E4DB7" />
        <Text style={styles.listaSectionTitulo}>Contas do período</Text>
        {!loading ? (
          <Text style={styles.listaSectionContagem}>{contasExibidas.length}</Text>
        ) : null}
      </View>

      <View
        style={[styles.tabelaContainer, { height: Math.max(alturaDisponivel, 280) }]}
        onLayout={(event) => {
          const { y } = event.nativeEvent.layout;
          setPosicaoTabelaY(y);
        }}
      >
        <View style={styles.tabelaHeader}>
          <Text style={[styles.cabecalho, styles.nomeColunaHeader]}>Nome</Text>
          <Text style={styles.cabecalho}>Venc.</Text>
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
            data={contasExibidas}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item, index }) => (
              <View
                style={[
                  styles.itemCard,
                  item.paga ? styles.itemCardPago : styles.itemCardPendente,
                  index === contasExibidas.length - 1 ? styles.itemCardLast : null,
                ]}
              >
                <TouchableOpacity
                  onLongPress={() => handleLongPress(item._contaRepresentativa || item)}
                  delayLongPress={250}
                  style={styles.itemContent}
                >
                  <View style={styles.nomeColuna}>
                    <Text style={styles.itemTitulo} numberOfLines={1}>
                      {item.nome}
                    </Text>
                    {item._infoParcelamento ? (
                      <Text style={styles.itemParcelamento} numberOfLines={1}>
                        {item._infoParcelamento}
                      </Text>
                    ) : null}
                    {item._infoRecorrencia ? (
                      <Text style={styles.itemRecorrencia} numberOfLines={1}>
                        {item._infoRecorrencia}
                      </Text>
                    ) : null}
                    <CategoriaLabel
                      categoriaId={item.categoria}
                      subcategoriaId={item.subcategoria}
                      categorias={categorias}
                      subcategorias={getSubcategorias(item.categoria)}
                      textStyle={styles.itemCategoria}
                    />
                  </View>
                  <Text style={styles.coluna}>{item.vencimento}</Text>
                  <Text style={styles.coluna}>
                    {item._consolidadoRecorrencia
                      ? `${formatCurrency(item.valor)}/mês`
                      : formatCurrency(item.valor)}
                  </Text>
                  {item._consolidadoParcelamento || item._consolidadoRecorrencia ? (
                    <View style={styles.checkboxPlaceholder} />
                  ) : (
                    <CustomCheckBox
                      value={!!item.paga}
                      onValueChange={(novoValor) => marcarComoPaga(item.id, novoValor)}
                    />
                  )}
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
            contentContainerStyle={[styles.listaContent, { paddingBottom: listBottomPadding }]}
          />
        )}
      </View>

      <Modal_Nova_Conta
        visible={modalNovaContaVisible}
        onClose={() => setModalNovaContaVisible(false)}
        onSuccess={(filtro) => {
          // filtro.mes/ano = competência de data_lancamento da nova conta (criação).
          // Edição não envia filtro: recarrega sempre, pois a conta pode estar na lista atual.
          const mesLancamento =
            filtro?.mes != null && filtro?.mes !== '' ? String(filtro.mes) : null;
          const anoLancamento = filtro?.ano ? String(filtro.ano) : null;

          const pertenceAoFiltro =
            mesLancamento === null || anoLancamento === null
              ? true
              : mesLancamento === String(mes) && anoLancamento === String(ano);

          // Mantém o filtro escolhido pelo usuário; só recarrega quando a conta
          // pertence ao mês/ano exibido (Home usa eixo data_lancamento).
          if (pertenceAoFiltro) {
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
    paddingHorizontal: 12,
    backgroundColor: '#F4F8FF',
  },
  botaoNovaConta: {
    backgroundColor: '#1E8E5A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 10,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    elevation: 4,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
  },
  textoBotao: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  filtros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  pickerContainer: {
    flex: 1,
  },
  pickerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 5,
    paddingLeft: 2,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5D6F86',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  picker: {
    width: '100%',
    height: 46,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  cardResumo: {
    width: '48%',
    minHeight: 96,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E3EBF5',
    elevation: 3,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardResumoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  tituloResumo: {
    fontSize: 12,
    color: '#6B7A90',
    marginBottom: 4,
    fontWeight: '600',
  },
  valorResumo: {
    fontSize: 17,
    fontWeight: '800',
    color: '#16324F',
  },
  cardUsoLimite: {
    width: '100%',
    padding: 12,
    borderRadius: 14,
    marginVertical: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E3EBF5',
    elevation: 3,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardUsoLimiteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  cardUsoLimiteIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#E9F5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tituloUsoLimite: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16324F',
  },
  barraUsoLimiteTrack: {
    height: 8,
    backgroundColor: '#EEF3F9',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  barraUsoLimiteFill: {
    height: '100%',
    borderRadius: 8,
    minWidth: 4,
  },
  linhaUsoLimite: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  percentualUsoLimite: {
    fontSize: 13,
    fontWeight: '800',
  },
  saldoUsoLimite: {
    fontSize: 12,
    fontWeight: '700',
  },
  saldoRestanteUsoLimite: {
    color: '#1E8E5A',
  },
  estouroUsoLimite: {
    color: '#D64545',
  },
  semLimiteWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  semLimiteTextos: {
    flex: 1,
  },
  semLimiteTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5D6F86',
  },
  semLimiteDica: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7A90',
  },
  listaSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
    gap: 8,
  },
  listaSectionTitulo: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#16324F',
  },
  listaSectionContagem: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E4DB7',
    backgroundColor: '#E9F5FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tabelaContainer: {
    borderWidth: 1,
    borderColor: '#E3EBF5',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabelaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EBF5',
  },
  cabecalho: {
    fontWeight: '700',
    fontSize: 11,
    color: '#6B7A90',
    width: '22%',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  nomeColunaHeader: {
    width: '34%',
    textAlign: 'left',
  },
  nomeColuna: {
    width: '34%',
  },
  itemCard: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F9',
  },
  itemCardLast: {
    borderBottomWidth: 0,
  },
  itemCardPago: {
    backgroundColor: '#FAFDFB',
  },
  itemCardPendente: {
    backgroundColor: '#FFFCFA',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16324F',
  },
  itemCategoria: {
    fontSize: 11,
    color: '#6B7A90',
    marginTop: 3,
  },
  itemParcelamento: {
    fontSize: 11,
    color: '#1E4DB7',
    fontWeight: '700',
    marginTop: 3,
  },
  itemRecorrencia: {
    fontSize: 11,
    color: '#0F7B6C',
    fontWeight: '700',
    marginTop: 3,
  },
  coluna: {
    width: '22%',
    fontSize: 12,
    color: '#33415C',
    textAlign: 'center',
    fontWeight: '500',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1E8E5A',
    borderColor: '#1E8E5A',
  },
  checkboxUnchecked: {
    backgroundColor: '#fff',
    borderColor: '#B8C5D6',
  },
  checkboxPlaceholder: {
    width: 26,
    height: 26,
  },
  feedbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 10,
  },
  feedbackText: {
    color: '#607086',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  listaContent: {
    flexGrow: 1,
  },
});
