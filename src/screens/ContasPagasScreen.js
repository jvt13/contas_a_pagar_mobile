import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ContasPagasScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contas Pagas</Text>
      {/* Aqui vai a lógica de listagem de contas pagas */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
});
