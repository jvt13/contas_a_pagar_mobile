import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AppIcon from '../components/AppIcon';

import CustomPicker from '../components/modal/CustomPicker';
import CategoriaLabel from '../components/categorias/CategoriaLabel';
import useRelatorioContas from '../hooks/useRelatorioContas';
import useCategorias from '../hooks/useCategorias';
import { mesesOptions, formatCurrency } from '../utils/util';

export default function ContasAPagar() {
  const {
    ano,
    setAno,
    mes,
    setMes,
    anosOptions,
    contas,
    limiteMes,
    loading,
    posicaoTabelaY,
    setPosicaoTabelaY,
    alturaDisponivel,
    getLabelCartao,
  } = useRelatorioContas('/contas_pendentes', 'contasPendentes');
  const { categorias } = useCategorias();

  const totalPendente = contas.reduce((total, item) => total + parseFloat(item.valor || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.filtros}>
        <View style={styles.filtroColuna}>
          <CustomPicker
            selectedValue={ano}
            onValueChange={setAno}
            options={anosOptions}
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
        <Resumo titulo="Valor total pendente" valor={formatCurrency(totalPendente)} cor="#FFF3E8" />
        <Resumo titulo="Limite do mês" valor={formatCurrency(limiteMes)} cor="#E9F5FF" />
      </View>

      <View
        style={[styles.tabelaContainer, { height: Math.max(alturaDisponivel, 280) }]}
        onLayout={(event) => {
          const { y } = event.nativeEvent.layout;
          setPosicaoTabelaY(y);
        }}
      >
        <ScrollView horizontal>
          <View style={styles.tableContent}>
            <View style={styles.cabecalhoLinha}>
              <Text style={[styles.cabecalho, { width: 140, textAlign: 'left' }]}>Nome</Text>
              <Text style={[styles.cabecalho, { width: 130 }]}>Cartão</Text>
              <Text style={[styles.cabecalho, { width: 110 }]}>Categoria</Text>
              <Text style={[styles.cabecalho, { width: 110 }]}>Vencimento</Text>
              <Text style={[styles.cabecalho, { width: 110 }]}>Valor</Text>
            </View>

            {loading ? (
              <View style={styles.feedbackContainer}>
                <ActivityIndicator size="large" color="#1E4DB7" />
                <Text style={styles.feedbackText}>Carregando contas pendentes...</Text>
              </View>
            ) : (
              <FlatList
                data={contas}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={[styles.itemCard, styles.itemCardPendente]}>
                    <View style={styles.itemContent}>
                      <View style={{ width: 140 }}>
                        <Text style={styles.cellTitle} numberOfLines={1}>
                          {item.nome}
                        </Text>
                        <CategoriaLabel
                          categoriaId={item.categoria}
                          categorias={categorias}
                          textStyle={styles.cellSubtext}
                        />
                      </View>
                      <Text style={[styles.cell, { width: 130 }]} numberOfLines={2}>
                        {getLabelCartao(item.tipo_cartao)}
                      </Text>
                      <CategoriaLabel
                        categoriaId={item.categoria}
                        categorias={categorias}
                        textStyle={styles.cell}
                        style={{ width: 110 }}
                      />
                      <Text style={[styles.cell, { width: 110 }]}>{item.vencimento}</Text>
                      <Text style={[styles.cell, { width: 110 }]}>
                        {formatCurrency(item.valor)}
                      </Text>
                    </View>
                  </View>
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
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function Resumo({ titulo, valor, cor }) {
  return (
    <View style={[styles.cardResumo, { backgroundColor: cor }]}>
      <Text style={styles.tituloResumo}>{titulo}</Text>
      <Text style={styles.valorResumo}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#F4F8FF',
  },
  filtros: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filtroColuna: {
    flex: 1,
  },
  picker: {
    minWidth: 120,
    height: 50,
    marginHorizontal: 5,
    borderRadius: 10,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  tabelaContainer: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#D9E4F2',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  tableContent: {
    minWidth: 600,
    maxWidth: 1000,
  },
  cabecalhoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF4FF',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  cabecalho: {
    fontWeight: '800',
    fontSize: 13,
    color: '#33415C',
    textAlign: 'center',
  },
  itemCard: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  itemCardPendente: {
    backgroundColor: '#FFF8F2',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cell: {
    fontSize: 13,
    color: '#33415C',
    textAlign: 'center',
  },
  cellTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1B263B',
  },
  cellSubtext: {
    fontSize: 12,
    color: '#6B7A90',
    marginTop: 2,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  cardResumo: {
    width: '48%',
    padding: 16,
    borderRadius: 14,
    marginVertical: 5,
    elevation: 3,
    shadowColor: '#17305C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  tituloResumo: {
    fontSize: 13,
    color: '#5D6F86',
    marginBottom: 6,
  },
  valorResumo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16324F',
  },
  feedbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  feedbackText: {
    color: '#607086',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
});
