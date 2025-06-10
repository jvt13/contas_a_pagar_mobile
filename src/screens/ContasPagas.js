import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ScrollView, Dimensions } from 'react-native';
import * as util from '../utils/util';
import CustomPicker from '../components/modal/CustomPicker';
import { getDados } from '../utils/services';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ContasPagas() {
  const today = new Date();
  const [ano, setAno] = useState(today.getFullYear().toString());
  const [mes, setMes] = useState(today.getMonth().toString());
  const [anosOptions, setAnosOptions] = useState([]);
  const [contasPagas, setContasPagas] = useState([]);

  const [posicaoTabelaY, setPosicaoTabelaY] = useState(0);
  const [alturaDisponivel, setAlturaDisponivel] = useState(400);

  const screenHeight = Dimensions.get('window').height;

  const calculaTotal = (contas) => {
    return contas.reduce((total, item) => total + parseFloat(item.valor || 0), 0);
  };

  const limiteDoMes = 5000; // Exemplo fixo para teste

  const loadContasPagas = async () => {
    try {
      const organization = await AsyncStorage.getItem('@userKeyShareId');
      const query = new URLSearchParams({ ano, mes, organization }).toString();
      const data = await getDados(`/contas_pagas?${query}`);

      if (data.success) {
        const anosArray = (data.anos || []).map(item =>
          typeof item === 'object'
            ? { label: item.ano.toString(), value: item.ano.toString() }
            : { label: item.toString(), value: item.toString() }
        );
        setAnosOptions(anosArray);
        setContasPagas(data.contasPagas || []);
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

  useEffect(() => {
    if (posicaoTabelaY > 0) {
      const novaAltura = screenHeight - posicaoTabelaY - 130;
      setAlturaDisponivel(novaAltura);
    }
  }, [posicaoTabelaY, screenHeight]);

  return (
    <View style={styles.container}>

      {/* Filtros de Ano e Mês */}
      <View style={[styles.filtros]}>
        <View style={{ flex: 1 }}>
          
          <CustomPicker
            selectedValue={ano}
            onValueChange={setAno}
            options={anosOptions}
            placeholder="Selecione o ano"
            style={styles.picker}
          />
        </View>

        <View style={{ flex: 1 }}>
          
          <CustomPicker
            selectedValue={mes}
            onValueChange={setMes}
            options={util.mesesOptions}
            placeholder="Selecione o mês"
            style={styles.picker}
          />
        </View>
      </View>

      {/* Cards Resumo */}
      <View style={styles.cards}>
        <Resumo titulo="Valor Total Pago:" valor={calculaTotal(contasPagas)} />
        <Resumo titulo="Limite do Mês:" valor={limiteDoMes} />
      </View>

      {/* Tabela */}
      <View
        style={[styles.tabelaContainer, { height: alturaDisponivel || 400 }]}
        onLayout={(event) => {
          const { y } = event.nativeEvent.layout;
          setPosicaoTabelaY(y);
        }}
      >
        <ScrollView horizontal>
          <View style={{ minWidth: 500, maxWidth: 1000 }}>
            {/* Cabeçalho da Tabela */}
            <View style={styles.cabecalhoLinha}>
              <Text style={[styles.cabecalho, { width: 120 }]}>Nome</Text>
              <Text style={[styles.cabecalho, { width: 60 }]}>Cartão</Text>
              <Text style={[styles.cabecalho, { width: 100 }]}>Categoria</Text>
              <Text style={[styles.cabecalho, { width: 100 }]}>Vencimento</Text>
              <Text style={[styles.cabecalho, { width: 100 }]}>Valor</Text>
            </View>

            <FlatList
              data={contasPagas}
              keyExtractor={item => item.id.toString()}
              renderItem={({ item }) => (
                <View style={[styles.itemCard, styles.itemCardPago]}>
                  <View style={styles.itemContent}>
                    <Text style={[styles.cell, { width: 120, textAlign: 'left' }]}>{item.nome}</Text>
                    <Text style={[styles.cell, { width: 60 }]}>{item.tipo_cartao}</Text>
                    <Text style={[styles.cell, { width: 100 }]}>{item.categoria}</Text>
                    <Text style={[styles.cell, { width: 100 }]}>{item.vencimento}</Text>
                    <Text style={[styles.cell, { width: 100 }]}>
                      R$ {parseFloat(item.valor).toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                </View>
              )}
              showsVerticalScrollIndicator
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );

  function Resumo({ titulo, valor }) {
    return (
      <View style={styles.cardResumo}>
        <Text style={styles.tituloResumo}>{titulo}</Text>
        <Text style={styles.valorResumo}>R$ {parseFloat(valor).toFixed(2).replace('.', ',')}</Text>
      </View>
    );
  }
}

// ... (styles permanecem inalterados)

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#fff' },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 1,
    textTransform: 'uppercase',
    letterSpacing: 1,
    backgroundColor: '#3b5998',
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },

  filtros: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  //picker: { flex: 1, height: 50, marginHorizontal: 5, color: '#000' },
  titulo_picker: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  picker: {
    minWidth: 120,
    height: 50,
    marginHorizontal: 5,
    color: '#000',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },

  picker_item: {
    color: '#000',
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  cardResumo: {
    width: '48%',
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tituloResumo: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
    textAlign: 'center',
  },
  valorResumo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  tabelaContainer: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  cabecalhoLinha: {
    flexDirection: 'row',
    //justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cabecalho: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  itemCard: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  itemCardPago: {
    backgroundColor: '#e6ffe6', // Verde clarinho
  },
  itemContent: {
    flexDirection: 'row',
    //justifyContent: 'space-between',
    alignItems: 'center',
  },
  cell: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
});
