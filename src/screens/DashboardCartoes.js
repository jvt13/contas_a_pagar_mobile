import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import CartaoDashboardCard from '../components/dashboard/CartaoDashboardCard';
import useDashboardCartoes from '../hooks/useDashboardCartoes';
import { formatCurrency } from '../utils/util';

function SecaoHeader({ titulo, icon, iconColor = '#1E4DB7' }) {
  return (
    <View style={styles.secaoHeader}>
      <AppIcon name={icon} size={18} color={iconColor} />
      <Text style={styles.secaoTitulo}>{titulo}</Text>
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

function ResumoSuperior({ resumoGeral }) {
  const { totalCartoes, limiteTotal, usadoTotal, disponivelTotal, temLimite, percentualUso, estouro } =
    resumoGeral;

  const cards = [
    {
      titulo: 'Cartões',
      valor: String(totalCartoes),
      icon: 'card-outline',
      iconBg: '#E9F5FF',
      iconColor: '#1E4DB7',
    },
    {
      titulo: 'Limite total',
      valor: temLimite ? formatCurrency(limiteTotal) : '—',
      icon: 'wallet-outline',
      iconBg: '#F3EEFF',
      iconColor: '#6B4FA3',
    },
    {
      titulo: 'Usado total',
      valor: formatCurrency(usadoTotal),
      icon: 'stats-chart-outline',
      iconBg: '#FFF3E8',
      iconColor: '#C47A1A',
      accentColor: '#C47A1A',
    },
    {
      titulo: estouro ? 'Estouro' : 'Disponível total',
      valor: temLimite ? formatCurrency(disponivelTotal) : '—',
      icon: estouro ? 'warning-outline' : 'checkmark-circle-outline',
      iconBg: estouro ? '#FDECEC' : '#EAF9EF',
      iconColor: estouro ? '#D64545' : '#1E8E5A',
      accentColor: estouro ? '#D64545' : '#1E8E5A',
    },
  ];

  return (
    <View style={styles.resumoSuperior}>
      <SecaoHeader titulo="Resumo geral" icon="grid-outline" />
      <View style={styles.cardsGrid}>
        {cards.map((card) => (
          <ResumoCard key={card.titulo} {...card} />
        ))}
      </View>
      {temLimite ? (
        <View style={styles.usoGeralCard}>
          <View style={styles.usoGeralHeader}>
            <AppIcon name="speedometer-outline" size={16} color="#1E4DB7" />
            <Text style={styles.usoGeralTitulo}>Uso agregado do limite</Text>
            <Text
              style={[
                styles.usoGeralPct,
                {
                  color: estouro ? '#D64545' : (percentualUso || 0) > 80 ? '#E6A817' : '#1E8E5A',
                },
              ]}
            >
              {Number.isFinite(percentualUso) ? `${Math.round(percentualUso)}%` : '—'}
            </Text>
          </View>
          <View style={styles.barraTrack}>
            <View
              style={[
                styles.barraFill,
                {
                  width: `${Math.min(100, Math.max(0, percentualUso || 0))}%`,
                  backgroundColor: estouro
                    ? '#D64545'
                    : (percentualUso || 0) > 80
                      ? '#E6A817'
                      : '#1E8E5A',
                },
              ]}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function EstadoVazio({ icon, titulo, texto }) {
  return (
    <View style={styles.estadoCard}>
      <View style={styles.estadoIconWrap}>
        <AppIcon name={icon} size={28} color="#8CA0B3" />
      </View>
      <Text style={styles.estadoTitulo}>{titulo}</Text>
      <Text style={styles.estadoTexto}>{texto}</Text>
    </View>
  );
}

function EstadoErro({ mensagem, onRetry }) {
  return (
    <View style={styles.estadoCard}>
      <View style={[styles.estadoIconWrap, styles.estadoIconWrapErro]}>
        <AppIcon name="alert-circle-outline" size={28} color="#D64545" />
      </View>
      <Text style={styles.estadoTitulo}>Não foi possível carregar</Text>
      <Text style={styles.estadoTextoErro}>{mensagem}</Text>
      <TouchableOpacity style={styles.btnRetry} onPress={onRetry} activeOpacity={0.85}>
        <AppIcon name="refresh-outline" size={18} color="#fff" />
        <Text style={styles.btnRetryTexto}>Tentar novamente</Text>
      </TouchableOpacity>
    </View>
  );
}

function montarResumoGeral(resumos) {
  const lista = Array.isArray(resumos) ? resumos : [];
  const credito = lista.filter((item) => item?.ehDebito !== true);

  const limiteTotal = credito.reduce((acc, item) => acc + (Number(item.limite) || 0), 0);
  const usadoTotal = credito.reduce((acc, item) => acc + (Number(item.utilizado) || 0), 0);
  const temLimite = limiteTotal > 0;
  const disponivelTotal = temLimite ? limiteTotal - usadoTotal : null;
  const percentualUso = temLimite ? (usadoTotal / limiteTotal) * 100 : null;

  return {
    totalCartoes: lista.length,
    limiteTotal,
    usadoTotal,
    disponivelTotal,
    temLimite,
    percentualUso: Number.isFinite(percentualUso) ? percentualUso : null,
    estouro: temLimite && disponivelTotal < 0,
  };
}

export default function DashboardCartoes() {
  const insets = useSafeAreaInsets();
  const scrollBottomPadding = Math.max(insets.bottom + 32, 72);

  const { resumos, loading, erro, carregar } = useDashboardCartoes();

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const resumoGeral = useMemo(() => montarResumoGeral(resumos), [resumos]);
  const exibirConteudo = !loading || resumos.length > 0;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 8, 12) }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollBottomPadding }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregar} />}
        showsVerticalScrollIndicator
      >
        <Text style={styles.subtitulo}>
          Limite, fatura atual e próximos vencimentos por cartão
        </Text>

        {loading && resumos.length === 0 ? (
          <View style={styles.feedback}>
            <ActivityIndicator size="large" color="#1E4DB7" />
            <Text style={styles.feedbackTexto}>Carregando indicadores...</Text>
          </View>
        ) : null}

        {!loading && erro ? (
          <EstadoErro mensagem={erro} onRetry={carregar} />
        ) : null}

        {!loading && !erro && resumos.length === 0 ? (
          <EstadoVazio
            icon="card-outline"
            titulo="Nenhum cartão cadastrado"
            texto="Cadastre um cartão na Central de Controle para acompanhar limites e faturas."
          />
        ) : null}

        {!erro && resumos.length > 0 ? (
          <>
            <ResumoSuperior resumoGeral={resumoGeral} />
            <SecaoHeader titulo="Seus cartões" icon="card-outline" />
            {resumos.map((resumo) => (
              <CartaoDashboardCard key={String(resumo.id)} resumo={resumo} />
            ))}
          </>
        ) : null}

        {loading && resumos.length > 0 && exibirConteudo ? (
          <View style={styles.atualizandoWrap}>
            <ActivityIndicator size="small" color="#1E4DB7" />
            <Text style={styles.atualizandoTexto}>Atualizando...</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8FF',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  subtitulo: {
    fontSize: 13,
    color: '#6B7A90',
    marginBottom: 12,
    lineHeight: 18,
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
  resumoSuperior: {
    marginBottom: 8,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  cardResumo: {
    width: '48%',
    minHeight: 88,
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
    fontSize: 15,
    fontWeight: '800',
    color: '#16324F',
  },
  usoGeralCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    padding: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  usoGeralHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  usoGeralTitulo: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#16324F',
  },
  usoGeralPct: {
    fontSize: 13,
    fontWeight: '800',
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
  feedback: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  feedbackTexto: {
    fontSize: 14,
    color: '#607086',
    textAlign: 'center',
  },
  estadoCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  estadoIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F0F4FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  estadoIconWrapErro: {
    backgroundColor: '#FDECEC',
  },
  estadoTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16324F',
    marginBottom: 8,
    textAlign: 'center',
  },
  estadoTexto: {
    fontSize: 14,
    color: '#6B7A90',
    textAlign: 'center',
    lineHeight: 20,
  },
  estadoTextoErro: {
    fontSize: 14,
    color: '#D64545',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  btnRetry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E4DB7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  btnRetryTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  atualizandoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  atualizandoTexto: {
    fontSize: 13,
    color: '#6B7A90',
  },
});
