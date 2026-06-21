import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppIcon, { ModalCloseButton } from '../components/AppIcon';
import CustomPicker from '../components/modal/CustomPicker';
import CategorySelectorField from '../components/categorias/CategorySelectorField';
import CategoriaLabel from '../components/categorias/CategoriaLabel';
import useCategorias from '../hooks/useCategorias';
import useMetasFinanceiras from '../hooks/useMetasFinanceiras';
import { getDados } from '../utils/services';
import { STORAGE_KEYS } from '../utils/authSession';
import {
  buildQueryParams,
  formatCurrency,
  formatarMoeda,
  mesesOptions,
  msgToast,
  obterMensagemErro,
} from '../utils/util';

const CORES_STATUS = {
  dentro: '#1E8E5A',
  atencao: '#E6A817',
  excedida: '#D64545',
};

function calcularPercentualMeta(gasto, meta) {
  const valorGasto = Number(gasto) || 0;
  const valorMeta = Number(meta) || 0;
  if (valorMeta <= 0) {
    return 0;
  }
  const percentual = (valorGasto / valorMeta) * 100;
  return Number.isFinite(percentual) ? percentual : 0;
}

function classificarStatusMeta(percentual) {
  const pct = Number(percentual) || 0;
  if (pct <= 80) {
    return 'dentro';
  }
  if (pct <= 100) {
    return 'atencao';
  }
  return 'excedida';
}

function formatarPercentualMeta(valor) {
  const percentual = Number(valor) || 0;
  return Number.isFinite(percentual) ? `${Math.round(percentual)}%` : '0%';
}

function unificarContasPorVencimento(pendentes = [], pagas = []) {
  const mapa = new Map();

  for (const conta of pagas) {
    if (conta?.id == null) {
      continue;
    }
    mapa.set(String(conta.id), { ...conta, paga: true });
  }

  for (const conta of pendentes) {
    if (conta?.id == null) {
      continue;
    }
    const id = String(conta.id);
    if (!mapa.has(id)) {
      mapa.set(id, { ...conta, paga: false });
    }
  }

  return [...mapa.values()];
}

function montarGastosPorCategoria(contas) {
  const mapa = new Map();
  const lista = Array.isArray(contas) ? contas : [];

  for (const conta of lista) {
    const categoriaId = conta?.categoria ? String(conta.categoria) : '';
    if (!categoriaId) {
      continue;
    }
    const valor = Number(conta?.valor) || 0;
    mapa.set(categoriaId, (mapa.get(categoriaId) || 0) + valor);
  }

  return mapa;
}

function montarAnosOptions(data) {
  return (data?.anos || []).map((item) =>
    typeof item === 'object'
      ? { label: item.ano.toString(), value: item.ano.toString() }
      : { label: item.toString(), value: item.toString() }
  );
}

function MetaProgressBar({ percentual, status }) {
  const cor = CORES_STATUS[status] || CORES_STATUS.dentro;
  const larguraBarra = Math.min(100, Math.max(0, Number(percentual) || 0));

  return (
    <View style={styles.barraContainer}>
      <View style={styles.barraTrack}>
        <View style={[styles.barraFill, { width: `${larguraBarra}%`, backgroundColor: cor }]} />
      </View>
    </View>
  );
}

function ModalMetaForm({
  visible,
  onClose,
  onSalvar,
  editando,
  categoriaInicial,
  valorDisplayInicial,
  valorBackendInicial,
  categoriasComMeta,
  categorias,
}) {
  const [categoriaId, setCategoriaId] = useState('');
  const [valorDisplay, setValorDisplay] = useState('');
  const [valorBackend, setValorBackend] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    setCategoriaId(editando ? categoriaInicial : '');
    setValorDisplay(valorDisplayInicial || '');
    setValorBackend(valorBackendInicial || '');
  }, [visible, editando, categoriaInicial, valorDisplayInicial, valorBackendInicial]);

  const handleValorChange = (texto) => {
    const { display, backend } = formatarMoeda(texto);
    setValorDisplay(display);
    setValorBackend(backend);
  };

  const handleSalvar = async () => {
    if (!editando && categoriasComMeta.includes(categoriaId)) {
      Alert.alert('Atenção', 'Já existe uma meta para esta categoria.');
      return;
    }

    setSalvando(true);
    try {
      await onSalvar({ categoriaId, valor: valorBackend });
      onClose();
    } catch (error) {
      Alert.alert('Erro', obterMensagemErro(error, 'Não foi possível salvar a meta.'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <ModalCloseButton onPress={onClose} style={styles.modalFechar} color="#333" />
          <Text style={styles.modalTitulo}>{editando ? 'Editar meta' : 'Nova meta'}</Text>

          {editando ? (
            <>
              <Text style={styles.modalLabel}>Categoria</Text>
              <View style={styles.categoriaFixa}>
                <CategoriaLabel
                  categoriaId={categoriaId}
                  categorias={categorias}
                  textStyle={styles.categoriaFixaTexto}
                />
              </View>
            </>
          ) : (
            <CategorySelectorField value={categoriaId} onChange={setCategoriaId} label="Categoria:" />
          )}

          <Text style={styles.modalLabel}>Valor da meta</Text>
          <TextInput
            style={styles.inputValor}
            keyboardType="numeric"
            value={valorDisplay}
            onChangeText={handleValorChange}
            placeholder="R$ 0,00"
            placeholderTextColor="#999"
          />

          <TouchableOpacity
            style={[styles.btnSalvar, salvando && styles.btnSalvarDisabled]}
            onPress={handleSalvar}
            disabled={salvando}
          >
            <Text style={styles.btnSalvarText}>{salvando ? 'Salvando...' : 'Salvar meta'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function MetasFinanceiras() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear().toString());
  const [mes, setMes] = useState(hoje.getMonth().toString());
  const [contas, setContas] = useState([]);
  const [anosOptions, setAnosOptions] = useState([]);
  const [loadingContas, setLoadingContas] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [metaEditando, setMetaEditando] = useState(null);

  const { categorias } = useCategorias();
  const { metas, loading: loadingMetas, carregar, salvarMeta, excluirMeta } = useMetasFinanceiras();

  const carregarContas = useCallback(async () => {
    setLoadingContas(true);

    try {
      const organization = await AsyncStorage.getItem(STORAGE_KEYS.userKeyShareId);
      const query = buildQueryParams({ ano, mes, organization });

      const [resPendentes, resPagas] = await Promise.all([
        getDados(`/contas_pendentes?${query}`),
        getDados(`/contas_pagas?${query}`),
      ]);

      if (!resPendentes?.success && !resPagas?.success) {
        Alert.alert(
          'Erro',
          resPendentes?.message || resPagas?.message || 'Falha ao carregar gastos do mês.'
        );
        setContas([]);
        return;
      }

      const pendentes = resPendentes?.contasPendentes || [];
      const pagas = resPagas?.contasPagas || [];
      const unificadas = unificarContasPorVencimento(pendentes, pagas);

      const anos =
        montarAnosOptions(resPendentes).length > 0
          ? montarAnosOptions(resPendentes)
          : montarAnosOptions(resPagas);

      setAnosOptions(anos);
      setContas(unificadas);
    } catch (error) {
      Alert.alert('Erro', obterMensagemErro(error, 'Falha ao conectar com o servidor.'));
      setContas([]);
    } finally {
      setLoadingContas(false);
    }
  }, [ano, mes]);

  useEffect(() => {
    carregarContas();
  }, [carregarContas]);

  useFocusEffect(
    useCallback(() => {
      carregar();
      carregarContas();
    }, [carregar, carregarContas])
  );

  const gastosPorCategoria = useMemo(() => montarGastosPorCategoria(contas), [contas]);

  const metasComProgresso = useMemo(() => {
    return metas
      .map((meta) => {
        const valorMeta = Number(meta.valor) || 0;
        const gastoAtual = gastosPorCategoria.get(meta.categoriaId) || 0;
        const percentual = calcularPercentualMeta(gastoAtual, valorMeta);
        const status = classificarStatusMeta(percentual);

        return {
          ...meta,
          valorMeta,
          gastoAtual,
          percentual,
          status,
        };
      })
      .sort((a, b) => b.percentual - a.percentual);
  }, [metas, gastosPorCategoria]);

  const categoriasComMeta = useMemo(
    () => metas.map((m) => m.categoriaId),
    [metas]
  );

  const anosPicker = anosOptions.length > 0 ? anosOptions : [{ label: ano, value: ano }];
  const loading = loadingContas || loadingMetas;

  const abrirNovaMeta = () => {
    setMetaEditando(null);
    setModalVisible(true);
  };

  const abrirEditarMeta = (meta) => {
    const valorNum = Number(meta.valor) || 0;
    const centavos = Math.round(valorNum * 100).toString();
    const { display, backend } = formatarMoeda(centavos);
    setMetaEditando({
      categoriaId: meta.categoriaId,
      valorDisplay: display,
      valorBackend: backend,
    });
    setModalVisible(true);
  };

  const confirmarExclusao = (meta) => {
    Alert.alert(
      'Excluir meta',
      'Deseja remover esta meta financeira?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await excluirMeta(meta.categoriaId);
              msgToast('Meta excluída.');
            } catch (error) {
              Alert.alert('Erro', obterMensagemErro(error, 'Não foi possível excluir a meta.'));
            }
          },
        },
      ]
    );
  };

  const handleSalvarMeta = async ({ categoriaId, valor }) => {
    await salvarMeta({ categoriaId, valor });
    msgToast(metaEditando ? 'Meta atualizada!' : 'Meta cadastrada!');
  };

  const renderStatusLabel = (status) => {
    if (status === 'excedida') {
      return <Text style={[styles.statusLabel, { color: CORES_STATUS.excedida }]}>Meta excedida</Text>;
    }
    if (status === 'atencao') {
      return <Text style={[styles.statusLabel, { color: CORES_STATUS.atencao }]}>Atenção</Text>;
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.filtros}>
        <View style={styles.filtroColuna}>
          <CustomPicker
            selectedValue={ano}
            onValueChange={setAno}
            options={anosPicker}
            placeholder="Selecione o ano"
            style={styles.picker}
          />
        </View>
        <View style={styles.filtroColuna}>
          <CustomPicker
            selectedValue={mes}
            onValueChange={setMes}
            options={mesesOptions}
            placeholder="Selecione o mês"
            style={styles.picker}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.btnNovaMeta} onPress={abrirNovaMeta}>
        <AppIcon name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.btnNovaMetaText}>Nova meta</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.feedbackContainer}>
          <ActivityIndicator size="large" color="#1E4DB7" />
          <Text style={styles.feedbackText}>Carregando metas...</Text>
        </View>
      ) : metasComProgresso.length === 0 ? (
        <View style={styles.feedbackContainer}>
          <AppIcon name="flag-outline" size={28} color="#7B8BA3" />
          <Text style={styles.feedbackTitulo}>Nenhuma meta cadastrada</Text>
          <Text style={styles.feedbackText}>
            Defina um valor limite por categoria para acompanhar seus gastos mensais.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listaContent} showsVerticalScrollIndicator>
          {metasComProgresso.map((meta) => (
            <View key={meta.categoriaId} style={styles.metaCard}>
              <View style={styles.metaHeader}>
                <CategoriaLabel
                  categoriaId={meta.categoriaId}
                  categorias={categorias}
                  textStyle={styles.metaCategoriaNome}
                />
                <View style={styles.acoesRow}>
                  <TouchableOpacity
                    onPress={() => abrirEditarMeta(meta)}
                    accessibilityLabel="Editar meta"
                    style={styles.acaoBtn}
                  >
                    <AppIcon name="create-outline" size={20} color="#1E4DB7" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmarExclusao(meta)}
                    accessibilityLabel="Excluir meta"
                    style={styles.acaoBtn}
                  >
                    <AppIcon name="trash-outline" size={20} color="#D64545" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.metaLinha}>
                <Text style={styles.metaLabel}>Meta:</Text>
                <Text style={styles.metaValor}>{formatCurrency(meta.valorMeta)}</Text>
              </View>
              <View style={styles.metaLinha}>
                <Text style={styles.metaLabel}>Gasto atual:</Text>
                <Text style={styles.metaValor}>{formatCurrency(meta.gastoAtual)}</Text>
              </View>

              <MetaProgressBar percentual={meta.percentual} status={meta.status} />

              <View style={styles.metaFooter}>
                <Text style={[styles.percentualTexto, { color: CORES_STATUS[meta.status] }]}>
                  {formatarPercentualMeta(meta.percentual)}
                </Text>
                {renderStatusLabel(meta.status)}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <ModalMetaForm
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSalvar={handleSalvarMeta}
        editando={!!metaEditando}
        categoriaInicial={metaEditando?.categoriaId || ''}
        valorDisplayInicial={metaEditando?.valorDisplay || ''}
        valorBackendInicial={metaEditando?.valorBackend || ''}
        categoriasComMeta={categoriasComMeta}
        categorias={categorias}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F4F8FF',
  },
  filtros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filtroColuna: {
    width: '48%',
  },
  picker: {
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  btnNovaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E4DB7',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  btnNovaMetaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  feedbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  feedbackTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16324F',
    marginTop: 8,
  },
  feedbackText: {
    color: '#607086',
    fontSize: 14,
    textAlign: 'center',
  },
  listaContent: {
    paddingBottom: 24,
  },
  metaCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E4F2',
    padding: 14,
    marginBottom: 12,
  },
  metaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  metaCategoriaNome: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16324F',
    flex: 1,
    paddingRight: 8,
  },
  acoesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  acaoBtn: {
    padding: 4,
  },
  metaLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 13,
    color: '#6B7A90',
  },
  metaValor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#33415C',
  },
  barraContainer: {
    marginTop: 10,
    marginBottom: 6,
  },
  barraTrack: {
    height: 10,
    backgroundColor: '#E8EEF5',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barraFill: {
    height: '100%',
    borderRadius: 6,
  },
  metaFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentualTexto: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 400,
    borderRadius: 14,
    padding: 20,
  },
  modalFechar: {
    position: 'absolute',
    right: 12,
    top: 10,
    zIndex: 1,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16324F',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLabel: {
    fontWeight: '600',
    marginBottom: 6,
    color: '#33415C',
  },
  categoriaFixa: {
    borderWidth: 1,
    borderColor: '#D9E4F2',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#F4F8FF',
  },
  categoriaFixaTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: '#16324F',
  },
  inputValor: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
    fontSize: 18,
    marginBottom: 16,
    color: '#16324F',
  },
  btnSalvar: {
    backgroundColor: '#28a745',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSalvarDisabled: {
    opacity: 0.7,
  },
  btnSalvarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
