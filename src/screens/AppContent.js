import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, StyleSheet,TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Modal_Nova_Conta from '../components/modal/modal-insert';
import ModalConfig from '../components/modal/ModalConfig';
import MenuHeader from '../components/MenuHeader';
import useContas from '../hooks/useContas';
import useCartoes from '../hooks/useCartoes';


function CustomCheckBox({ value, onValueChange }) {
  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      style={{
        width: 20,
        height: 20,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#333',
        backgroundColor: value ? '#007bff' : 'white',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {value && <Text style={{ color: 'white', fontWeight: 'bold' }}>✓</Text>}
    </TouchableOpacity>
  );
}

export default function App() {
  const [ano, setAno] = useState('2025');
  const [mes, setMes] = useState('4'); // Maio = 4

  const [modalNovaContaVisible, setModalNovaContaVisible] = useState(false);
  const [modalConfigVisible, setModalConfigVisible] = useState(false);

  const { cartoes, getCartaoById } = useCartoes(); // ✅ correto

  useEffect(() => {
    const carregarCartoes = async () => {
      const lista = await getCartoes();
      if (Array.isArray(lista)) setCartoes(lista);
    };
    carregarCartoes();
  }, []);


  const [form, setForm] = useState({
    nome: '',
    vencimento: '',
    valor: '',
    categoria: '',
    tipo_cartao: '',
  });

  const {
    contas,
    totais,
    loadContas,
    marcarComoPaga,
    salvarConta,
    getCartoes
  } = useContas(ano, mes, form, setForm, setModalNovaContaVisible);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>GERENCIAMENTO DE CONTAS</Text>
      <MenuHeader onOpenConfig={() => setModalConfigVisible(true)} />

      {/* Filtros */}
      <View style={styles.filtros}>
        <Picker selectedValue={ano} onValueChange={setAno} style={styles.picker}>
          <Picker.Item label="2025" value="2025" />
          <Picker.Item label="2024" value="2024" />
        </Picker>
        <Picker selectedValue={mes} onValueChange={setMes} style={styles.picker}>
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

      <TouchableOpacity style={styles.botaoNovaConta} onPress={() => setModalNovaContaVisible(true)}>
        <Text style={styles.textoBotao}>+ Nova Conta</Text>
      </TouchableOpacity>

      {/* Cards resumo */}
      <View style={styles.cards}>
        <Resumo titulo="Limite mês:" valor={totais.total_limite} />
        <Resumo titulo="Total de Contas:" valor={totais.total_contas} />
        <Resumo titulo="Contas Pagas:" valor={totais.total_contas_pagas} />
        <Resumo titulo="Contas Pendentes:" valor={totais.total_contas_pendentes} />
      </View>

      {/* Tabela */}
      <View style={styles.tabela}>
        <View style={styles.cabecalhoLinha}>
          <Text style={styles.cabecalho}>Nome</Text>
          <Text style={styles.cabecalho}>Vencimento</Text>
          <Text style={styles.cabecalho}>Valor</Text>
          <Text style={styles.cabecalho}>Paga</Text>
        </View>
        {contas.map(conta => (
          <View key={conta.id} style={styles.linha}>
            <Text style={styles.coluna}>{conta.nome}</Text>
            <Text style={styles.coluna}>{conta.vencimento}</Text>
            <Text style={styles.coluna}>R$ {conta.valor.toFixed(2).replace('.', ',')}</Text>
            <CustomCheckBox
              value={conta.paga}
              onValueChange={(novoValor) => marcarComoPaga(conta.id, novoValor)}
            />
          </View>
        ))}
      </View>

      <View>

      </View>
      {/* Modal */}
      {form && (
        <Modal_Nova_Conta
          visible={modalNovaContaVisible}
          onClose={() => setModalNovaContaVisible(false)}
          form={form}
          setForm={setForm}
          onSave={() => salvarConta(form, setForm, modalNovaContaVisible)}
          cartoes={cartoes}
          getCartaoById={getCartaoById}
        />
      )}

      <ModalConfig visible={modalConfigVisible} onClose={() => setModalConfigVisible(false)} />
    </ScrollView>
  );
}

function Resumo({ titulo, valor }) {
  return (
    <View style={styles.cardResumo}>
      <Text>{titulo}</Text>
      <Text style={{ fontWeight: 'bold' }}>R$ {parseFloat(valor).toFixed(2).replace('.', ',')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 20, padding: 10, backgroundColor: 'white' },
  titulo: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  filtros: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  picker: { flex: 1 },
  botaoNovaConta: { backgroundColor: '#007bff', padding: 12, borderRadius: 6, marginVertical: 10 },
  textoBotao: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardResumo: {
    width: '48%',
    padding: 10,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    marginVertical: 5,
    textAlign: 'center',
    alignItems: 'center',
  },
  tabela: { marginTop: 20 },
  cabecalhoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#000',
    padding: 6,
  },
  cabecalho: { fontWeight: 'bold', width: '23%', color: '#000' },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    borderBottomWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 8,
  },
  coluna: { width: '23%' },
});
