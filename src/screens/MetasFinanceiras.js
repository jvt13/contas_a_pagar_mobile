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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppIcon, { ModalCloseButton } from '../components/AppIcon';
import MonthNavigator from '../components/MonthNavigator';
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
  msgToast,
  obterMensagemErro,
} from '../utils/util';

const STATUS_CONFIG = {
  dentro: {
    label: 'Dentro da meta',
    cor: '#1E8E5A',
    bg: '#EAF9EF',
    icon: 'checkmark-circle-outline',
  },
  atencao: {
    label: 'Atenção',
    cor: '#E6A817',
    bg: '#FFF8E6',
    icon: 'alert-circle-outline',
  },
  excedida: {
    label: 'Excedida',
    cor: '#D64545',
    bg: '#FFF0F0',
    icon: 'close-circle-outline',
  },
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

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.dentro;

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <AppIcon name={config.icon} size={14} color={config.cor} />
      <Text style={[styles.statusBadgeTexto, { color: config.cor }]}>{config.label}</Text>
    </View>
  );
}

function MetaProgressBar({ percentual, status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.dentro;
  const larguraBarra = Math.min(100, Math.max(0, Number(percentual) || 0));

  return (
    <View style={styles.barraTrack}>
      <View style={[styles.barraFill, { width: `${larguraBarra}%`, backgroundColor: config.cor }]} />
    </View>
  );
}

function MetaCard({ meta, categorias, onEditar, onExcluir }) {
  const config = STATUS_CONFIG[meta.status] || STATUS_CONFIG.dentro;

  return (
    <View style={[styles.metaCard, { borderLeftColor: config.cor }]}>
      <View style={styles.metaHeader}>
        <View style={styles.metaHeaderInfo}>
          <CategoriaLabel
            categoriaId={meta.categoriaId}
            categorias={categorias}
            textStyle={styles.metaCategoriaNome}
          />
        </View>
        <StatusBadge status={meta.status} />
      </View>

      <View style={styles.metaValoresGrid}>
        <View style={styles.metaValorItem}>
          <Text style={styles.metaLabel}>Meta mensal</Text>
          <Text style={styles.metaValor}>{formatCurrency(meta.valorMeta)}</Text>
        </View>
        <View style={styles.metaValorItem}>
          <Text style={styles.metaLabel}>Gasto no mês</Text>
          <Text style={[styles.metaValor, { color: config.cor }]}>{formatCurrency(meta.gastoAtual)}</Text>
        </View>
      </View>

      <View style={styles.metaProgressoHeader}>
        <Text style={styles.metaProgressoLabel}>Utilização</Text>
        <Text style={[styles.percentualTexto, { color: config.cor }]}>
          {formatarPercentualMeta(meta.percentual)}
        </Text>
      </View>

      <MetaProgressBar percentual={meta.percentual} status={meta.status} />

      <View style={styles.acoesRow}>
        <TouchableOpacity
          onPress={() => onEditar(meta)}
          accessibilityLabel="Editar meta"
          style={styles.acaoBtn}
          activeOpacity={0.75}
        >
          <AppIcon name="create-outline" size={18} color="#1E4DB7" />
          <Text style={styles.acaoBtnTexto}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onExcluir(meta)}
          accessibilityLabel="Excluir meta"
          style={[styles.acaoBtn, styles.acaoBtnExcluir]}
          activeOpacity={0.75}
        >
          <AppIcon name="trash-outline" size={18} color="#D64545" />
          <Text style={[styles.acaoBtnTexto, styles.acaoBtnTextoExcluir]}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EstadoVazio({ onAdicionar }) {
  return (
    <View style={styles.vazioCard}>
      <View style={styles.vazioIconWrap}>
        <AppIcon name="flag-outline" size={28} color="#8CA0B3" />
      </View>
      <Text style={styles.vazioTitulo}>Nenhuma meta mensal cadastrada</Text>
      <Text style={styles.vazioTexto}>
        Crie metas mensais por categoria para acompanhar seus gastos em qualquer mês.
      </Text>
      <TouchableOpacity style={styles.btnNovaMetaVazio} onPress={onAdicionar} activeOpacity={0.85}>
        <AppIcon name="add" size={18} color="#fff" />
        <Text style={styles.btnNovaMetaText}>Adicionar meta</Text>
      </TouchableOpacity>
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
          <ModalCloseButton onPress={onClose} style={styles.modalFechar} color="#5D6F86" />

          <View style={styles.modalHeader}>
            <View style={styles.modalIconWrap}>
              <AppIcon name={editando ? 'create-outline' : 'flag-outline'} size={22} color="#1E4DB7" />
            </View>
            <Text style={styles.modalTitulo}>{editando ? 'Editar meta' : 'Nova meta'}</Text>
            <Text style={styles.modalSubtitulo}>
              {editando
                ? 'Esta meta vale para todos os meses. Atualize o valor quando quiser.'
                : 'Defina um valor mensal recorrente para esta categoria. Vale para todos os meses até ser editada.'}
            </Text>
          </View>

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

          <Text style={styles.modalLabel}>Valor da meta mensal</Text>
          <TextInput
            style={styles.inputValor}
            keyboardType="numeric"
            value={valorDisplay}
            onChangeText={handleValorChange}
            placeholder="R$ 0,00"
            placeholderTextColor="#8CA0B3"
          />

          <View style={styles.modalAcoes}>
            <TouchableOpacity style={styles.btnCancelar} onPress={onClose} disabled={salvando}>
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnSalvar, salvando && styles.btnSalvarDisabled]}
              onPress={handleSalvar}
              disabled={salvando}
              activeOpacity={0.85}
            >
              <AppIcon name="checkmark" size={18} color="#fff" />
              <Text style={styles.btnSalvarText}>{salvando ? 'Salvando...' : 'Salvar meta'}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function MetasFinanceiras() {
  const insets = useSafeAreaInsets();
  const scrollBottomPadding = Math.max(insets.bottom + 32, 72);

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

  const resumo = useMemo(() => {
    const totalMetas = metasComProgresso.length;
    const totalPrevisto = metasComProgresso.reduce((acc, m) => acc + (Number(m.valorMeta) || 0), 0);
    const totalGasto = metasComProgresso.reduce((acc, m) => acc + (Number(m.gastoAtual) || 0), 0);
    const metasExcedidas = metasComProgresso.filter((m) => m.status === 'excedida').length;

    return { totalMetas, totalPrevisto, totalGasto, metasExcedidas };
  }, [metasComProgresso]);

  const resumoCards = useMemo(
    () => [
      {
        titulo: 'Metas cadastradas',
        valor: String(resumo.totalMetas),
        icon: 'flag-outline',
        iconBg: '#F3EEFF',
        iconColor: '#6B4FA3',
        accentColor: '#6B4FA3',
      },
      {
        titulo: 'Total previsto',
        valor: formatCurrency(resumo.totalPrevisto),
        icon: 'wallet-outline',
        iconBg: '#E9F5FF',
        iconColor: '#1E4DB7',
      },
      {
        titulo: 'Gasto monitorado',
        valor: formatCurrency(resumo.totalGasto),
        icon: 'trending-up-outline',
        iconBg: '#EAF9EF',
        iconColor: '#1E8E5A',
        accentColor: '#1E8E5A',
      },
      {
        titulo: 'Metas excedidas',
        valor: String(resumo.metasExcedidas),
        icon: 'alert-circle-outline',
        iconBg: '#FFF0F0',
        iconColor: '#D64545',
        accentColor: resumo.metasExcedidas > 0 ? '#D64545' : '#16324F',
      },
    ],
    [resumo]
  );

  const categoriasComMeta = useMemo(
    () => metas.map((m) => m.categoriaId),
    [metas]
  );

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

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 8, 12) }]}>
      <MonthNavigator mes={mes} ano={ano} setMes={setMes} setAno={setAno} style={styles.monthNavigator} />

      <TouchableOpacity style={styles.btnNovaMeta} onPress={abrirNovaMeta} activeOpacity={0.85}>
        <AppIcon name="add" size={20} color="#fff" />
        <Text style={styles.btnNovaMetaText}>Nova meta</Text>
      </TouchableOpacity>

      {!loading && metasComProgresso.length > 0 ? (
        <View style={styles.cards}>
          {resumoCards.map((card) => (
            <ResumoCard key={card.titulo} {...card} />
          ))}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.feedbackContainer}>
          <ActivityIndicator size="large" color="#1E4DB7" />
          <Text style={styles.feedbackText}>Carregando metas...</Text>
        </View>
      ) : metasComProgresso.length === 0 ? (
        <View style={styles.feedbackContainer}>
          <EstadoVazio onAdicionar={abrirNovaMeta} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.listaContent, { paddingBottom: scrollBottomPadding }]}
          showsVerticalScrollIndicator
        >
          {metasComProgresso.map((meta) => (
            <MetaCard
              key={meta.categoriaId}
              meta={meta}
              categorias={categorias}
              onEditar={abrirEditarMeta}
              onExcluir={confirmarExclusao}
            />
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
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#F4F8FF',
  },
  monthNavigator: {
    marginBottom: 10,
  },
  btnNovaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E8E5A',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
  },
  btnNovaMetaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
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
    marginBottom: 8,
  },
  tituloResumo: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5D6F86',
    marginBottom: 4,
  },
  valorResumo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16324F',
  },
  feedbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  feedbackText: {
    color: '#607086',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  listaContent: {
    paddingTop: 2,
  },
  metaCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  metaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  metaHeaderInfo: {
    flex: 1,
  },
  metaCategoriaNome: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16324F',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeTexto: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaValoresGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metaValorItem: {
    flex: 1,
    backgroundColor: '#F8FAFD',
    borderRadius: 10,
    padding: 10,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7A90',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaValor: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16324F',
  },
  metaProgressoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaProgressoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7A90',
  },
  barraTrack: {
    height: 10,
    backgroundColor: '#EEF3F9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  barraFill: {
    height: '100%',
    borderRadius: 8,
    minWidth: 4,
  },
  percentualTexto: {
    fontSize: 15,
    fontWeight: '800',
  },
  acoesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF3F9',
  },
  acaoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E9F5FF',
  },
  acaoBtnExcluir: {
    backgroundColor: '#FFF0F0',
  },
  acaoBtnTexto: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E4DB7',
  },
  acaoBtnTextoExcluir: {
    color: '#D64545',
  },
  vazioCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    padding: 28,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    maxWidth: 320,
  },
  vazioIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F0F4FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  vazioTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16324F',
    textAlign: 'center',
    marginBottom: 6,
  },
  vazioTexto: {
    fontSize: 14,
    color: '#6B7A90',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  btnNovaMetaVazio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E8E5A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(22, 50, 79, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    elevation: 8,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalFechar: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 18,
    paddingTop: 4,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E9F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16324F',
    textAlign: 'center',
  },
  modalSubtitulo: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7A90',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    color: '#5D6F86',
  },
  categoriaFixa: {
    borderWidth: 1,
    borderColor: '#E3EBF5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    backgroundColor: '#F8FAFD',
  },
  categoriaFixaTexto: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16324F',
  },
  inputValor: {
    borderWidth: 1,
    borderColor: '#E3EBF5',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 18,
    color: '#16324F',
    backgroundColor: '#F8FAFD',
  },
  modalAcoes: {
    flexDirection: 'row',
    gap: 10,
  },
  btnCancelar: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D9E4F2',
    backgroundColor: '#fff',
  },
  btnCancelarText: {
    color: '#5D6F86',
    fontWeight: '700',
    fontSize: 15,
  },
  btnSalvar: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E8E5A',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  btnSalvarDisabled: {
    opacity: 0.7,
  },
  btnSalvarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
});
