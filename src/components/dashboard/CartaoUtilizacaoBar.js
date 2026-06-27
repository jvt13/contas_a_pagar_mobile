import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CORES = {
  normal: '#1E8E5A',
  atencao: '#E6A817',
  critico: '#D64545',
  sem_limite: '#6B7A90',
};

export default function CartaoUtilizacaoBar({ percentual, faixa = 'sem_limite', estourado = false }) {
  if (percentual == null || !Number.isFinite(Number(percentual))) {
    return (
      <View style={styles.container}>
        <Text style={styles.semLimite}>Sem limite definido</Text>
      </View>
    );
  }

  const percentualReal = Number(percentual) || 0;
  const larguraBarra = Math.min(100, Math.max(0, percentualReal));
  const cor = estourado ? CORES.critico : CORES[faixa] || CORES.normal;
  const label = estourado
    ? `${percentualReal.toFixed(1)}% · Limite estourado`
    : `${Math.round(percentualReal)}% utilizado`;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${larguraBarra}%`, backgroundColor: cor }]} />
      </View>
      <Text style={[styles.label, { color: cor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    marginBottom: 4,
  },
  track: {
    height: 8,
    backgroundColor: '#EEF3F9',
    borderRadius: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 8,
    minWidth: 4,
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  semLimite: {
    fontSize: 12,
    color: '#6B7A90',
    fontWeight: '600',
  },
});
