import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Pressable } from 'react-native';
import { formatCurrency } from '../../utils/util';
import CartaoUtilizacaoBar from './CartaoUtilizacaoBar';
import { ModalCloseButton } from '../AppIcon';

function LinhaResumo({ rotulo, valor, destaque = false }) {
  return (
    <View style={styles.linha}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <Text style={[styles.valor, destaque && styles.valorDestaque]}>{valor}</Text>
    </View>
  );
}

export default function CartaoDashboardCard({ resumo }) {
  const [detalhesVisible, setDetalhesVisible] = useState(false);

  if (!resumo) {
    return null;
  }

  const temDetalhes = Array.isArray(resumo.contasFatura) && resumo.contasFatura.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTexto}>
          <Text style={styles.nome}>{resumo.nome}</Text>
          <Text style={styles.tipo}>{resumo.tipoLabel || resumo.tipo}</Text>
        </View>
      </View>

      <LinhaResumo
        rotulo="Limite"
        valor={resumo.limite > 0 ? formatCurrency(resumo.limite) : '—'}
      />
      <LinhaResumo rotulo="Utilizado" valor={formatCurrency(resumo.utilizado)} />
      <LinhaResumo
        rotulo="Disponível"
        valor={resumo.disponivel != null ? formatCurrency(resumo.disponivel) : '—'}
      />

      <CartaoUtilizacaoBar
        percentual={resumo.percentualUtilizado}
        faixa={resumo.faixaUtilizacao}
      />

      <View style={styles.faturaBox}>
        <Text style={styles.faturaTitulo}>Fatura Atual</Text>
        <Text style={styles.faturaValor}>{formatCurrency(resumo.faturaAtual)}</Text>
      </View>

      <View style={styles.datas}>
        {resumo.proximoVencimento ? (
          <View style={styles.dataItem}>
            <Text style={styles.dataRotulo}>Próximo vencimento</Text>
            <Text style={styles.dataValor}>{resumo.proximoVencimento}</Text>
          </View>
        ) : null}
        {resumo.proximoFechamento ? (
          <View style={styles.dataItem}>
            <Text style={styles.dataRotulo}>Próximo fechamento</Text>
            <Text style={styles.dataValor}>{resumo.proximoFechamento}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.lancamentos}>
        {resumo.qtdLancamentos}{' '}
        {resumo.qtdLancamentos === 1 ? 'lançamento' : 'lançamentos'}
      </Text>

      {temDetalhes ? (
        <TouchableOpacity style={styles.btnDetalhes} onPress={() => setDetalhesVisible(true)}>
          <Text style={styles.btnDetalhesTexto}>Ver detalhes</Text>
        </TouchableOpacity>
      ) : null}

      <Modal visible={detalhesVisible} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setDetalhesVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <ModalCloseButton
              onPress={() => setDetalhesVisible(false)}
              style={styles.fechar}
              color="#333"
            />
            <Text style={styles.modalTitulo}>Fatura — {resumo.nome}</Text>
            <Text style={styles.modalSubtitulo}>
              Vencimento {resumo.proximoVencimento} · Total{' '}
              {formatCurrency(resumo.faturaAtual)}
            </Text>
            <FlatList
              data={resumo.contasFatura}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <View style={styles.itemDetalhe}>
                  <View style={styles.itemDetalheInfo}>
                    <Text style={styles.itemDetalheNome}>{item.nome}</Text>
                    {item.parcela_atual && item.total_parcelas ? (
                      <Text style={styles.itemDetalheMeta}>
                        Parcela {item.parcela_atual}/{item.total_parcelas}
                      </Text>
                    ) : null}
                    {item.recorrencia_atual && item.total_recorrencias ? (
                      <Text style={styles.itemDetalheMeta}>
                        Recorrência {item.recorrencia_atual}/{item.total_recorrencias}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.itemDetalheValor}>{formatCurrency(item.valor)}</Text>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.vazio}>Nenhum lançamento neste ciclo.</Text>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#D9E4F2',
    elevation: 3,
    shadowColor: '#17305C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  headerTexto: {
    flex: 1,
  },
  nome: {
    fontSize: 17,
    fontWeight: '800',
    color: '#16324F',
  },
  tipo: {
    fontSize: 13,
    color: '#6B7A90',
    marginTop: 2,
  },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  rotulo: {
    fontSize: 13,
    color: '#5D6F86',
  },
  valor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#33415C',
  },
  valorDestaque: {
    color: '#16324F',
  },
  faturaBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E9F5FF',
    borderRadius: 10,
    alignItems: 'center',
  },
  faturaTitulo: {
    fontSize: 13,
    color: '#5D6F86',
  },
  faturaValor: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E4DB7',
    marginTop: 4,
  },
  datas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  dataItem: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    padding: 10,
    borderRadius: 8,
  },
  dataRotulo: {
    fontSize: 11,
    color: '#6B7A90',
  },
  dataValor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#33415C',
    marginTop: 2,
  },
  lancamentos: {
    marginTop: 10,
    fontSize: 13,
    color: '#607086',
    textAlign: 'center',
  },
  btnDetalhes: {
    marginTop: 10,
    paddingVertical: 10,
    backgroundColor: '#3b5998',
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDetalhesTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  fechar: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 1,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16324F',
    marginBottom: 4,
    paddingRight: 32,
  },
  modalSubtitulo: {
    fontSize: 13,
    color: '#6B7A90',
    marginBottom: 12,
  },
  itemDetalhe: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F7',
  },
  itemDetalheInfo: {
    flex: 1,
    paddingRight: 8,
  },
  itemDetalheNome: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B263B',
  },
  itemDetalheMeta: {
    fontSize: 11,
    color: '#6B7A90',
    marginTop: 2,
  },
  itemDetalheValor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#33415C',
  },
  vazio: {
    textAlign: 'center',
    color: '#6B7A90',
    marginTop: 20,
  },
});
