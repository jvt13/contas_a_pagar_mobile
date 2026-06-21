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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  { chave: 'credito', rotulo: 'Crédito' },
  { chave: 'debito', rotulo: 'Débito' },
  { chave: 'dinheiro', rotulo: 'Dinheiro' },
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

  const composicaoLista = FORMAS_DESPESA.map(({ chave, rotulo }) => ({
    chave,
    rotulo,
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

function ResumoCard({ titulo, valor, cor, subtitulo }) {
  return (
    <View style={[styles.cardResumo, { backgroundColor: cor }]}>
      <Text style={styles.tituloResumo}>{titulo}</Text>
      <Text style={styles.valorResumo}>{valor}</Text>
      {subtitulo ? <Text style={styles.subtituloResumo}>{subtitulo}</Text> : null}
    </View>
  );
}

function SecaoTitulo({ titulo }) {
  return <Text style={styles.secaoTitulo}>{titulo}</Text>;
}

function LinhaIndicador({ rotulo, valor, detalhe }) {
  return (
    <View style={styles.linhaIndicador}>
      <View style={styles.linhaIndicadorTexto}>
        <Text style={styles.linhaRotulo}>{rotulo}</Text>
        {detalhe ? <Text style={styles.linhaDetalhe}>{detalhe}</Text> : null}
      </View>
      <Text style={styles.linhaValor}>{valor}</Text>
    </View>
  );
}

export default function DashboardFinanceiro() {
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
        cor: '#E9F5FF',
        subtitulo: dashboard.temLimite ? 'Orçamento do mês' : 'Defina na Central de Controle',
      },
      {
        titulo: 'Despesas',
        valor: formatCurrency(dashboard.despesas),
        cor: '#FFF3E8',
        subtitulo: 'Vencimento no período',
      },
      {
        titulo: 'Disponível',
        valor: dashboard.temLimite ? formatCurrency(dashboard.disponivel) : '—',
        cor:
          dashboard.temLimite && dashboard.disponivel < 0 ? '#FDECEC' : '#EAF9EF',
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

      {loading ? (
        <View style={styles.feedbackContainer}>
          <ActivityIndicator size="large" color="#1E4DB7" />
          <Text style={styles.feedbackText}>Carregando dashboard...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
          <SecaoTitulo>Resumo financeiro</SecaoTitulo>
          <View style={styles.cards}>
            {resumoFinanceiro.map((card) => (
              <ResumoCard key={card.titulo} {...card} />
            ))}
          </View>

          <SecaoTitulo>Composição das despesas</SecaoTitulo>
          <View style={styles.blocoCard}>
            {dashboard.despesas <= 0 ? (
              <Text style={styles.vazioTexto}>Nenhuma despesa no período.</Text>
            ) : (
              dashboard.composicaoLista.map((item) => (
                <View key={item.chave} style={styles.linhaComposicao}>
                  <View>
                    <Text style={styles.composicaoRotulo}>{item.rotulo}</Text>
                    <Text style={styles.composicaoPercentual}>
                      {formatarPercentual(item.percentual)} das despesas
                    </Text>
                  </View>
                  <Text style={styles.composicaoValor}>{formatCurrency(item.valor)}</Text>
                </View>
              ))
            )}
          </View>

          <SecaoTitulo>Top 5 categorias</SecaoTitulo>
          <View style={styles.blocoCard}>
            {dashboard.topCategorias.length === 0 ? (
              <Text style={styles.vazioTexto}>Nenhuma categoria no período.</Text>
            ) : (
              dashboard.topCategorias.map((item, index) => (
                <View key={item.categoriaId} style={styles.linhaCategoria}>
                  <View style={styles.categoriaInfo}>
                    <Text style={styles.categoriaRank}>{index + 1}º</Text>
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
                    <Text style={styles.categoriaPercentual}>
                      {formatarPercentual(item.percentual)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <SecaoTitulo>Indicadores rápidos</SecaoTitulo>
          <View style={styles.blocoCard}>
            <LinhaIndicador
              rotulo="Contas pagas"
              valor={formatCurrency(dashboard.totalPago)}
              detalhe={`${dashboard.qtdPagas} conta(s)`}
            />
            <LinhaIndicador
              rotulo="Contas pendentes"
              valor={formatCurrency(dashboard.totalPendente)}
              detalhe={`${dashboard.qtdPendentes} conta(s)`}
            />
            <LinhaIndicador
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
            />
            <LinhaIndicador
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
  scrollContent: {
    paddingBottom: 24,
  },
  secaoTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16324F',
    marginBottom: 8,
    marginTop: 4,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardResumo: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    marginVertical: 4,
    elevation: 2,
  },
  tituloResumo: {
    fontSize: 12,
    color: '#5D6F86',
    marginBottom: 6,
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
  },
  blocoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E4F2',
    padding: 14,
    marginBottom: 14,
  },
  linhaComposicao: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  composicaoRotulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#33415C',
  },
  composicaoPercentual: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7A90',
  },
  composicaoValor: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E4DB7',
  },
  linhaCategoria: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  categoriaInfo: {
    flex: 1,
    paddingRight: 10,
  },
  categoriaRank: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8CA0B3',
    marginBottom: 2,
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
  linhaIndicador: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  linhaIndicadorTexto: {
    flex: 1,
    paddingRight: 10,
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
  },
  linhaValor: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16324F',
  },
  vazioTexto: {
    fontSize: 13,
    color: '#607086',
    textAlign: 'center',
    paddingVertical: 8,
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
    marginTop: 8,
  },
});
