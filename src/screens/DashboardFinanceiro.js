import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppIcon from '../components/AppIcon';
import CustomPicker from '../components/modal/CustomPicker';
import CategoriaLabel from '../components/categorias/CategoriaLabel';
import useCategorias from '../hooks/useCategorias';
import useCartoesLookup from '../hooks/useCartoesLookup';
import useDashboardCartoes from '../hooks/useDashboardCartoes';
import { obterLimiteMensal } from '../hooks/useLimites';
import { getDados } from '../utils/services';
import { STORAGE_KEYS } from '../utils/authSession';
import { isCartaoDebito } from '../utils/tipoCartao';
import {
  buildQueryParams,
  formatCurrency,
  mesesOptions,
  obterMensagemErro,
} from '../utils/util';

const SEM_CATEGORIA = '__sem_categoria__';
const FORMAS_DESPESA = [
  { chave: 'credito', rotulo: 'Crédito', cor: '#1E4DB7', iconBg: '#E9F5FF', icon: 'card-outline' },
  { chave: 'debito', rotulo: 'Débito', cor: '#0F7B6C', iconBg: '#EAF9EF', icon: 'card-outline' },
  { chave: 'dinheiro', rotulo: 'Dinheiro', cor: '#C47A1A', iconBg: '#FFF3E8', icon: 'cash-outline' },
];

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

function classificarFormaDespesa(conta, mapaCartoes = {}) {
  const cartaoId = String(conta?.tipo_cartao_id ?? conta?.tipo_cartao ?? '').trim();

  if (!cartaoId) {
    return 'dinheiro';
  }

  const cartao = mapaCartoes[cartaoId];
  if (cartao) {
    return isCartaoDebito(cartao) ? 'debito' : 'credito';
  }

  const lower = cartaoId.toLowerCase();
  if (lower === 'debito' || lower === 'debit') {
    return 'debito';
  }
  if (lower === 'credito' || lower === 'credit') {
    return 'credito';
  }

  return 'dinheiro';
}

function montarDashboardFinanceiro(contas, limiteMes, mapaCartoes, resumosCartoes = []) {
  const lista = Array.isArray(contas) ? contas : [];
  let despesas = 0;
  let totalPago = 0;
  let totalPendente = 0;
  let qtdPagas = 0;
  let qtdPendentes = 0;

  const composicao = { credito: 0, debito: 0, dinheiro: 0 };
  const categoriasMap = new Map();

  for (const conta of lista) {
    const valor = Number(conta?.valor) || 0;
    despesas += valor;

    if (conta?.paga) {
      totalPago += valor;
      qtdPagas += 1;
    } else {
      totalPendente += valor;
      qtdPendentes += 1;
    }

    const forma = classificarFormaDespesa(conta, mapaCartoes);
    composicao[forma] += valor;

    const categoriaId = conta?.categoria ? String(conta.categoria) : SEM_CATEGORIA;
    if (!categoriasMap.has(categoriaId)) {
      categoriasMap.set(categoriaId, { categoriaId, total: 0, quantidade: 0 });
    }
    const categoria = categoriasMap.get(categoriaId);
    categoria.total += valor;
    categoria.quantidade += 1;
  }

  const limiteMensal = Number(limiteMes) || 0;
  const disponivel = limiteMensal - despesas;
  const temLimite = limiteMensal > 0;
  const percentualLimite = temLimite ? calcularPercentual(despesas, limiteMensal) : null;

  const composicaoLista = FORMAS_DESPESA.map(({ chave, rotulo, cor, iconBg, icon }) => ({
    chave,
    rotulo,
    cor,
    iconBg,
    icon,
    valor: composicao[chave],
    percentual: calcularPercentual(composicao[chave], despesas),
  }));

  const topCategorias = [...categoriasMap.values()]
    .map((item) => ({
      ...item,
      percentual: calcularPercentual(item.total, despesas),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const cartoesCredito = (resumosCartoes || []).filter(
    (resumo) => !resumo?.ehDebito && Number(resumo?.limite) > 0
  );
  const mediaUtilizacao =
    cartoesCredito.length > 0
      ? cartoesCredito.reduce(
          (acc, resumo) => acc + (Number(resumo?.percentualUtilizado) || 0),
          0
        ) / cartoesCredito.length
      : null;
  const cartoesCriticos = cartoesCredito.filter(
    (resumo) => Number(resumo?.percentualUtilizado) >= 80
  ).length;
  const cartoesAtencao = cartoesCredito.filter((resumo) => {
    const pct = Number(resumo?.percentualUtilizado) || 0;
    return pct >= 50 && pct < 80;
  }).length;

  return {
    limiteMensal,
    despesas,
    disponivel,
    temLimite,
    percentualLimite,
    totalPago,
    totalPendente,
    qtdPagas,
    qtdPendentes,
    composicaoLista,
    topCategorias,
    cartoesResumo: {
      totalCartoes: (resumosCartoes || []).length,
      cartoesCredito: cartoesCredito.length,
      mediaUtilizacao,
      cartoesCriticos,
      cartoesAtencao,
    },
  };
}

function ResumoCard({ titulo, valor, subtitulo, icon, iconBg, iconColor, accentColor }) {
  return (
    <View style={styles.cardResumo}>
      <View style={[styles.cardResumoIconWrap, { backgroundColor: iconBg }]}>
        <AppIcon name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.tituloResumo}>{titulo}</Text>
      <Text style={[styles.valorResumo, accentColor ? { color: accentColor } : null]}>{valor}</Text>
      {subtitulo ? <Text style={styles.subtituloResumo}>{subtitulo}</Text> : null}
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

function UsoLimiteResumo({ percentual, temLimite, estouro }) {
  if (!temLimite) {
    return null;
  }

  const percentualReal = Number(percentual) || 0;
  const pctBarra = Math.min(100, Math.max(0, percentualReal));
  const cor = percentualReal > 100 ? '#D64545' : percentualReal > 80 ? '#E6A817' : '#1E8E5A';

  return (
    <View style={styles.usoLimiteCard}>
      <View style={styles.usoLimiteHeader}>
        <AppIcon name="speedometer-outline" size={16} color="#1E4DB7" />
        <Text style={styles.usoLimiteTitulo}>Uso do orçamento mensal</Text>
        <Text style={[styles.usoLimitePct, { color: cor }]}>{Math.round(percentualReal)}%</Text>
      </View>
      <View style={styles.barraTrack}>
        <View style={[styles.barraFill, { width: `${pctBarra}%`, backgroundColor: cor }]} />
      </View>
      {estouro ? (
        <Text style={styles.usoLimiteEstouro}>Orçamento estourado no período</Text>
      ) : null}
    </View>
  );
}

function ComposicaoItem({ rotulo, valor, percentual, cor, iconBg, icon }) {
  const larguraBarra = Math.min(100, Math.max(0, Number(percentual) || 0));

  return (
    <View style={styles.composicaoItem}>
      <View style={styles.composicaoHeader}>
        <View style={styles.composicaoLabelRow}>
          <View style={[styles.composicaoIconWrap, { backgroundColor: iconBg }]}>
            <AppIcon name={icon} size={16} color={cor} />
          </View>
          <View>
            <Text style={styles.composicaoRotulo}>{rotulo}</Text>
            <Text style={styles.composicaoPercentual}>{formatarPercentual(percentual)}</Text>
          </View>
        </View>
        <Text style={[styles.composicaoValor, { color: cor }]}>{formatCurrency(valor)}</Text>
      </View>
      <View style={styles.barraTrack}>
        <View style={[styles.barraFill, { width: `${larguraBarra}%`, backgroundColor: cor }]} />
      </View>
    </View>
  );
}

function CategoriaRankItem({ item, index, categorias }) {
  const larguraBarra = Math.min(100, Math.max(0, Number(item.percentual) || 0));

  return (
    <View style={styles.categoriaItem}>
      <View style={styles.categoriaTop}>
        <View style={styles.categoriaRankBadge}>
          <Text style={styles.categoriaRankTexto}>{index + 1}º</Text>
        </View>
        <View style={styles.categoriaInfo}>
          {item.categoriaId === SEM_CATEGORIA ? (
            <Text style={styles.categoriaNome}>Sem categoria</Text>
          ) : (
            <CategoriaLabel
              categoriaId={item.categoriaId}
              categorias={categorias}
              textStyle={styles.categoriaNome}
            />
          )}
          <Text style={styles.categoriaQuantidade}>
            {item.quantidade} lançamento{item.quantidade === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={styles.categoriaValores}>
          <Text style={styles.categoriaTotal}>{formatCurrency(item.total)}</Text>
          <Text style={styles.categoriaPercentual}>{formatarPercentual(item.percentual)}</Text>
        </View>
      </View>
      <View style={styles.barraTrack}>
        <View style={[styles.barraFill, { width: `${larguraBarra}%`, backgroundColor: '#1E4DB7' }]} />
      </View>
    </View>
  );
}

function IndicadorItem({ icon, iconBg, iconColor, rotulo, valor, detalhe, valorColor }) {
  return (
    <View style={styles.indicadorItem}>
      <View style={[styles.indicadorIconWrap, { backgroundColor: iconBg }]}>
        <AppIcon name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.indicadorTexto}>
        <Text style={styles.linhaRotulo}>{rotulo}</Text>
        {detalhe ? <Text style={styles.linhaDetalhe}>{detalhe}</Text> : null}
      </View>
      <Text style={[styles.linhaValor, valorColor ? { color: valorColor } : null]}>{valor}</Text>
    </View>
  );
}

function EstadoVazio({ icon, texto }) {
  return (
    <View style={styles.vazioWrap}>
      <AppIcon name={icon} size={22} color="#8CA0B3" />
      <Text style={styles.vazioTexto}>{texto}</Text>
    </View>
  );
}

export default function DashboardFinanceiro() {
  const insets = useSafeAreaInsets();
  const scrollBottomPadding = Math.max(insets.bottom + 32, 72);

  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear().toString());
  const [mes, setMes] = useState(hoje.getMonth().toString());
  const [contas, setContas] = useState([]);
  const [limiteMes, setLimiteMes] = useState(0);
  const [anosOptions, setAnosOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const { categorias } = useCategorias();
  const { mapa: mapaCartoes } = useCartoesLookup();
  const { resumos: resumosCartoes, carregar: carregarCartoes } = useDashboardCartoes();

  const carregarDados = useCallback(async () => {
    setLoading(true);

    try {
      const organization = await AsyncStorage.getItem(STORAGE_KEYS.userKeyShareId);
      const query = buildQueryParams({ ano, mes, organization });

      const [resPendentes, resPagas, limiteMensal] = await Promise.all([
        getDados(`/contas_pendentes?${query}`),
        getDados(`/contas_pagas?${query}`),
        obterLimiteMensal(ano, mes, organization),
      ]);

      if (!resPendentes?.success && !resPagas?.success) {
        Alert.alert(
          'Erro',
          resPendentes?.message || resPagas?.message || 'Falha ao carregar dashboard.'
        );
        setContas([]);
        setLimiteMes(0);
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
      setLimiteMes(limiteMensal);
    } catch (error) {
      Alert.alert('Erro', obterMensagemErro(error, 'Falha ao conectar com o servidor.'));
      setContas([]);
      setLimiteMes(0);
    } finally {
      setLoading(false);
    }
  }, [ano, mes]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useFocusEffect(
    useCallback(() => {
      carregarCartoes();
    }, [carregarCartoes])
  );

  const anosPicker = anosOptions.length > 0 ? anosOptions : [{ label: ano, value: ano }];

  const dashboard = useMemo(
    () => montarDashboardFinanceiro(contas, limiteMes, mapaCartoes, resumosCartoes),
    [contas, limiteMes, mapaCartoes, resumosCartoes]
  );

  const resumoFinanceiro = useMemo(
    () => [
      {
        titulo: 'Limite mensal',
        valor: dashboard.temLimite
          ? formatCurrency(dashboard.limiteMensal)
          : 'Sem limite definido',
        icon: 'wallet-outline',
        iconBg: '#E9F5FF',
        iconColor: '#1E4DB7',
        subtitulo: dashboard.temLimite ? 'Orçamento do mês' : 'Defina na Central de Controle',
      },
      {
        titulo: 'Despesas',
        valor: formatCurrency(dashboard.despesas),
        icon: 'stats-chart-outline',
        iconBg: '#FFF3E8',
        iconColor: '#C47A1A',
        accentColor: '#C47A1A',
        subtitulo: 'Vencimento no período',
      },
      {
        titulo:
          dashboard.temLimite && dashboard.disponivel < 0 ? 'Estouro' : 'Disponível',
        valor: dashboard.temLimite ? formatCurrency(dashboard.disponivel) : '—',
        icon:
          dashboard.temLimite && dashboard.disponivel < 0
            ? 'warning-outline'
            : 'checkmark-circle-outline',
        iconBg: dashboard.temLimite && dashboard.disponivel < 0 ? '#FDECEC' : '#EAF9EF',
        iconColor: dashboard.temLimite && dashboard.disponivel < 0 ? '#D64545' : '#1E8E5A',
        accentColor: dashboard.temLimite && dashboard.disponivel < 0 ? '#D64545' : '#1E8E5A',
        subtitulo: dashboard.temLimite
          ? dashboard.disponivel < 0
            ? 'Orçamento estourado'
            : 'Limite − despesas'
          : 'Sem limite definido',
      },
    ],
    [dashboard]
  );

  const textoUtilizacaoCartoes = useMemo(() => {
    const { totalCartoes, cartoesCredito, mediaUtilizacao, cartoesCriticos, cartoesAtencao } =
      dashboard.cartoesResumo;

    if (totalCartoes === 0) {
      return 'Nenhum cartão cadastrado';
    }

    if (cartoesCredito === 0) {
      return `${totalCartoes} cartão(ões) · sem limite de crédito`;
    }

    const partes = [`${cartoesCredito} crédito · média ${Math.round(mediaUtilizacao || 0)}%`];
    if (cartoesCriticos > 0) {
      partes.push(`${cartoesCriticos} crítico(s)`);
    } else if (cartoesAtencao > 0) {
      partes.push(`${cartoesAtencao} em atenção`);
    }
    return partes.join(' · ');
  }, [dashboard.cartoesResumo]);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 8, 12) }]}>
      <View style={styles.filtros}>
        <View style={styles.filtroColuna}>
          <View style={styles.pickerLabelRow}>
            <AppIcon name="calendar-outline" size={14} color="#1E4DB7" />
            <Text style={styles.pickerLabel}>Ano</Text>
          </View>
          <CustomPicker
            selectedValue={ano}
            onValueChange={setAno}
            options={anosPicker}
            placeholder="Selecione o ano"
            style={styles.picker}
          />
        </View>
        <View style={styles.filtroColuna}>
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

      {loading ? (
        <View style={styles.feedbackContainer}>
          <ActivityIndicator size="large" color="#1E4DB7" />
          <Text style={styles.feedbackText}>Carregando dashboard...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
          showsVerticalScrollIndicator
        >
          <SecaoHeader titulo="Resumo financeiro" icon="wallet-outline" />
          <View style={styles.cards}>
            {resumoFinanceiro.map((card) => (
              <ResumoCard key={card.titulo} {...card} />
            ))}
          </View>

          <UsoLimiteResumo
            percentual={dashboard.percentualLimite}
            temLimite={dashboard.temLimite}
            estouro={dashboard.temLimite && dashboard.disponivel < 0}
          />

          <SecaoHeader titulo="Composição das despesas" icon="pie-chart-outline" />
          <View style={styles.blocoCard}>
            {dashboard.despesas <= 0 ? (
              <EstadoVazio icon="inbox" texto="Nenhuma despesa no período." />
            ) : (
              dashboard.composicaoLista.map((item) => (
                <ComposicaoItem
                  key={item.chave}
                  rotulo={item.rotulo}
                  valor={item.valor}
                  percentual={item.percentual}
                  cor={item.cor}
                  iconBg={item.iconBg}
                  icon={item.icon}
                />
              ))
            )}
          </View>

          <SecaoHeader titulo="Top 5 categorias" icon="flag-outline" />
          <View style={styles.blocoCard}>
            {dashboard.topCategorias.length === 0 ? (
              <EstadoVazio icon="file-tray-outline" texto="Nenhuma categoria no período." />
            ) : (
              dashboard.topCategorias.map((item, index) => (
                <CategoriaRankItem
                  key={item.categoriaId}
                  item={item}
                  index={index}
                  categorias={categorias}
                />
              ))
            )}
          </View>

          <SecaoHeader titulo="Indicadores rápidos" icon="speedometer-outline" />
          <View style={styles.blocoCard}>
            <IndicadorItem
              icon="checkmark-circle-outline"
              iconBg="#EAF9EF"
              iconColor="#1E8E5A"
              rotulo="Contas pagas"
              valor={formatCurrency(dashboard.totalPago)}
              detalhe={`${dashboard.qtdPagas} conta(s) · ${formatarPercentual(
                calcularPercentual(dashboard.totalPago, dashboard.despesas)
              )} do total`}
              valorColor="#1E8E5A"
            />
            <IndicadorItem
              icon="time-outline"
              iconBg="#FFF3E8"
              iconColor="#C47A1A"
              rotulo="Contas pendentes"
              valor={formatCurrency(dashboard.totalPendente)}
              detalhe={`${dashboard.qtdPendentes} conta(s) · ${formatarPercentual(
                calcularPercentual(dashboard.totalPendente, dashboard.despesas)
              )} do total`}
              valorColor="#C47A1A"
            />
            <IndicadorItem
              icon="speedometer-outline"
              iconBg="#E9F5FF"
              iconColor="#1E4DB7"
              rotulo="Uso do limite do mês"
              valor={
                dashboard.temLimite
                  ? `${Math.round(dashboard.percentualLimite || 0)}%`
                  : 'Sem limite'
              }
              detalhe={
                dashboard.temLimite
                  ? dashboard.disponivel < 0
                    ? `Estouro de ${formatCurrency(Math.abs(dashboard.disponivel))}`
                    : `Restante: ${formatCurrency(dashboard.disponivel)}`
                  : 'Defina na Central de Controle'
              }
              valorColor={
                dashboard.temLimite && (dashboard.percentualLimite || 0) > 100
                  ? '#D64545'
                  : '#1E4DB7'
              }
            />
            <IndicadorItem
              icon="card-outline"
              iconBg="#F3EEFF"
              iconColor="#6B4FA3"
              rotulo="Utilização dos cartões"
              valor={
                dashboard.cartoesResumo.mediaUtilizacao != null
                  ? `${Math.round(dashboard.cartoesResumo.mediaUtilizacao)}%`
                  : '—'
              }
              detalhe={textoUtilizacaoCartoes}
            />
          </View>
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
  filtros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  filtroColuna: {
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
  scrollContent: {
    paddingTop: 4,
  },
  secaoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    marginTop: 12,
  },
  secaoTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16324F',
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
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
    fontSize: 11,
    color: '#6B7A90',
    marginBottom: 4,
    fontWeight: '600',
  },
  valorResumo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16324F',
  },
  subtituloResumo: {
    marginTop: 4,
    fontSize: 11,
    color: '#6B7A90',
    lineHeight: 15,
  },
  usoLimiteCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    padding: 12,
    marginBottom: 4,
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  usoLimiteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  usoLimiteTitulo: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#16324F',
  },
  usoLimitePct: {
    fontSize: 13,
    fontWeight: '800',
  },
  usoLimiteEstouro: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: '#D64545',
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
  blocoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    padding: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  composicaoItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F9',
  },
  composicaoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  composicaoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
  composicaoIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composicaoRotulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16324F',
  },
  composicaoPercentual: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7A90',
  },
  composicaoValor: {
    fontSize: 15,
    fontWeight: '800',
  },
  categoriaItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F9',
  },
  categoriaTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  categoriaRankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
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
    fontSize: 14,
    fontWeight: '700',
    color: '#16324F',
  },
  categoriaQuantidade: {
    marginTop: 2,
    fontSize: 11,
    color: '#8CA0B3',
  },
  categoriaValores: {
    alignItems: 'flex-end',
  },
  categoriaTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E4DB7',
  },
  categoriaPercentual: {
    marginTop: 2,
    fontSize: 12,
    color: '#0F7B6C',
    fontWeight: '600',
  },
  indicadorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F9',
    gap: 10,
  },
  indicadorIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicadorTexto: {
    flex: 1,
    paddingRight: 8,
  },
  linhaRotulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#33415C',
  },
  linhaDetalhe: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7A90',
    lineHeight: 16,
  },
  linhaValor: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16324F',
  },
  vazioWrap: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  vazioTexto: {
    fontSize: 13,
    color: '#607086',
    textAlign: 'center',
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
  },
});
