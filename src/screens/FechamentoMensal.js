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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppIcon from '../components/AppIcon';
import MonthNavigator from '../components/MonthNavigator';
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

function formatarDataFechamento(iso) {
  if (!iso) {
    return null;
  }
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) {
    return null;
  }
  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
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

function StatusCard({ mesFechado, fechadoEmFormatado }) {
  return (
    <View style={[styles.statusCard, mesFechado ? styles.statusCardFechado : styles.statusCardAberto]}>
      <View style={styles.statusCardHeader}>
        <View style={[styles.statusIconWrap, mesFechado ? styles.statusIconWrapFechado : styles.statusIconWrapAberto]}>
          <AppIcon
            name={mesFechado ? 'lock-closed-outline' : 'lock-open-outline'}
            size={20}
            color={mesFechado ? '#0F7B6C' : '#C47A1A'}
          />
        </View>
        <View style={styles.statusCardTexto}>
          <Text style={styles.statusTitulo}>{mesFechado ? 'Mês fechado' : 'Mês aberto'}</Text>
          <Text style={styles.statusSubtitulo}>
            {mesFechado
              ? fechadoEmFormatado
                ? `Snapshot salvo em ${fechadoEmFormatado}.`
                : 'Snapshot de fechamento salvo.'
              : 'Este mês ainda não possui snapshot de fechamento.'}
          </Text>
        </View>
        {mesFechado ? (
          <View style={styles.badgeFechado}>
            <Text style={styles.badgeFechadoTexto}>Fechado</Text>
          </View>
        ) : (
          <View style={styles.badgeAberto}>
            <Text style={styles.badgeAbertoTexto}>Aberto</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function UsoOrcamentoBarra({ percentual, temLimite, disponivel, estouro }) {
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
        <Text style={styles.usoLimiteEstouro}>
          Estouro: {formatCurrency(Math.abs(Number(disponivel) || 0))}
        </Text>
      ) : (
        <Text style={styles.usoLimiteDisponivel}>Disponível: {formatCurrency(disponivel)}</Text>
      )}
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

function EstadoVazio({ icon, texto }) {
  return (
    <View style={styles.vazioWrap}>
      <AppIcon name={icon} size={22} color="#8CA0B3" />
      <Text style={styles.vazioTexto}>{texto}</Text>
    </View>
  );
}

function InfoCard({ texto }) {
  return (
    <View style={styles.infoCard}>
      <AppIcon name="information-circle-outline" size={20} color="#1E4DB7" />
      <Text style={styles.infoCardTexto}>{texto}</Text>
    </View>
  );
}

export default function FechamentoMensal() {
  const insets = useSafeAreaInsets();
  const scrollBottomPadding = Math.max(insets.bottom + 32, 72);

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
  const fechadoEmFormatado = formatarDataFechamento(fechamentoSalvo?.fechadoEm);

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

  const loading = loadingContas || loadingFechamentos;
  const estouro = resumo.temLimite && resumo.disponivel < 0;
  const semContas = resumo.quantidadeContas === 0;

  const resumoCards = useMemo(
    () => [
      {
        titulo: 'Limite mensal',
        valor: resumo.temLimite ? formatCurrency(resumo.limiteMensal) : 'Sem limite',
        icon: 'wallet-outline',
        iconBg: '#E9F5FF',
        iconColor: '#1E4DB7',
        subtitulo: resumo.temLimite ? 'Orçamento do mês' : 'Defina na Central de Controle',
      },
      {
        titulo: 'Total de despesas',
        valor: formatCurrency(resumo.despesasTotais),
        icon: 'stats-chart-outline',
        iconBg: '#FFF3E8',
        iconColor: '#C47A1A',
        accentColor: '#C47A1A',
        subtitulo: 'Vencimento no período',
      },
      {
        titulo: 'Pago',
        valor: formatCurrency(resumo.totalPago),
        icon: 'checkmark-circle-outline',
        iconBg: '#EAF9EF',
        iconColor: '#1E8E5A',
        accentColor: '#1E8E5A',
        subtitulo: `${resumo.quantidadePagas} conta(s)`,
      },
      {
        titulo: 'Pendente',
        valor: formatCurrency(resumo.totalPendente),
        icon: 'time-outline',
        iconBg: '#FFF8E6',
        iconColor: '#E6A817',
        accentColor: '#E6A817',
        subtitulo: `${resumo.quantidadePendentes} conta(s)`,
      },
      {
        titulo: estouro ? 'Estouro' : 'Disponível',
        valor: resumo.temLimite ? formatCurrency(resumo.disponivel) : '—',
        icon: estouro ? 'warning-outline' : 'cash-outline',
        iconBg: estouro ? '#FDECEC' : '#EAF9EF',
        iconColor: estouro ? '#D64545' : '#1E8E5A',
        accentColor: estouro ? '#D64545' : '#1E8E5A',
        subtitulo: resumo.temLimite
          ? estouro
            ? 'Orçamento estourado'
            : 'Limite − despesas'
          : 'Sem limite definido',
      },
      {
        titulo: 'Percentual usado',
        valor: resumo.temLimite ? formatarPercentual(resumo.percentualUso) : '—',
        icon: 'speedometer-outline',
        iconBg: '#E9F5FF',
        iconColor: '#1E4DB7',
        accentColor:
          resumo.temLimite && (Number(resumo.percentualUso) || 0) > 100
            ? '#D64545'
            : '#1E4DB7',
        subtitulo: resumo.temLimite ? 'Uso do orçamento' : 'Sem limite',
      },
    ],
    [resumo, estouro]
  );

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

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 8, 12) }]}>
      <MonthNavigator mes={mes} ano={ano} setMes={setMes} setAno={setAno} style={styles.monthNavigator} />

      {loading ? (
        <View style={styles.feedbackContainer}>
          <ActivityIndicator size="large" color="#1E4DB7" />
          <Text style={styles.feedbackText}>Carregando fechamento...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
          showsVerticalScrollIndicator
        >
          <StatusCard mesFechado={mesFechado} fechadoEmFormatado={fechadoEmFormatado} />

          {semContas ? (
            <InfoCard texto="Nenhuma conta com vencimento neste mês. Você ainda pode fechar o mês para registrar o snapshot." />
          ) : null}

          <SecaoHeader titulo="Resumo financeiro" icon="wallet-outline" />
          <View style={styles.cards}>
            {resumoCards.map((card) => (
              <ResumoCard key={card.titulo} {...card} />
            ))}
          </View>

          <View style={styles.contasResumoCard}>
            <AppIcon name="list-outline" size={16} color="#1E4DB7" />
            <Text style={styles.contasResumoTexto}>
              {resumo.quantidadeContas} conta(s) no período · {resumo.quantidadePagas} paga(s) ·{' '}
              {resumo.quantidadePendentes} pendente(s)
            </Text>
          </View>

          <UsoOrcamentoBarra
            percentual={resumo.percentualUso}
            temLimite={resumo.temLimite}
            disponivel={resumo.disponivel}
            estouro={estouro}
          />

          <SecaoHeader titulo="Top 5 categorias" icon="flag-outline" />
          <View style={styles.blocoCard}>
            {resumo.topCategorias.length === 0 ? (
              <EstadoVazio icon="file-tray-outline" texto="Nenhuma despesa no período." />
            ) : (
              resumo.topCategorias.map((item, index) => (
                <CategoriaRankItem
                  key={item.categoriaId}
                  item={item}
                  index={index}
                  categorias={categorias}
                />
              ))
            )}
          </View>

          <SecaoHeader titulo="Observação" icon="create-outline" />
          <View style={styles.observacaoCard}>
            <Text style={styles.observacaoLabel}>Observação (opcional)</Text>
            <TextInput
              style={styles.inputObservacao}
              value={observacao}
              onChangeText={setObservacao}
              placeholder="Ex.: mês com gastos maiores em mercado"
              placeholderTextColor="#8CA0B3"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {mesFechado ? (
            <>
              <TouchableOpacity
                style={[styles.btnPrimario, salvando && styles.btnDisabled]}
                onPress={handleSalvar}
                disabled={salvando}
                activeOpacity={0.85}
              >
                <AppIcon name="refresh-outline" size={20} color="#fff" />
                <Text style={styles.btnPrimarioText}>
                  {salvando ? 'Salvando...' : 'Atualizar fechamento'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnDestrutivo}
                onPress={handleReabrir}
                activeOpacity={0.85}
              >
                <AppIcon name="lock-open-outline" size={20} color="#D64545" />
                <Text style={styles.btnDestrutivoText}>Reabrir mês</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.btnFechar, salvando && styles.btnDisabled]}
              onPress={handleSalvar}
              disabled={salvando}
              activeOpacity={0.85}
            >
              <AppIcon name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.btnFecharText}>{salvando ? 'Salvando...' : 'Fechar mês'}</Text>
            </TouchableOpacity>
          )}

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
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#F4F8FF',
  },
  monthNavigator: {
    marginBottom: 10,
  },
  scrollContent: {
    paddingTop: 4,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  statusCardAberto: {
    borderColor: '#F5DFC4',
    backgroundColor: '#FFFBF5',
  },
  statusCardFechado: {
    borderColor: '#C8E8DC',
    backgroundColor: '#F7FFFB',
  },
  statusCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  statusIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconWrapAberto: {
    backgroundColor: '#FFF3E8',
  },
  statusIconWrapFechado: {
    backgroundColor: '#E6F7F1',
  },
  statusCardTexto: {
    flex: 1,
    paddingRight: 8,
  },
  statusTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16324F',
    marginBottom: 4,
  },
  statusSubtitulo: {
    fontSize: 13,
    color: '#6B7A90',
    lineHeight: 18,
  },
  badgeFechado: {
    backgroundColor: '#E6F7F1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeFechadoTexto: {
    color: '#0F7B6C',
    fontWeight: '700',
    fontSize: 11,
  },
  badgeAberto: {
    backgroundColor: '#FFF3E8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeAbertoTexto: {
    color: '#C47A1A',
    fontWeight: '700',
    fontSize: 11,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#E9F5FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C5D9F5',
    padding: 12,
    marginBottom: 10,
  },
  infoCardTexto: {
    flex: 1,
    fontSize: 13,
    color: '#33415C',
    lineHeight: 18,
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
  contasResumoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  contasResumoTexto: {
    flex: 1,
    fontSize: 12,
    color: '#6B7A90',
    fontWeight: '600',
    lineHeight: 16,
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
  usoLimiteDisponivel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#1E8E5A',
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
  observacaoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    padding: 14,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  observacaoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#33415C',
    marginBottom: 8,
  },
  inputObservacao: {
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E3EBF5',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    color: '#16324F',
  },
  btnFechar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E8E5A',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  btnFecharText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
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
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  btnPrimarioText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  btnDestrutivo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#F5C6C6',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  btnDestrutivoText: {
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
