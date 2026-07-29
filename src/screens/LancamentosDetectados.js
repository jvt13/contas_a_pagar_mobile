import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
  Switch,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppIcon from '../components/AppIcon';
import ModalImportarMensagem from '../components/modal/ModalImportarMensagem';
import Modal_Nova_Conta from '../components/modal/modal-insert';
import useLancamentosDetectados from '../hooks/useLancamentosDetectados';
import { formatCurrency, msgToast } from '../utils/util';

function formatarRecebidoEm(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function rotuloStatus(status) {
  switch (status) {
    case 'importado':
      return 'Importado';
    case 'ignorado':
      return 'Ignorado';
    default:
      return 'Pendente';
  }
}

function StatusBadge({ status }) {
  const cor =
    status === 'importado' ? '#1E8E5A' : status === 'ignorado' ? '#6B7A90' : '#C47A1A';
  return (
    <View style={[styles.badge, { backgroundColor: `${cor}22` }]}>
      <Text style={[styles.badgeText, { color: cor }]}>{rotuloStatus(status)}</Text>
    </View>
  );
}

function RascunhoCard({ item, onLancar, onIgnorar, onExcluir }) {
  const origem =
    item.appCatalogo || item.appOrigem || item.bancoSlug || item.pacoteOrigem || 'App desconhecido';
  const valor =
    item.valorDisplay ||
    (item.preLancamento?.transacao?.valor != null
      ? formatCurrency(item.preLancamento.transacao.valor)
      : null);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderTexto}>
          <Text style={styles.cardTitulo} numberOfLines={2}>
            {item.descricao || item.titulo || 'Lançamento detectado'}
          </Text>
          <Text style={styles.cardOrigem} numberOfLines={1}>
            {origem}
          </Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      {valor ? <Text style={styles.cardValor}>{valor}</Text> : null}

      <Text style={styles.cardMeta}>Recebido: {formatarRecebidoEm(item.recebidoEm)}</Text>
      <Text style={styles.cardMeta} selectable>
        Pacote: {item.pacoteOrigem || '—'}
      </Text>

      {item.status === 'pendente' ? (
        <View style={styles.cardAcoes}>
          <TouchableOpacity style={styles.btnLancar} onPress={() => onLancar(item)} activeOpacity={0.85}>
            <AppIcon name="checkmark-circle-outline" size={16} color="#fff" />
            <Text style={styles.btnLancarText}>Lançar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSec} onPress={() => onIgnorar(item)} activeOpacity={0.85}>
            <Text style={styles.btnSecText}>Ignorar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnDanger} onPress={() => onExcluir(item)} activeOpacity={0.85}>
            <Text style={styles.btnDangerText}>Excluir</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.cardAcoes}>
          <TouchableOpacity style={styles.btnDanger} onPress={() => onExcluir(item)} activeOpacity={0.85}>
            <Text style={styles.btnDangerText}>Excluir</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function LancamentosDetectados() {
  const insets = useSafeAreaInsets();
  const {
    rascunhos,
    pendentes,
    loading,
    status,
    modoAprendizado,
    recarregar,
    ativar,
    desativar,
    abrirPermissaoAndroid,
    alternarModoAprendizado,
    ignorar,
    excluir,
    limpar,
    marcarImportado,
  } = useLancamentosDetectados();

  const [modalImportarVisible, setModalImportarVisible] = useState(false);
  const [modalNovaContaVisible, setModalNovaContaVisible] = useState(false);
  const [textoImportacao, setTextoImportacao] = useState('');
  const [preLancamentoInicial, setPreLancamentoInicial] = useState(null);
  const [rascunhoEmFluxoId, setRascunhoEmFluxoId] = useState(null);
  const [initialValuesConta, setInitialValuesConta] = useState(null);
  const [origemPreenchimento, setOrigemPreenchimento] = useState(null);
  const [contaSelecionada, setContaSelecionada] = useState(null);

  const hoje = useMemo(() => new Date(), []);
  const ano = String(hoje.getFullYear());
  const mes = String(hoje.getMonth());

  useFocusEffect(
    useCallback(() => {
      recarregar();
    }, [recarregar])
  );

  const handleAtivar = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Indisponível', 'A captura experimental de notificações está disponível apenas no Android.');
      return;
    }
    Alert.alert(
      'Ativar captura experimental?',
      'O OrganizeContas poderá acessar notificações do aparelho enquanto a permissão estiver ativa. O app tenta filtrar apenas notificações financeiras. O texto fica só neste aparelho e nada é enviado ao servidor. Você sempre revisa antes de criar um lançamento.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Ativar',
          onPress: async () => {
            await ativar();
            if (!status.permissaoConcedida) {
              Alert.alert(
                'Permissão Android',
                'Abra as configurações e conceda acesso a notificações ao OrganizeContas.',
                [
                  { text: 'Depois', style: 'cancel' },
                  { text: 'Abrir configurações', onPress: () => handleAbrirPermissao() },
                ]
              );
            } else {
              msgToast('Captura experimental ativada.');
            }
          },
        },
      ]
    );
  };

  const handleDesativar = () => {
    Alert.alert('Desativar captura?', 'Novos rascunhos deixarão de ser criados. Os já salvos permanecem até você limpar.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desativar',
        style: 'destructive',
        onPress: async () => {
          await desativar();
          msgToast('Captura desativada.');
        },
      },
    ]);
  };

  const handleLancar = (item) => {
    const texto =
      item.textoSanitizado ||
      [item.titulo, item.textoSanitizado].filter(Boolean).join('\n') ||
      '';
    setRascunhoEmFluxoId(item.id);
    setTextoImportacao(texto);
    setPreLancamentoInicial(item.preLancamento || null);
    setContaSelecionada(null);
    setInitialValuesConta(null);
    setOrigemPreenchimento(null);
    setModalImportarVisible(true);
  };

  const handleIgnorar = (item) => {
    Alert.alert('Ignorar rascunho?', 'Ele deixará de aparecer como pendente.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Ignorar',
        onPress: async () => {
          await ignorar(item.id);
        },
      },
    ]);
  };

  const handleExcluir = (item) => {
    Alert.alert('Excluir rascunho?', 'Esta ação remove o rascunho deste aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await excluir(item.id);
        },
      },
    ]);
  };

  const handleAbrirPermissao = async () => {
    const ok = await abrirPermissaoAndroid();
    if (!ok) {
      Alert.alert(
        'Abrir acesso a notificações',
        'Não foi possível abrir a tela especial automaticamente.\n\nProcure manualmente por:\nConfigurações > Apps > Acesso especial > Acesso a notificações\ne habilite OrganizeContas.\n\nEssa permissão não aparece em “Permissões do app”.'
      );
    }
  };

  const handleLimpar = () => {
    Alert.alert('Limpar todos os rascunhos?', 'Remove todos os rascunhos detectados neste aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpar',
        style: 'destructive',
        onPress: async () => {
          await limpar();
          msgToast('Rascunhos limpos.');
        },
      },
    ]);
  };

  const permissaoLabel = status.permissaoConcedida
    ? 'Permissão concedida'
    : 'Permissão não concedida';
  const capturaLabel = status.capturaAtiva ? 'Captura ativada no app' : 'Captura desativada (padrão)';

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 8, 12) }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={recarregar} colors={['#1E4DB7']} />}
      >
        <View style={styles.avisoCard}>
          <AppIcon name="information-circle-outline" size={22} color="#C47A1A" />
          <View style={styles.avisoTextoWrap}>
            <Text style={styles.avisoTitulo}>Este recurso é experimental.</Text>
            <Text style={styles.avisoTexto}>
              O OrganizeContas pode acessar notificações do aparelho enquanto a permissão estiver ativa. O app
              tenta filtrar apenas notificações financeiras. O texto detectado fica salvo apenas neste aparelho.
              Nada é enviado ao servidor. Você sempre revisa antes de criar um lançamento.
            </Text>
          </View>
        </View>

        <View style={styles.configCard}>
          <Text style={styles.secaoTitulo}>Captura experimental de notificações</Text>
          <Text style={styles.secaoSub}>
            Desativada por padrão. Ao ativar, o Android pedirá permissão para o OrganizeContas acessar
            notificações. O app usa isso apenas para detectar possíveis lançamentos bancários. Os dados ficam
            neste aparelho e não são enviados ao servidor.
          </Text>

          <Text style={styles.ajudaPermissao}>
            Essa permissão não fica em “Permissões do app”. Em alguns celulares, procure em Configurações
            {' > '}Apps {'> '}Acesso especial {'> '}Acesso a notificações e habilite OrganizeContas.
            {'\n'}
            Se o Android disser que o app apresenta falhas, desative o acesso a notificações, reinstale o APK
            corrigido e tente de novo.
          </Text>

          <View style={styles.statusLinha}>
            <Text style={styles.statusLabel}>Status Android</Text>
            <Text
              style={[
                styles.statusValor,
                { color: status.permissaoConcedida ? '#1E8E5A' : '#D64545' },
              ]}
            >
              {permissaoLabel}
            </Text>
          </View>
          <View style={styles.statusLinha}>
            <Text style={styles.statusLabel}>Processamento local</Text>
            <Text
              style={[styles.statusValor, { color: status.capturaAtiva ? '#1E8E5A' : '#6B7A90' }]}
            >
              {capturaLabel}
            </Text>
          </View>

          <View style={styles.switchLinha}>
            <View style={styles.switchTexto}>
              <Text style={styles.switchTitulo}>Modo aprendizado</Text>
              <Text style={styles.switchSub}>
                Registra pacote + título/texto localmente para descobrir apps bancários no teste.
              </Text>
            </View>
            <Switch
              value={modoAprendizado}
              onValueChange={alternarModoAprendizado}
              trackColor={{ false: '#D9E4F2', true: '#A8C5F5' }}
              thumbColor={modoAprendizado ? '#1E4DB7' : '#f4f3f4'}
            />
          </View>

          <View style={styles.configAcoes}>
            {!status.capturaAtiva ? (
              <TouchableOpacity style={styles.btnPrimario} onPress={handleAtivar} activeOpacity={0.85}>
                <Text style={styles.btnPrimarioText}>Ativar captura experimental</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.btnSecLarge} onPress={handleDesativar} activeOpacity={0.85}>
                <Text style={styles.btnSecLargeText}>Desativar captura</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.btnOutline}
              onPress={handleAbrirPermissao}
              activeOpacity={0.85}
            >
              <Text style={styles.btnOutlineText}>Abrir configurações de notificações</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnOutline} onPress={handleLimpar} activeOpacity={0.85}>
              <Text style={styles.btnOutlineText}>Limpar rascunhos</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.listaHeader}>
          <Text style={styles.secaoTitulo}>Rascunhos ({pendentes.length} pendentes)</Text>
          <Text style={styles.secaoSub}>
            Toque em Lançar para revisar e continuar no cadastro manual. Nada é criado automaticamente.
          </Text>
        </View>

        {loading && rascunhos.length === 0 ? (
          <ActivityIndicator color="#1E4DB7" style={{ marginTop: 24 }} />
        ) : null}

        {!loading && rascunhos.length === 0 ? (
          <View style={styles.vazio}>
            <AppIcon name="notifications-outline" size={36} color="#8CA0B3" />
            <Text style={styles.vazioTitulo}>Nenhum lançamento detectado</Text>
            <Text style={styles.vazioTexto}>
              Com a captura ativa e a permissão concedida, notificações financeiras filtradas aparecerão aqui.
            </Text>
          </View>
        ) : null}

        {rascunhos.map((item) => (
          <RascunhoCard
            key={item.id}
            item={item}
            onLancar={handleLancar}
            onIgnorar={handleIgnorar}
            onExcluir={handleExcluir}
          />
        ))}
      </ScrollView>

      <ModalImportarMensagem
        visible={modalImportarVisible}
        onClose={() => {
          setModalImportarVisible(false);
          setTextoImportacao('');
          setPreLancamentoInicial(null);
        }}
        textoInicial={textoImportacao}
        preLancamentoInicial={preLancamentoInicial}
        onContinuar={(values) => {
          setModalImportarVisible(false);
          setTextoImportacao('');
          setPreLancamentoInicial(null);
          setContaSelecionada(null);
          setInitialValuesConta(values || null);
          setOrigemPreenchimento('notification_listener');
          setModalNovaContaVisible(true);
        }}
      />

      <Modal_Nova_Conta
        visible={modalNovaContaVisible}
        onClose={() => {
          setModalNovaContaVisible(false);
          setInitialValuesConta(null);
          setOrigemPreenchimento(null);
          setRascunhoEmFluxoId(null);
        }}
        onSuccess={async () => {
          if (rascunhoEmFluxoId) {
            await marcarImportado(rascunhoEmFluxoId);
          }
          setModalNovaContaVisible(false);
          setInitialValuesConta(null);
          setOrigemPreenchimento(null);
          setRascunhoEmFluxoId(null);
          msgToast('Conta salva. Rascunho marcado como importado.');
        }}
        ano={ano}
        mes={mes}
        contaSelecionada={contaSelecionada}
        setContaSelecionada={setContaSelecionada}
        initialValues={initialValuesConta}
        origemPreenchimento={origemPreenchimento}
        onClearInitialValues={() => {
          setInitialValuesConta(null);
          setOrigemPreenchimento(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8FF',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  avisoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFF8EE',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F0E0C8',
    padding: 14,
  },
  avisoTextoWrap: {
    flex: 1,
  },
  avisoTitulo: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C47A1A',
    marginBottom: 4,
  },
  avisoTexto: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6B7A90',
  },
  configCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    padding: 14,
  },
  secaoTitulo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16324F',
    marginBottom: 6,
  },
  secaoSub: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6B7A90',
    marginBottom: 12,
  },
  ajudaPermissao: {
    fontSize: 12,
    lineHeight: 17,
    color: '#C47A1A',
    marginBottom: 12,
    backgroundColor: '#FFF8EE',
    borderRadius: 10,
    padding: 10,
  },
  statusLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 13,
    color: '#6B7A90',
    fontWeight: '600',
  },
  statusValor: {
    fontSize: 13,
    fontWeight: '700',
  },
  switchLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E3EBF5',
  },
  switchTexto: {
    flex: 1,
  },
  switchTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16324F',
  },
  switchSub: {
    fontSize: 11,
    color: '#6B7A90',
    marginTop: 2,
    lineHeight: 15,
  },
  configAcoes: {
    gap: 8,
  },
  btnPrimario: {
    backgroundColor: '#1E4DB7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnPrimarioText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  btnSecLarge: {
    backgroundColor: '#E3EBF5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnSecLargeText: {
    color: '#16324F',
    fontWeight: '700',
    fontSize: 14,
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#E3EBF5',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#F8FAFD',
  },
  btnOutlineText: {
    color: '#1E4DB7',
    fontWeight: '700',
    fontSize: 13,
  },
  listaHeader: {
    marginTop: 4,
  },
  vazio: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 8,
  },
  vazioTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16324F',
  },
  vazioTexto: {
    fontSize: 13,
    color: '#6B7A90',
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  cardHeaderTexto: {
    flex: 1,
  },
  cardTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#16324F',
  },
  cardOrigem: {
    fontSize: 12,
    color: '#6B7A90',
    marginTop: 2,
  },
  cardValor: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E4DB7',
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: '#6B7A90',
    marginTop: 2,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardAcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  btnLancar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E8E5A',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  btnLancarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  btnSec: {
    backgroundColor: '#E3EBF5',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  btnSecText: {
    color: '#16324F',
    fontWeight: '700',
    fontSize: 13,
  },
  btnDanger: {
    backgroundColor: '#FDECEC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  btnDangerText: {
    color: '#D64545',
    fontWeight: '700',
    fontSize: 13,
  },
});
