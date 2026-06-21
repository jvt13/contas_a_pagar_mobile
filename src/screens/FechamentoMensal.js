import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppIcon from '../components/AppIcon';
import CustomPicker from '../components/modal/CustomPicker';
import CategoriaLabel from '../components/categorias/CategoriaLabel';
import useCategorias from '../hooks/useCategorias';
import useFechamentoMensal from '../hooks/useFechamentoMensal';
import { obterLimiteMensal } from '../hooks/useLimites';
import { getDados } from '../utils/services';
import { STORAGE_KEYS } from '../utils/authSession';
import {
  montarAnosOptions,
  montarResumoFechamento,
  SEM_CATEGORIA,
  unificarContasPorVencimento,
} from '../utils/resumoFinanceiroVencimento';
import {
  buildQueryParams,
  formatCurrency,
  mesesOptions,
  msgToast,
  obterMensagemErro,
} from '../utils/util';

function formatarPercentual(valor) {
  const percentual = Number(valor);
  if (!Number.isFinite(percentual)) {
    return '—';
  }
  return `${percentual.toFixed(1)}%`;
}

function rotuloMesAno(mes, ano) {
  const opcao = mesesOptions.find((item) => item.value === String(mes));
  const nomeMes = opcao?.label || `Mês ${Number(mes) + 1}`;
  return `${nomeMes}/${ano}`;
}

function LinhaResumo({ rotulo, valor, destaque }) {
  return (
    <View style={styles.linhaResumo}>
      <Text style={styles.linhaRotulo}>{rotulo}</Text>
      <Text style={[styles.linhaValor, destaque && styles.linhaValorDestaque]}>{valor}</Text>
    </View>
  );
}

export default function FechamentoMensal() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear().toString());
  const [mes, setMes] = useState(hoje.getMonth().toString());
  const [contas, setContas] = useState([]);
  const [limiteMes, setLimiteMes] = useState(0);
  const [anosOptions, setAnosOptions] = useState([]);
  const [loadingContas, setLoadingContas] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const { categorias } = useCategorias();
  const {
    loading: loadingFechamentos,
    carregar: carregarFechamentos,
    obterFechamento,
    salvarFechamento,
    removerFechamento,
  } = useFechamentoMensal();

  const fechamentoSalvo = obterFechamento(ano, mes);
  const mesFechado = fechamentoSalvo?.status === 'fechado';

  const carregarContas = useCallback(async () => {
    setLoadingContas(true);

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
          resPendentes?.message || resPagas?.message || 'Falha ao carregar dados do mês.'
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
      setLoadingContas(false);
    }
  }, [ano, mes]);

  useEffect(() => {
    carregarContas();
  }, [carregarContas]);

  useFocusEffect(
    useCallback(() => {
      carregarFechamentos();
      carregarContas();
    }, [carregarFechamentos, carregarContas])
  );

  useEffect(() => {
    setObservacao(fechamentoSalvo?.observacao || '');
  }, [fechamentoSalvo?.id, fechamentoSalvo?.observacao]);

  const resumo = useMemo(
    () => montarResumoFechamento(contas, limiteMes),
    [contas, limiteMes]
  );

  const anosPicker = anosOptions.length > 0 ? anosOptions : [{ label: ano, value: ano }];
  const loading = loadingContas || loadingFechamentos;

  const montarSnapshot = useCallback(() => {
    return {
      ano: Number(ano),
      mes: String(mes),
      limiteMensal: resumo.limiteMensal,
      despesasTotais: resumo.despesasTotais,
      totalPago: resumo.totalPago,
      totalPendente: resumo.totalPendente,
      disponivel: resumo.disponivel,
      percentualUso: resumo.percentualUso,
      quantidadeContas: resumo.quantidadeContas,
      quantidadePagas: resumo.quantidadePagas,
      quantidadePendentes: resumo.quantidadePendentes,
      topCategorias: resumo.topCategorias,
      observacao: observacao.trim(),
    };
  }, [ano, mes, resumo, observacao]);

  const executarSalvar = async () => {
    setSalvando(true);
    try {
      await salvarFechamento(montarSnapshot());
      msgToast(mesFechado ? 'Fechamento atualizado!' : 'Mês fechado com sucesso!');
    } catch (error) {
      Alert.alert('Erro', obterMensagemErro(error, 'Não foi possível salvar o fechamento.'));
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvar = () => {
    const titulo = mesFechado ? 'Atualizar fechamento' : 'Fechar mês';
    const mensagem = mesFechado
      ? `Deseja sobrescrever o fechamento de ${rotuloMesAno(mes, ano)} com os valores atuais?`
      : `Deseja salvar o fechamento de ${rotuloMesAno(mes, ano)}?`;

    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel' },
      { text: mesFechado ? 'Atualizar' : 'Fechar mês', onPress: executarSalvar },
    ]);
  };

  const handleReabrir = () => {
    Alert.alert(
      'Reabrir mês',
      `Deseja remover o fechamento salvo de ${rotuloMesAno(mes, ano)}? As contas e pagamentos não serão alterados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reabrir',
          style: 'destructive',
          onPress: async () => {
            try {
              await removerFechamento(ano, mes);
              setObservacao('');
              msgToast('Mês reaberto.');
            } catch (error) {
              Alert.alert('Erro', obterMensagemErro(error, 'Não foi possível reabrir o mês.'));
            }
          },
        },
      ]
    );
  };

  const textoDisponivel = resumo.temLimite
    ? resumo.disponivel < 0
      ? `Estouro de ${formatCurrency(Math.abs(resumo.disponivel))}`
      : formatCurrency(resumo.disponivel)
    : '—';

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
          <Text style={styles.feedbackText}>Carregando fechamento...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
          <View style={styles.cabecalho}>
            <Text style={styles.tituloPeriodo}>{rotuloMesAno(mes, ano)}</Text>
            {mesFechado ? (
              <View style={styles.badgeFechado}>
                <AppIcon name="lock-closed-outline" size={14} color="#0F7B6C" />
                <Text style={styles.badgeFechadoTexto}>Fechado</Text>
              </View>
            ) : (
              <View style={styles.badgeAberto}>
                <Text style={styles.badgeAbertoTexto}>Aberto</Text>
              </View>
            )}
          </View>

          {mesFechado && fechamentoSalvo?.fechadoEm ? (
            <Text style={styles.fechadoEmTexto}>
              Fechado em{' '}
              {new Date(fechamentoSalvo.fechadoEm).toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </Text>
          ) : null}

          <Text style={styles.secaoTitulo}>Prévia do fechamento</Text>
          <View style={styles.blocoCard}>
            <LinhaResumo
              rotulo="Limite mensal"
              valor={
                resumo.temLimite ? formatCurrency(resumo.limiteMensal) : 'Sem limite definido'
              }
            />
            <LinhaResumo
              rotulo="Despesas totais"
              valor={formatCurrency(resumo.despesasTotais)}
            />
            <LinhaResumo rotulo="Pago" valor={formatCurrency(resumo.totalPago)} />
            <LinhaResumo rotulo="Pendente" valor={formatCurrency(resumo.totalPendente)} />
            <LinhaResumo rotulo="Disponível / estouro" valor={textoDisponivel} destaque />
            <LinhaResumo
              rotulo="Uso do limite"
              valor={
                resumo.temLimite ? formatarPercentual(resumo.percentualUso) : 'Sem limite'
              }
            />
            <LinhaResumo
              rotulo="Contas no período"
              valor={`${resumo.quantidadeContas} (${resumo.quantidadePagas} pagas · ${resumo.quantidadePendentes} pendentes)`}
            />
          </View>

          <Text style={styles.secaoTitulo}>Top 5 categorias</Text>
          <View style={styles.blocoCard}>
            {resumo.topCategorias.length === 0 ? (
              <Text style={styles.vazioTexto}>Nenhuma despesa no período.</Text>
            ) : (
              resumo.topCategorias.map((item, index) => (
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

          <Text style={styles.secaoTitulo}>Observação (opcional)</Text>
          <TextInput
            style={styles.inputObservacao}
            value={observacao}
            onChangeText={setObservacao}
            placeholder="Ex.: mês com gastos maiores em mercado"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.btnPrimario, salvando && styles.btnDisabled]}
            onPress={handleSalvar}
            disabled={salvando}
          >
            <AppIcon
              name={mesFechado ? 'refresh-outline' : 'checkmark-circle-outline'}
              size={20}
              color="#fff"
            />
            <Text style={styles.btnPrimarioText}>
              {salvando
                ? 'Salvando...'
                : mesFechado
                  ? 'Atualizar fechamento'
                  : 'Fechar mês'}
            </Text>
          </TouchableOpacity>

          {mesFechado ? (
            <TouchableOpacity style={styles.btnSecundario} onPress={handleReabrir}>
              <AppIcon name="lock-open-outline" size={20} color="#D64545" />
              <Text style={styles.btnSecundarioText}>Reabrir mês</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.notaRodape}>
            O fechamento é um snapshot de conferência. Contas, pagamentos e limites continuam
            editáveis normalmente.
          </Text>
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
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tituloPeriodo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#16324F',
  },
  badgeFechado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F7F1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeFechadoTexto: {
    color: '#0F7B6C',
    fontWeight: '700',
    fontSize: 12,
  },
  badgeAberto: {
    backgroundColor: '#E9F5FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeAbertoTexto: {
    color: '#1E4DB7',
    fontWeight: '700',
    fontSize: 12,
  },
  fechadoEmTexto: {
    fontSize: 12,
    color: '#6B7A90',
    marginBottom: 8,
  },
  secaoTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16324F',
    marginBottom: 8,
    marginTop: 4,
  },
  blocoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D9E4F2',
    padding: 14,
    marginBottom: 14,
  },
  linhaResumo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  linhaRotulo: {
    fontSize: 14,
    color: '#6B7A90',
    flex: 1,
    paddingRight: 8,
  },
  linhaValor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16324F',
    textAlign: 'right',
  },
  linhaValorDestaque: {
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
  vazioTexto: {
    fontSize: 13,
    color: '#607086',
    textAlign: 'center',
    paddingVertical: 8,
  },
  inputObservacao: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D9E4F2',
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    color: '#16324F',
    marginBottom: 16,
  },
  btnPrimario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E4DB7',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  btnPrimarioText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F5C6C6',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  btnSecundarioText: {
    color: '#D64545',
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  notaRodape: {
    fontSize: 12,
    color: '#6B7A90',
    textAlign: 'center',
    lineHeight: 18,
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
    marginTop: 8,
  },
});
