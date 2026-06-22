import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import CartaoDashboardCard from '../components/dashboard/CartaoDashboardCard';
import useDashboardCartoes from '../hooks/useDashboardCartoes';

export default function DashboardCartoes() {
  const { resumos, loading, erro, carregar } = useDashboardCartoes();

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={carregar} />}
      >
        <Text style={styles.subtitulo}>
          Limite, fatura atual e próximos vencimentos por cartão
        </Text>

        {loading && resumos.length === 0 ? (
          <View style={styles.feedback}>
            <ActivityIndicator size="large" color="#1E4DB7" />
            <Text style={styles.feedbackTexto}>Carregando indicadores...</Text>
          </View>
        ) : null}

        {!loading && erro ? (
          <View style={styles.feedback}>
            <Text style={styles.erroTexto}>{erro}</Text>
            <TouchableOpacity style={styles.btnRetry} onPress={carregar}>
              <Text style={styles.btnRetryTexto}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && !erro && resumos.length === 0 ? (
          <View style={styles.feedback}>
            <Text style={styles.feedbackTexto}>
              Nenhum cartão cadastrado. Adicione cartões na Central de Controle.
            </Text>
          </View>
        ) : null}

        {resumos.map((resumo) => (
          <CartaoDashboardCard key={String(resumo.id)} resumo={resumo} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8FF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  subtitulo: {
    fontSize: 14,
    color: '#607086',
    marginBottom: 16,
    lineHeight: 20,
  },
  feedback: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  feedbackTexto: {
    fontSize: 14,
    color: '#607086',
    textAlign: 'center',
  },
  erroTexto: {
    fontSize: 14,
    color: '#D64545',
    textAlign: 'center',
  },
  btnRetry: {
    backgroundColor: '#1E4DB7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnRetryTexto: {
    color: '#fff',
    fontWeight: '700',
  },
});
