import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AppIcon from './AppIcon';
import { mesesOptions } from '../utils/util';

function resolverLabelMes(mes) {
  const opcao = mesesOptions.find((item) => item.value === String(mes ?? ''));
  return opcao?.label || 'Mês';
}

function navegarMes(mes, ano, delta, setMes, setAno) {
  const mesAtual = Number(mes);
  const anoAtual = Number(ano);

  if (!Number.isFinite(mesAtual) || !Number.isFinite(anoAtual)) {
    return;
  }

  let novoMes = mesAtual + delta;
  let novoAno = anoAtual;

  if (novoMes < 0) {
    novoMes = 11;
    novoAno -= 1;
  } else if (novoMes > 11) {
    novoMes = 0;
    novoAno += 1;
  }

  setMes(String(novoMes));
  setAno(String(novoAno));
}

export default function MonthNavigator({ mes, ano, setMes, setAno, style }) {
  const labelMes = resolverLabelMes(mes);
  const label = `${labelMes}/${ano}`;

  const irMesAnterior = useCallback(() => {
    navegarMes(mes, ano, -1, setMes, setAno);
  }, [mes, ano, setMes, setAno]);

  const irMesSeguinte = useCallback(() => {
    navegarMes(mes, ano, 1, setMes, setAno);
  }, [mes, ano, setMes, setAno]);

  return (
    <View style={[styles.container, style]} accessibilityRole="adjustable">
      <TouchableOpacity
        onPress={irMesAnterior}
        style={styles.botaoSeta}
        activeOpacity={0.75}
        accessibilityLabel="Mês anterior"
      >
        <AppIcon name="chevron-back-outline" size={22} color="#1E4DB7" />
      </TouchableOpacity>

      <View style={styles.centro}>
        <AppIcon name="calendar-outline" size={16} color="#1E4DB7" />
        <Text style={styles.label}>{label}</Text>
      </View>

      <TouchableOpacity
        onPress={irMesSeguinte}
        style={styles.botaoSeta}
        activeOpacity={0.75}
        accessibilityLabel="Próximo mês"
      >
        <AppIcon name="chevron-forward-outline" size={22} color="#1E4DB7" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    paddingVertical: 10,
    paddingHorizontal: 8,
    elevation: 2,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  botaoSeta: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E9F5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centro: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16324F',
    textAlign: 'center',
  },
});
