import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppIcon from '../AppIcon';
import { resolverBancoParaCartao } from '../../utils/bancos';

export default function BancoBadge({
  cartao,
  banco,
  size = 'md',
  showNome = false,
  style,
}) {
  const info = banco || resolverBancoParaCartao(cartao);
  const dim = size === 'sm' ? 32 : size === 'lg' ? 52 : 40;
  const fontSize = size === 'sm' ? 11 : size === 'lg' ? 16 : 13;
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;

  if (!info) {
    return (
      <View style={[styles.wrapper, style]}>
        <View style={[styles.badge, { width: dim, height: dim, backgroundColor: '#E8EEF5' }]}>
          <AppIcon name="card-outline" size={iconSize} color="#6B7A90" />
        </View>
        {showNome ? <Text style={styles.nomeFallback}>Banco</Text> : null}
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={[
          styles.badge,
          {
            width: dim,
            height: dim,
            backgroundColor: info.cor,
          },
        ]}
      >
        <Text style={[styles.sigla, { fontSize, color: info.corTexto || '#fff' }]}>
          {info.sigla}
        </Text>
      </View>
      {showNome ? (
        <Text style={styles.nome} numberOfLines={1}>
          {info.nome}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  badge: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sigla: {
    fontWeight: '800',
  },
  nome: {
    marginTop: 4,
    fontSize: 11,
    color: '#33415C',
    fontWeight: '600',
    textAlign: 'center',
  },
  nomeFallback: {
    marginTop: 4,
    fontSize: 11,
    color: '#6B7A90',
  },
});
