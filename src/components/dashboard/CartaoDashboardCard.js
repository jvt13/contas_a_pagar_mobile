import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Pressable } from 'react-native';
import { formatCurrency } from '../../utils/util';
import CartaoUtilizacaoBar from './CartaoUtilizacaoBar';
import AppIcon, { ModalCloseButton } from '../AppIcon';
import BancoBadge from '../bancos/BancoBadge';

const BADGE_TIPO = {
  credito: { label: 'Crédito', cor: '#1E4DB7', bg: '#E9F5FF', icon: 'card-outline' },
  debito: { label: 'Débito', cor: '#0F7B6C', bg: '#EAF9EF', icon: 'card-outline' },
};

const BADGE_FAIXA = {
  normal: { label: 'Uso normal', cor: '#1E8E5A', bg: '#EAF9EF' },
  atencao: { label: 'Alto uso', cor: '#E6A817', bg: '#FFF8E6' },
  critico: { label: 'Uso crítico', cor: '#D64545', bg: '#FFF0F0' },
};

function MetricaItem({ rotulo, valor, accentColor }) {
  return (
    <View style={styles.metricaItem}>
      <Text style={styles.metricaRotulo}>{rotulo}</Text>
      <Text style={[styles.metricaValor, accentColor ? { color: accentColor } : null]}>{valor}</Text>
    </View>
  );
}

function TipoBadge({ ehDebito }) {
  const config = ehDebito ? BADGE_TIPO.debito : BADGE_TIPO.credito;

  return (
    <View style={[styles.tipoBadge, { backgroundColor: config.bg }]}>
      <AppIcon name={config.icon} size={12} color={config.cor} />
      <Text style={[styles.tipoBadgeTexto, { color: config.cor }]}>{config.label}</Text>
    </View>
  );
}

function StatusBadge({ label, cor, bg }) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text style={[styles.statusBadgeTexto, { color: cor }]}>{label}</Text>
    </View>
  );
}

function formatarLinhaDatas(proximoFechamento, proximoVencimento) {
  const partes = [];

  if (proximoFechamento) {
    partes.push(`Próx. fechamento ${proximoFechamento}`);
  }
  if (proximoVencimento) {
    partes.push(`Próx. vencimento ${proximoVencimento}`);
  }

  return partes.length > 0 ? partes.join(' · ') : null;
}

export default function CartaoDashboardCard({ resumo }) {
  const [detalhesVisible, setDetalhesVisible] = useState(false);

  const ehDebito = resumo?.ehDebito === true;
  const temDetalhes = Array.isArray(resumo?.contasFatura) && resumo.contasFatura.length > 0;

  const limite = Number(resumo?.limite) || 0;
  const utilizado = Number(resumo?.utilizado) || 0;
  const temLimite = limite > 0;
  const estourado = temLimite && utilizado > limite;
  const percentualReal = temLimite ? (utilizado / limite) * 100 : null;

  const badges = useMemo(() => {
    if (!resumo) {
      return [];
    }

    const lista = [];

    if (ehDebito) {
      return lista;
    }

    if (!temLimite) {
      lista.push({ label: 'Sem limite', cor: '#6B7A90', bg: '#F0F4FA' });
    }

    if (estourado) {
      lista.push({ label: 'Limite estourado', cor: '#D64545', bg: '#FFF0F0' });
    } else if (temLimite && resumo.faixaUtilizacao && BADGE_FAIXA[resumo.faixaUtilizacao]) {
      const faixa = BADGE_FAIXA[resumo.faixaUtilizacao];
      if (resumo.faixaUtilizacao !== 'normal') {
        lista.push(faixa);
      }
    }

    return lista;
  }, [resumo, ehDebito, temLimite, estourado]);

  const linhaDatas = formatarLinhaDatas(resumo?.proximoFechamento, resumo?.proximoVencimento);

  if (!resumo) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <BancoBadge cartao={{ banco_slug: resumo.bancoSlug, nome: resumo.nome }} size="lg" />
        <View style={styles.headerTexto}>
          <Text style={styles.nome}>{resumo.bancoNome || resumo.nomeExibicao || resumo.nome}</Text>
          {resumo.apelido ? <Text style={styles.apelido}>{resumo.apelido}</Text> : null}
        </View>
        <TipoBadge ehDebito={ehDebito} />
      </View>

      {badges.length > 0 ? (
        <View style={styles.badgesRow}>
          {badges.map((badge) => (
            <StatusBadge key={badge.label} {...badge} />
          ))}
        </View>
      ) : null}

      {ehDebito ? (
        <>
          <View style={styles.metricasGrid}>
            <MetricaItem
              rotulo="Gastos no mês"
              valor={formatCurrency(resumo.gastosNoMes || 0)}
              accentColor="#0F7B6C"
            />
            <MetricaItem
              rotulo="Lançamentos"
              valor={String(resumo.qtdLancamentos || 0)}
            />
          </View>
          <View style={styles.debitoInfo}>
            <AppIcon name="information-circle-outline" size={14} color="#6B7A90" />
            <Text style={styles.debitoInfoTexto}>
              Cartão débito — acompanha gastos pagos no mês corrente
            </Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.metricasGrid}>
            <MetricaItem
              rotulo="Limite"
              valor={temLimite ? formatCurrency(limite) : '—'}
            />
            <MetricaItem rotulo="Usado" valor={formatCurrency(utilizado)} accentColor="#C47A1A" />
            <MetricaItem
              rotulo={estourado ? 'Estouro' : 'Disponível'}
              valor={
                temLimite
                  ? estourado
                    ? formatCurrency(utilizado - limite)
                    : formatCurrency(resumo.disponivel ?? Math.max(0, limite - utilizado))
                  : '—'
              }
              accentColor={estourado ? '#D64545' : '#1E8E5A'}
            />
          </View>

          <CartaoUtilizacaoBar
            percentual={percentualReal}
            faixa={estourado ? 'critico' : resumo.faixaUtilizacao}
            estourado={estourado}
          />

          <View style={styles.faturaBox}>
            <View style={styles.faturaHeader}>
              <AppIcon name="receipt-outline" size={16} color="#1E4DB7" />
              <Text style={styles.faturaTitulo}>Fatura atual</Text>
            </View>
            <Text style={styles.faturaValor}>{formatCurrency(resumo.faturaAtual)}</Text>
            <Text style={styles.lancamentos}>
              {resumo.qtdLancamentos}{' '}
              {resumo.qtdLancamentos === 1 ? 'lançamento' : 'lançamentos'} neste ciclo
            </Text>
          </View>

          {linhaDatas ? (
            <View style={styles.datasRow}>
              <AppIcon name="calendar-outline" size={14} color="#6B7A90" />
              <Text style={styles.datasTexto}>{linhaDatas}</Text>
            </View>
          ) : null}
        </>
      )}

      {ehDebito && temDetalhes ? (
        <Text style={styles.lancamentosDebito}>
          {resumo.qtdLancamentos}{' '}
          {resumo.qtdLancamentos === 1 ? 'lançamento pago' : 'lançamentos pagos'}
        </Text>
      ) : null}

      {temDetalhes ? (
        <TouchableOpacity
          style={styles.btnDetalhes}
          onPress={() => setDetalhesVisible(true)}
          activeOpacity={0.85}
        >
          <AppIcon name="list-outline" size={18} color="#1E4DB7" />
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
            <Text style={styles.modalTitulo}>
              {ehDebito ? 'Lançamentos — ' : 'Fatura — '}
              {resumo.nome}
            </Text>
            <Text style={styles.modalSubtitulo}>
              {ehDebito
                ? `Total ${formatCurrency(resumo.gastosNoMes || 0)}`
                : `Vencimento ${resumo.proximoVencimento} · Total ${formatCurrency(resumo.faturaAtual)}`}
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
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    elevation: 3,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF3F9',
  },
  headerTexto: {
    flex: 1,
  },
  nome: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16324F',
  },
  apelido: {
    fontSize: 12,
    color: '#6B7A90',
    marginTop: 2,
  },
  tipoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  tipoBadgeTexto: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeTexto: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  metricaItem: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: '28%',
    backgroundColor: '#F8FAFD',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EEF3F9',
  },
  metricaRotulo: {
    fontSize: 11,
    color: '#6B7A90',
    fontWeight: '600',
    marginBottom: 4,
  },
  metricaValor: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16324F',
  },
  debitoInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#F8FAFD',
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
  },
  debitoInfoTexto: {
    flex: 1,
    fontSize: 12,
    color: '#6B7A90',
    lineHeight: 16,
  },
  faturaBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#E9F5FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C5D9F5',
  },
  faturaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  faturaTitulo: {
    fontSize: 12,
    color: '#5D6F86',
    fontWeight: '700',
  },
  faturaValor: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E4DB7',
    marginTop: 2,
  },
  datasRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF3F9',
  },
  datasTexto: {
    flex: 1,
    fontSize: 12,
    color: '#6B7A90',
    lineHeight: 16,
    fontWeight: '600',
  },
  lancamentos: {
    marginTop: 6,
    fontSize: 11,
    color: '#6B7A90',
  },
  lancamentosDebito: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7A90',
    textAlign: 'center',
  },
  btnDetalhes: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#C5D9F5',
    borderRadius: 12,
  },
  btnDetalhesTexto: {
    color: '#1E4DB7',
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
    borderBottomColor: '#EEF3F9',
  },
  itemDetalheInfo: {
    flex: 1,
    paddingRight: 8,
  },
  itemDetalheNome: {
    fontSize: 14,
    fontWeight: '600',
    color: '#16324F',
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
