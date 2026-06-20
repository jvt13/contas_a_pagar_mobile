import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppIcon from '../components/AppIcon';
import CustomPicker from '../components/modal/CustomPicker';
import CategoriaLabel from '../components/categorias/CategoriaLabel';
import useCategorias from '../hooks/useCategorias';
import { getDados } from '../utils/services';
import { STORAGE_KEYS } from '../utils/authSession';
import {
  buildQueryParams,
  formatCurrency,
  mesesOptions,
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
        quantidade: 0,
        subcategoriasMap: new Map(),
      });
    }

    const categoria = categoriasMap.get(categoriaId);
    categoria.total += valor;
    categoria.quantidade += 1;

    if (!categoria.subcategoriasMap.has(subcategoriaId)) {
      categoria.subcategoriasMap.set(subcategoriaId, {
        subcategoriaId,
        total: 0,
        quantidade: 0,
      });
    }

    const subcategoria = categoria.subcategoriasMap.get(subcategoriaId);
    subcategoria.total += valor;
    subcategoria.quantidade += 1;
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

function ResumoCard({ titulo, valor, cor }) {
  return (
    <View style={[styles.cardResumo, { backgroundColor: cor }]}>
      <Text style={styles.tituloResumo}>{titulo}</Text>
      <Text style={styles.valorResumo}>{valor}</Text>
    </View>
  );
}

export default function RelatorioCategorias() {
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

  const anosPicker = anosOptions.length > 0 ? anosOptions : [{ label: ano, value: ano }];

  const relatorio = useMemo(() => montarRelatorioCategorias(contas), [contas]);

  const resumoCards = useMemo(
    () => [
      {
        titulo: 'Total lançado',
        valor: formatCurrency(relatorio.totalLancado),
        cor: '#E9F5FF',
      },
      {
        titulo: 'Total pago',
        valor: formatCurrency(relatorio.totalPago),
        cor: '#EAF9EF',
      },
      {
        titulo: 'Total pendente',
        valor: formatCurrency(relatorio.totalPendente),
        cor: '#FFF3E8',
      },
    ],
    [relatorio]
  );

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

      <View style={styles.cards}>
        {resumoCards.map((card) => (
          <ResumoCard key={card.titulo} titulo={card.titulo} valor={card.valor} cor={card.cor} />
        ))}
      </View>

      {loading ? (
        <View style={styles.feedbackContainer}>
          <ActivityIndicator size="large" color="#1E4DB7" />
          <Text style={styles.feedbackText}>Carregando relatório...</Text>
        </View>
      ) : relatorio.categorias.length === 0 ? (
        <View style={styles.feedbackContainer}>
          <AppIcon name="inbox" size={24} color="#7B8BA3" />
          <Text style={styles.feedbackText}>Nenhuma conta com vencimento neste período.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listaContent} showsVerticalScrollIndicator>
          {relatorio.categorias.map((grupo) => (
            <View key={grupo.categoriaId} style={styles.categoriaCard}>
              <View style={styles.categoriaHeader}>
                <View style={styles.categoriaTituloWrap}>
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
                  <Text style={styles.percentualTexto}>
                    {formatarPercentual(grupo.percentualTotal)} do total
                  </Text>
                </View>
              </View>

              {grupo.subcategorias.map((sub) => (
                <View key={`${grupo.categoriaId}-${sub.subcategoriaId}`} style={styles.subcategoriaRow}>
                  <View style={styles.subcategoriaTituloWrap}>
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
                    <Text style={styles.subPercentual}>
                      {formatarPercentual(sub.percentualCategoria)} da categoria
                    </Text>
                    <Text style={styles.subPercentualGeral}>
                      {formatarPercentual(sub.percentualTotal)} do total
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
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
  listaContent: {
    paddingBottom: 24,
  },
  categoriaCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E4F2',
    marginBottom: 12,
    overflow: 'hidden',
  },
  categoriaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    backgroundColor: '#EDF4FF',
  },
  categoriaTituloWrap: {
    flex: 1,
    paddingRight: 10,
  },
  categoriaNome: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16324F',
  },
  quantidadeTexto: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7A90',
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
    marginTop: 4,
    fontSize: 12,
    color: '#5D6F86',
    fontWeight: '600',
  },
  subcategoriaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EDF1F7',
  },
  subcategoriaTituloWrap: {
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
    color: '#0F7B6C',
  },
  subPercentualGeral: {
    marginTop: 2,
    fontSize: 11,
    color: '#6B7A90',
  },
});
