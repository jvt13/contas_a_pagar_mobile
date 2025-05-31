import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { getDados, postDados } from '../utils/services';
import { getStorageItem } from '../utils/util';

export default function ContasPagas() {
  const today = new Date();
  const [ano, setAno] = useState(today.getFullYear().toString());
  const [mes, setMes] = useState(today.getMonth().toString());
  const [anosOptions, setAnosOptions] = useState([]);
  const [contasPagas, setContasPagas] = useState([]);

  const loadContasPagas = async () => {
    try {
      //console.log('Carregando contas pagas para:', ano, mes); // Debugging line
      const organization = await getStorageItem('@userKeyShareId');
      //console.log('Organização:', organization); // Debugging line
      const query = new URLSearchParams({ ano, mes, organization }).toString();
      const data = await getDados(`/contas_pagas?${query}`);

      if (data.success) {
        console.log('Contas pagas carregadas:', data.contasPagas.length); // Debugging line
        //console.log('Anos disponíveis:', data.anos); // Debugging line
        const anosArray = (data.anos || []).map(item =>
          typeof item === 'object' ? item.ano : item
        );
        setAnosOptions(anosArray);

        //const pagas = (data.contas || []).filter(c => c.paga);
        const pagas = data.contasPagas || [];
        setContasPagas(pagas);
      } else {
        Alert.alert('Erro', data.message || 'Falha ao carregar contas pagas');
      }
    } catch (err) {
      Alert.alert('Erro', 'Falha de conexão com o servidor');
    }
  };

  useEffect(() => {
    loadContasPagas();
  }, [ano, mes]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contas Pagas</Text>
      {/* Filtros de Ano e Mês */}
      <View style={styles.filtros}>
        <Picker
          selectedValue={ano}
          onValueChange={setAno}
          style={styles.picker}
          dropdownIconColor="#000"
        >
          {anosOptions.map((a, idx) => {
            const year = typeof a === 'object' ? (a.ano ?? a.year ?? a.value ?? '') : a;
            return (
              <Picker.Item
                key={idx}
                label={year.toString()}
                value={year.toString()}
                color='#000'
              />
            );
          })}
        </Picker>
        <Picker
          selectedValue={mes}
          onValueChange={setMes}
          style={styles.picker}
          dropdownIconColor="#000"
        >
          <Picker.Item label="Selecione o mês" value="" color="#999" />
          <Picker.Item style={styles.item_mes} label="Janeiro" value="0" />
          <Picker.Item style={styles.item_mes} label="Fevereiro" value="1" />
          <Picker.Item style={styles.item_mes} label="Março" value="2" />
          <Picker.Item style={styles.item_mes} label="Abril" value="3" />
          <Picker.Item style={styles.item_mes} label="Maio" value="4" />
          <Picker.Item style={styles.item_mes} label="Junho" value="5" />
          <Picker.Item style={styles.item_mes} label="Julho" value="6" />
          <Picker.Item style={styles.item_mes} label="Agosto" value="7" />
          <Picker.Item style={styles.item_mes} label="Setembro" value="8" />
          <Picker.Item style={styles.item_mes} label="Outubro" value="9" />
          <Picker.Item style={styles.item_mes} label="Novembro" value="10" />
          <Picker.Item style={styles.item_mes} label="Dezembro" value="11" />
        </Picker>
      </View>

      {/* Tabela de Contas Pagas */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, { flex: 2 }]}>Nome</Text>
        <Text style={styles.headerCell}>Cartão</Text>
        <Text style={styles.headerCell}>Categoria</Text>
        <Text style={styles.headerCell}>Vencimento</Text>
        <Text style={styles.headerCell}>Valor</Text>
      </View>

      <FlatList
        data={contasPagas}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={[styles.cell, { flex: 2 }]} numberOfLines={1}>{item.nome}</Text>
            <Text style={styles.cell}>{item.tipo_cartao}</Text>
            <Text style={styles.cell}>{item.categoria}</Text>
            <Text style={styles.cell}>{item.vencimento}</Text>
            <Text style={styles.cell}>R$ {parseFloat(item.valor).toFixed(2).replace('.', ',')}</Text>
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
  tableHeader: { flexDirection: 'row', borderBottomWidth: 2, borderColor: '#000', paddingBottom: 6, marginBottom: 4 },
  headerCell: { flex: 1, fontWeight: 'bold', textAlign: 'center' },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#ccc' },
  cell: { flex: 1, textAlign: 'center' },
  list: { paddingBottom: 20 }
});
