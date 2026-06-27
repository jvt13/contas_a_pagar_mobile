import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppIcon from '../components/AppIcon';
import MonthNavigator from '../components/MonthNavigator';
import CategoriaLabel from '../components/categorias/CategoriaLabel';
import useCategorias from '../hooks/useCategorias';
import { getDados } from '../utils/services';
import { STORAGE_KEYS } from '../utils/authSession';
import {
  buildQueryParams,
  formatCurrency,
  obterMensagemErro,
} from '../utils/util';

const SEM_CATEGORIA = '__sem_categoria__';
const SEM_SUBCATEGORIA = '__sem_subcategoria__';

function calcularPercentual(parte, total) {
  const valorParte = Number(parte) || 0;
  const valorTotal = Number(total) || 0;
  if (valorTotal <= 0) {
    return 0;
  }
  return (valorParte / valorTotal) * 100;
}

function formatarPercentual(valor) {
  const percentual = Number(valor) || 0;
  return Number.isFinite(percentual) ? `${percentual.toFixed(1)}%` : '0,0%';
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

function montarAnosOptions(data) {
  return (data?.anos || []).map((item) =>
    typeof item === 'object'
      ? { label: item.ano.toString(), value: item.ano.toString() }
      : { label: item.toString(), value: item.toString() }
  );
}

function montarRelatorioCategorias(contas) {
  const lista = Array.isArray(contas) ? contas : [];
  let totalLancado = 0;
  let totalPago = 0;
  let totalPendente = 0;
  const categoriasMap = new Map();

  for (const conta of lista) {
    const valor = Number(conta?.valor) || 0;
    totalLancado += valor;

    if (conta?.paga) {
      totalPago += valor;
    } else {
      totalPendente += valor;
    }

    const categoriaId = conta?.categoria ? String(conta.categoria) : SEM_CATEGORIA;
    const subcategoriaId = conta?.subcategoria ? String(conta.subcategoria) : SEM_SUBCATEGORIA;

    if (!categoriasMap.has(categoriaId)) {
      categoriasMap.set(categoriaId, {
        categoriaId,
        total: 0,
        totalPago: 0,
        totalPendente: 0,
        quantidade: 0,
        subcategoriasMap: new Map(),
      });
    }

    const categoria = categoriasMap.get(categoriaId);
    categoria.total += valor;
    categoria.quantidade += 1;

    if (conta?.paga) {
      categoria.totalPago += valor;
    } else {
      categoria.totalPendente += valor;
    }

    if (!categoria.subcategoriasMap.has(subcategoriaId)) {
      categoria.subcategoriasMap.set(subcategoriaId, {
        subcategoriaId,
        total: 0,
        totalPago: 0,
        totalPendente: 0,
        quantidade: 0,
      });
    }

    const subcategoria = categoria.subcategoriasMap.get(subcategoriaId);
    subcategoria.total += valor;
    subcategoria.quantidade += 1;

    if (conta?.paga) {
      subcategoria.totalPago += valor;
    } else {
      subcategoria.totalPendente += valor;
    }
  }

  const categorias = [...categoriasMap.values()]
    .map((categoria) => {
      const subcategorias = [...categoria.subcategoriasMap.values()]
        .map((sub) => ({
          ...sub,
          percentualCategoria: calcularPercentual(sub.total, categoria.total),
          percentualTotal: calcularPercentual(sub.total, totalLancado),
        }))
        .sort((a, b) => b.total - a.total);

      return {
        categoriaId: categoria.categoriaId,
        total: categoria.total,
        totalPago: categoria.totalPago,
        totalPendente: categoria.totalPendente,
        quantidade: categoria.quantidade,
        percentualTotal: calcularPercentual(categoria.total, totalLancado),
        subcategorias,
      };
    })
    .sort((a, b) => b.total - a.total);

  return {
    totalLancado,
    totalPago,
    totalPendente,
    categorias,
  };
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

function SecaoHeader({ titulo, icon, iconColor = '#1E4DB7' }) {
  return (
    <View style={styles.secaoHeader}>
      <AppIcon name={icon} size={18} color={iconColor} />
      <Text style={styles.secaoTitulo}>{titulo}</Text>
    </View>
  );
}

function BarraProporcional({ percentual, cor = '#1E4DB7', altura = 8 }) {
  const largura = Math.min(100, Math.max(0, Number(percentual) || 0));

  return (
    <View style={[styles.barraTrack, altura !== 8 ? { height: altura } : null]}>
      <View style={[styles.barraFill, { width: `${largura}%`, backgroundColor: cor }]} />
    </View>
  );
}

function StatusChip({ icon, texto, cor, bg }) {
  return (
    <View style={[styles.statusChip, { backgroundColor: bg }]}>
      <AppIcon name={icon} size={12} color={cor} />
      <Text style={[styles.statusChipTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

function SubcategoriaItem({ sub, grupo, categorias, getSubcategorias }) {
  return (
    <View style={styles.subcategoriaItem}>
      <View style={styles.subcategoriaTop}>
        <View style={styles.subcategoriaInfo}>
          {sub.subcategoriaId === SEM_SUBCATEGORIA ? (
            <Text style={styles.subcategoriaNome}>Sem subcategoria</Text>
          ) : (
            <CategoriaLabel
              categoriaId={grupo.categoriaId}
              subcategoriaId={sub.subcategoriaId}
              categorias={categorias}
              subcategorias={getSubcategorias(grupo.categoriaId)}
              showIcon={false}
              textStyle={styles.subcategoriaNome}
            />
          )}
          <Text style={styles.subQuantidade}>
            {sub.quantidade} lançamento{sub.quantidade === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={styles.subValores}>
          <Text style={styles.subTotal}>{formatCurrency(sub.total)}</Text>
          <Text style={styles.subPercentual}>{formatarPercentual(sub.percentualCategoria)} da categoria</Text>
        </View>
      </View>
      <BarraProporcional percentual={sub.percentualCategoria} cor="#6B9FD4" altura={6} />
      <View style={styles.subStatusRow}>
        {sub.totalPago > 0 ? (
          <StatusChip
            icon="checkmark-circle-outline"
            texto={formatCurrency(sub.totalPago)}
            cor="#1E8E5A"
            bg="#EAF9EF"
          />
        ) : null}
        {sub.totalPendente > 0 ? (
          <StatusChip
            icon="time-outline"
            texto={formatCurrency(sub.totalPendente)}
            cor="#C47A1A"
            bg="#FFF3E8"
          />
        ) : null}
      </View>
    </View>
  );
}

function CategoriaCard({ grupo, index, categorias, getSubcategorias }) {
  return (
    <View style={styles.categoriaCard}>
      <View style={styles.categoriaTop}>
        <View style={styles.categoriaRankBadge}>
          <Text style={styles.categoriaRankTexto}>{index + 1}º</Text>
        </View>
        <View style={styles.categoriaInfo}>
          {grupo.categoriaId === SEM_CATEGORIA ? (
            <Text style={styles.categoriaNome}>Sem categoria</Text>
          ) : (
            <CategoriaLabel
              categoriaId={grupo.categoriaId}
              categorias={categorias}
              textStyle={styles.categoriaNome}
            />
          )}
          <Text style={styles.quantidadeTexto}>
            {grupo.quantidade} lançamento{grupo.quantidade === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={styles.categoriaValores}>
          <Text style={styles.categoriaTotal}>{formatCurrency(grupo.total)}</Text>
          <Text style={styles.percentualTexto}>{formatarPercentual(grupo.percentualTotal)} do mês</Text>
        </View>
      </View>

      <BarraProporcional percentual={grupo.percentualTotal} />

      <View style={styles.categoriaStatusRow}>
        <StatusChip
          icon="checkmark-circle-outline"
          texto={`Pago ${formatCurrency(grupo.totalPago)}`}
          cor="#1E8E5A"
          bg="#EAF9EF"
        />
        <StatusChip
          icon="time-outline"
          texto={`Pendente ${formatCurrency(grupo.totalPendente)}`}
          cor="#C47A1A"
          bg="#FFF3E8"
        />
      </View>

      {grupo.subcategorias.length > 0 ? (
        <View style={styles.subcategoriasWrap}>
          <View style={styles.subcategoriasHeader}>
            <AppIcon name="git-branch-outline" size={14} color="#6B7A90" />
            <Text style={styles.subcategoriasTitulo}>Subcategorias</Text>
          </View>
          {grupo.subcategorias.map((sub) => (
            <SubcategoriaItem
              key={`${grupo.categoriaId}-${sub.subcategoriaId}`}
              sub={sub}
              grupo={grupo}
              categorias={categorias}
              getSubcategorias={getSubcategorias}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function EstadoVazio({ icon, titulo, texto }) {
  return (
    <View style={styles.vazioCard}>
      <View style={styles.vazioIconWrap}>
        <AppIcon name={icon} size={28} color="#8CA0B3" />
      </View>
      <Text style={styles.vazioTitulo}>{titulo}</Text>
      <Text style={styles.vazioTexto}>{texto}</Text>
    </View>
  );
}

export default function RelatorioCategorias() {
  const insets = useSafeAreaInsets();
  const scrollBottomPadding = Math.max(insets.bottom + 32, 72);

  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear().toString());
  const [mes, setMes] = useState(hoje.getMonth().toString());
  const [contas, setContas] = useState([]);
  const [anosOptions, setAnosOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const { categorias, getSubcategorias } = useCategorias();

  const carregarContas = useCallback(async () => {
    setLoading(true);

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
          resPendentes?.message || resPagas?.message || 'Falha ao carregar relatório.'
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
      setLoading(false);
    }
  }, [ano, mes]);

  useEffect(() => {
    carregarContas();
  }, [carregarContas]);

  const relatorio = useMemo(() => montarRelatorioCategorias(contas), [contas]);

  const resumoCards = useMemo(
    () => [
      {
        titulo: 'Total do mês',
        valor: formatCurrency(relatorio.totalLancado),
        icon: 'wallet-outline',
        iconBg: '#E9F5FF',
        iconColor: '#1E4DB7',
      },
      {
        titulo: 'Total pago',
        valor: formatCurrency(relatorio.totalPago),
        icon: 'checkmark-circle-outline',
        iconBg: '#EAF9EF',
        iconColor: '#1E8E5A',
        accentColor: '#1E8E5A',
      },
      {
        titulo: 'Total pendente',
        valor: formatCurrency(relatorio.totalPendente),
        icon: 'time-outline',
        iconBg: '#FFF3E8',
        iconColor: '#C47A1A',
        accentColor: '#C47A1A',
      },
      {
        titulo: 'Categorias',
        valor: String(relatorio.categorias.length),
        icon: 'grid-outline',
        iconBg: '#F3EEFF',
        iconColor: '#6B4FA3',
        accentColor: '#6B4FA3',
      },
    ],
    [relatorio]
  );

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 8, 12) }]}>
      <MonthNavigator mes={mes} ano={ano} setMes={setMes} setAno={setAno} style={styles.monthNavigator} />

      <View style={styles.cards}>
        {resumoCards.map((card) => (
          <ResumoCard key={card.titulo} {...card} />
        ))}
      </View>

      {loading ? (
        <View style={styles.feedbackContainer}>
          <ActivityIndicator size="large" color="#1E4DB7" />
          <Text style={styles.feedbackText}>Carregando relatório...</Text>
        </View>
      ) : relatorio.categorias.length === 0 ? (
        <View style={styles.feedbackContainer}>
          <EstadoVazio
            icon="pie-chart-outline"
            titulo="Nenhuma despesa no período"
            texto="Nenhuma despesa encontrada para este mês."
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.listaContent, { paddingBottom: scrollBottomPadding }]}
          showsVerticalScrollIndicator
        >
          <SecaoHeader titulo="Ranking por categoria" icon="stats-chart-outline" />
          {relatorio.categorias.map((grupo, index) => (
            <CategoriaCard
              key={grupo.categoriaId}
              grupo={grupo}
              index={index}
              categorias={categorias}
              getSubcategorias={getSubcategorias}
            />
          ))}
        </ScrollView>
      )}
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
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  secaoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16324F',
  },
  barraTrack: {
    height: 8,
    backgroundColor: '#EEF3F9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  barraFill: {
    height: '100%',
    borderRadius: 8,
    minWidth: 4,
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
  categoriaCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  categoriaTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  categoriaRankBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#E9F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  categoriaRankTexto: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E4DB7',
  },
  categoriaInfo: {
    flex: 1,
    paddingRight: 8,
  },
  categoriaNome: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16324F',
  },
  quantidadeTexto: {
    marginTop: 3,
    fontSize: 11,
    color: '#8CA0B3',
  },
  categoriaValores: {
    alignItems: 'flex-end',
  },
  categoriaTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E4DB7',
  },
  percentualTexto: {
    marginTop: 3,
    fontSize: 12,
    color: '#0F7B6C',
    fontWeight: '600',
  },
  categoriaStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusChipTexto: {
    fontSize: 11,
    fontWeight: '700',
  },
  subcategoriasWrap: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF3F9',
  },
  subcategoriasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  subcategoriasTitulo: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7A90',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  subcategoriaItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F7FB',
  },
  subcategoriaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  subcategoriaInfo: {
    flex: 1,
    paddingRight: 10,
  },
  subcategoriaNome: {
    fontSize: 13,
    fontWeight: '600',
    color: '#33415C',
  },
  subQuantidade: {
    marginTop: 2,
    fontSize: 11,
    color: '#8CA0B3',
  },
  subValores: {
    alignItems: 'flex-end',
  },
  subTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#33415C',
  },
  subPercentual: {
    marginTop: 2,
    fontSize: 11,
    color: '#6B7A90',
  },
  subStatusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
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
  },
});
