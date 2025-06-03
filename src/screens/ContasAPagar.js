// src/screens/ContasAPagar.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getDados } from '../utils/services';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ContasAPagar() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear().toString());
  const [mes, setMes] = useState(hoje.getMonth().toString());
  const [anosOptions, setAnosOptions] = useState([]);
  const [contasAPagar, setContasAPagar] = useState([]);

  const loadContasAPagar = async () => {
    try {
      // 1) busca a chave da organização no AsyncStorage
      const organization = await AsyncStorage.getItem('@userKeyShareId');
      const query = new URLSearchParams({ ano, mes, organization }).toString();

      // 2) faz GET para o endpoint /contas_a_pagar
      const data = await getDados(`/contas_pendentes?${query}`);

      if (data.success) {
        // 3) extrai só os valores “ano” (pode vir como { ano: 2024 } ou apenas 2024)
        const anosArray = (data.anos || []).map(item =>
          typeof item === 'object' ? item.ano : item
        );
        console.log('Anos disponíveis:', anosArray); // Debugging line
        setAnosOptions(anosArray);

        console.log('Contas a pagar carregadas:', data.contasPendentes.length); // Debugging line

        // 4) seta lista de contas a pagar
        setContasAPagar(data.contasPendentes || []);
      } else {
        Alert.alert('Erro', data.message || 'Falha ao carregar contas a pagar');
      }
    } catch (err) {
      Alert.alert('Erro', 'Falha ao conectar com o servidor');
    }
  };

  useEffect(() => {
    loadContasAPagar();
  }, [ano, mes]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contas a Pagar</Text>

      {/* Filtros de Ano e Mês */}
      <View style={styles.filtros}>
        <Picker
          selectedValue={ano}
          onValueChange={setAno}
          style={styles.picker}
          dropdownIconColor="#000"
        >
          {anosOptions.map((a, idx) => (
            <Picker.Item key={idx} label={String(a)} value={String(a)} />
          ))}
        </Picker>
        <Picker
          selectedValue={mes}
          onValueChange={setMes}
          style={styles.picker}
          dropdownIconColor="#000"
        >
          <Picker.Item label="Janeiro" value="0" />
          <Picker.Item label="Fevereiro" value="1" />
          <Picker.Item label="Março" value="2" />
          <Picker.Item label="Abril" value="3" />
          <Picker.Item label="Maio" value="4" />
          <Picker.Item label="Junho" value="5" />
          <Picker.Item label="Julho" value="6" />
          <Picker.Item label="Agosto" value="7" />
          <Picker.Item label="Setembro" value="8" />
          <Picker.Item label="Outubro" value="9" />
          <Picker.Item label="Novembro" value="10" />
          <Picker.Item label="Dezembro" value="11" />
        </Picker>
      </View>

      {/* Cabeçalho da tabela (mesmas colunas de “Contas Pagas”) */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, { flex: 2 }]}>Nome</Text>
        <Text style={styles.headerCell}>Cartão</Text>
        <Text style={styles.headerCell}>Categoria</Text>
        <Text style={styles.headerCell}>Vencimento</Text>
        <Text style={styles.headerCell}>Valor</Text>
      </View>

      {/* Lista de Contas a Pagar */}
      <FlatList
        data={contasAPagar}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>
              {item.nome}
            </Text>
            <Text style={styles.cell}>{item.tipo_cartao}</Text>
            <Text style={styles.cell}>{item.categoria}</Text>
            <Text style={styles.cell}>{item.vencimento}</Text>
            <Text style={styles.cell}>
              R$ {parseFloat(item.valor).toFixed(2).replace('.', ',')}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  filtros: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  picker: { flex: 1, height: 50, marginHorizontal: 5 },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderColor: '#000',
    paddingBottom: 6,
    marginBottom: 4,
  },
  headerCell: { flex: 1, fontWeight: 'bold', textAlign: 'center' },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#ccc' },
  cell: { flex: 1, textAlign: 'center' },
  list: { paddingBottom: 20 },
});
