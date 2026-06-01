import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CORES = {
  normal: '#1E8E5A',
  atencao: '#E6A817',
  critico: '#D64545',
  sem_limite: '#3b5998',
};

export default function CartaoUtilizacaoBar({ percentual, faixa = 'sem_limite' }) {
  const pct = percentual != null ? Math.min(100, Math.max(0, percentual)) : null;
  const cor = CORES[faixa] || CORES.sem_limite;

  if (pct == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.semLimite}>Limite não configurado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: cor }]} />
      </View>
      <Text style={[styles.label, { color: cor }]}>{pct}% utilizado</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 4,
  },
  track: {
    height: 10,
    backgroundColor: '#E8EEF5',
    borderRadius: 6,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
  },
  label: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  semLimite: {
    fontSize: 12,
    color: '#6B7A90',
    fontStyle: 'italic',
  },
});
