import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import MonthNavigator from '../components/MonthNavigator';
import CategoriaLabel from '../components/categorias/CategoriaLabel';
import useRelatorioContas from '../hooks/useRelatorioContas';
import useCategorias from '../hooks/useCategorias';
import { formatCurrency } from '../utils/util';

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

function ContaCard({ item, categorias, getSubcategorias, getLabelCartao }) {
  return (
    <View style={[styles.contaCard, styles.contaCardPendente]}>
      <View style={styles.contaCardTop}>
        <Text style={styles.contaNome} numberOfLines={2}>
          {item.nome}
        </Text>
        <View style={styles.badgePendente}>
          <Text style={styles.badgePendenteTexto}>Pendente</Text>
        </View>
      </View>

      <Text style={styles.contaValor}>{formatCurrency(item.valor)}</Text>

      <View style={styles.contaMetaRow}>
        <AppIcon name="calendar-outline" size={14} color="#1E4DB7" />
        <Text style={styles.contaMetaTexto}>Venc. {item.vencimento}</Text>
      </View>

      <View style={styles.contaMetaRow}>
        <AppIcon name="card-outline" size={14} color="#0F7B6C" />
        <Text style={styles.contaMetaTexto} numberOfLines={2}>
          {getLabelCartao(item.tipo_cartao_id ?? item.tipo_cartao)}
        </Text>
      </View>

      <CategoriaLabel
        categoriaId={item.categoria}
        subcategoriaId={item.subcategoria}
        categorias={categorias}
        subcategorias={getSubcategorias(item.categoria)}
        textStyle={styles.contaCategoria}
      />
    </View>
  );
}

export default function ContasAPagar() {
  const insets = useSafeAreaInsets();
  const listBottomPadding = Math.max(insets.bottom + 32, 72);

  const {
    ano,
    setAno,
    mes,
    setMes,
    contas,
    limiteMes,
    loading,
    setPosicaoTabelaY,
    alturaDisponivel,
    getLabelCartao,
  } = useRelatorioContas('/contas_pendentes', 'contasPendentes');
  const { categorias, getSubcategorias } = useCategorias();

  const totalPendente = contas.reduce((total, item) => total + parseFloat(item.valor || 0), 0);
  const listHeight = Math.max(alturaDisponivel - insets.bottom, 280);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 8, 12) }]}>
      <MonthNavigator mes={mes} ano={ano} setMes={setMes} setAno={setAno} style={styles.monthNavigator} />

      <View style={styles.cards}>
        <ResumoCard
          titulo="Total pendente"
          valor={formatCurrency(totalPendente)}
          icon="time-outline"
          iconBg="#FFF3E8"
          iconColor="#C47A1A"
          accentColor="#C47A1A"
        />
        <ResumoCard
          titulo="Limite do mês"
          valor={formatCurrency(limiteMes)}
          icon="wallet-outline"
          iconBg="#E9F5FF"
          iconColor="#1E4DB7"
        />
        <ResumoCard
          titulo="Quantidade"
          valor={String(contas.length)}
          icon="list-outline"
          iconBg="#F1F8EC"
          iconColor="#4A7C3F"
        />
      </View>

      <View style={styles.listaSectionHeader}>
        <AppIcon name="time-outline" size={18} color="#C47A1A" />
        <Text style={styles.listaSectionTitulo}>Contas pendentes</Text>
        {!loading ? <Text style={styles.listaSectionContagem}>{contas.length}</Text> : null}
      </View>

      <View
        style={[styles.listaContainer, { height: listHeight }]}
        onLayout={(event) => {
          const { y } = event.nativeEvent.layout;
          setPosicaoTabelaY(y);
        }}
      >
        {loading ? (
          <View style={styles.feedbackContainer}>
            <ActivityIndicator size="large" color="#1E4DB7" />
            <Text style={styles.feedbackText}>Carregando contas pendentes...</Text>
          </View>
        ) : (
          <FlatList
            data={contas}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <ContaCard
                item={item}
                categorias={categorias}
                getSubcategorias={getSubcategorias}
                getLabelCartao={getLabelCartao}
              />
            )}
            ListEmptyComponent={
              <View style={styles.feedbackContainer}>
                <AppIcon name="calendarCheck" size={24} color="#7B8BA3" />
                <Text style={styles.feedbackText}>
                  Nenhuma conta pendente encontrada para esse período.
                </Text>
              </View>
            }
            showsVerticalScrollIndicator
            contentContainerStyle={[styles.listContent, { paddingBottom: listBottomPadding }]}
          />
        )}
      </View>
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
    marginBottom: 4,
  },
  cardResumo: {
    width: '31%',
    minWidth: 100,
    flexGrow: 1,
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
    fontSize: 15,
    fontWeight: '800',
    color: '#16324F',
  },
  listaSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
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
    color: '#C47A1A',
    backgroundColor: '#FFF3E8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
  listaContainer: {
    borderWidth: 1,
    borderColor: '#E3EBF5',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F8FAFD',
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  contaCard: {
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 2,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E3EBF5',
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  contaCardPendente: {
    borderLeftWidth: 3,
    borderLeftColor: '#E6A817',
  },
  contaCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  contaNome: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#16324F',
    lineHeight: 20,
  },
  badgePendente: {
    backgroundColor: '#FFF3E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePendenteTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C47A1A',
  },
  contaValor: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16324F',
    marginBottom: 10,
  },
  contaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  contaMetaTexto: {
    flex: 1,
    fontSize: 13,
    color: '#33415C',
    fontWeight: '500',
  },
  contaCategoria: {
    fontSize: 12,
    color: '#6B7A90',
    marginTop: 2,
  },
  feedbackContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  feedbackText: {
    color: '#607086',
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 4,
  },
});
