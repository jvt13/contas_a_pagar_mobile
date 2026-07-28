import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import AppIcon, { ModalCloseButton } from '../AppIcon';
import { parseMensagemBancaria } from '../../utils/parserMensagemBancaria';
import { mapPreLancamentoParaInitialValues } from '../../utils/mapPreLancamentoParaInitialValues';
import useCartaoManager from '../../hooks/useCartaoManager';

const NIVEL_COR = {
  boa: '#1E8E5A',
  revisar: '#C47A1A',
  baixa: '#D64545',
};

function formatarForma(forma) {
  switch (forma) {
    case 'cartao_credito':
      return 'Cartão de crédito';
    case 'cartao_debito':
      return 'Cartão de débito';
    case 'pix':
      return 'PIX';
    case 'transferencia':
      return 'Transferência';
    default:
      return 'Não identificada';
  }
}

function formatarTipo(tipo) {
  switch (tipo) {
    case 'compra':
      return 'Compra';
    case 'pix':
      return 'PIX';
    case 'transferencia':
      return 'Transferência';
    case 'pagamento':
      return 'Pagamento';
    case 'recebimento':
      return 'Recebimento';
    default:
      return 'Desconhecido';
  }
}

export default function ModalImportarMensagem({
  visible,
  onClose,
  onContinuar,
  textoInicial = '',
  preLancamentoInicial = null,
}) {
  const [texto, setTexto] = useState('');
  const [preLancamento, setPreLancamento] = useState(null);
  const { cartoes, carregarCartoes } = useCartaoManager();

  useEffect(() => {
    if (!visible) {
      return;
    }
    carregarCartoes();

    const inicial = String(textoInicial || '').trim();
    if (preLancamentoInicial) {
      setTexto(inicial);
      setPreLancamento(preLancamentoInicial);
      return;
    }
    if (inicial) {
      setTexto(inicial);
      setPreLancamento(parseMensagemBancaria(inicial));
    }
  }, [visible, textoInicial, preLancamentoInicial]);

  const limparEstado = () => {
    setTexto('');
    setPreLancamento(null);
  };

  const fechar = () => {
    limparEstado();
    onClose?.();
  };

  const interpretar = () => {
    const bruto = String(texto || '').trim();
    if (!bruto) {
      Alert.alert('Atenção', 'Cole uma mensagem bancária para interpretar.');
      setPreLancamento(null);
      return;
    }

    const resultado = parseMensagemBancaria(bruto);
    setPreLancamento(resultado);

    if (resultado?.transacao?.valor == null) {
      Alert.alert(
        'Valor não encontrado',
        'Não foi possível identificar o valor na mensagem. Verifique se o texto contém um valor como R$ 42,90.'
      );
    }
  };

  const continuar = async () => {
    if (!preLancamento || preLancamento?.transacao?.valor == null) {
      Alert.alert('Atenção', 'Interprete uma mensagem com valor válido antes de continuar.');
      return;
    }

    const listaCartoes = (await carregarCartoes()) || cartoes || [];
    const { initialValues } = mapPreLancamentoParaInitialValues(preLancamento, {
      cartoes: listaCartoes,
    });
    limparEstado();
    onContinuar?.(initialValues);
  };

  const podeContinuar = preLancamento?.transacao?.valor != null;
  const nivel = preLancamento?.confianca?.nivel || 'baixa';
  const corNivel = NIVEL_COR[nivel] || NIVEL_COR.baixa;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={fechar}>
      <View style={styles.backdrop}>
        <View style={styles.modalContent}>
          <ModalCloseButton onPress={fechar} style={styles.closeButton} color="#607086" />

          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <AppIcon name="chatbox-ellipses-outline" size={26} color="#1E4DB7" />
            </View>
            <View style={styles.headerTexto}>
              <Text style={styles.titulo}>Importar mensagem</Text>
              <Text style={styles.subtitulo}>
                Cole uma mensagem do banco. O texto é analisado apenas neste aparelho e não é
                enviado ao servidor.
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>Mensagem</Text>
            <TextInput
              style={styles.textarea}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              placeholder="Cole aqui a mensagem do banco, SMS ou notificação..."
              placeholderTextColor="#8CA0B3"
              value={texto}
              onChangeText={setTexto}
              autoCorrect={false}
            />

            <Text style={styles.privacidade}>
              O texto colado é analisado apenas neste aparelho e não é enviado ao servidor.
            </Text>

            <TouchableOpacity style={styles.btnInterpretar} onPress={interpretar} activeOpacity={0.85}>
              <AppIcon name="search-outline" size={18} color="#fff" />
              <Text style={styles.btnInterpretarText}>Interpretar mensagem</Text>
            </TouchableOpacity>

            {preLancamento ? (
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitulo}>Prévia</Text>
                  <View style={[styles.badgeNivel, { backgroundColor: `${corNivel}22` }]}>
                    <Text style={[styles.badgeNivelText, { color: corNivel }]}>
                      {nivel === 'boa' ? 'Boa' : nivel === 'revisar' ? 'Revisar' : 'Baixa'}{' '}
                      ({Math.round((preLancamento.confianca?.score || 0) * 100)}%)
                    </Text>
                  </View>
                </View>

                <PreviewLinha
                  label="Valor"
                  valor={preLancamento.sugestoes?.valorDisplay || '—'}
                />
                <PreviewLinha
                  label="Banco"
                  valor={preLancamento.banco?.nome || 'Não identificado'}
                />
                <PreviewLinha
                  label="Data / hora"
                  valor={
                    [
                      preLancamento.transacao?.dataISO
                        ? preLancamento.sugestoes?.data_lancamento
                        : null,
                      preLancamento.transacao?.hora,
                    ]
                      .filter(Boolean)
                      .join(' ') || '—'
                  }
                />
                <PreviewLinha
                  label="Forma"
                  valor={formatarForma(preLancamento.transacao?.formaPagamento)}
                />
                <PreviewLinha
                  label="Tipo"
                  valor={formatarTipo(preLancamento.transacao?.tipo)}
                />
                <PreviewLinha
                  label="Descrição"
                  valor={preLancamento.transacao?.descricao || '—'}
                />

                {preLancamento.confianca?.camposDetectados?.length ? (
                  <Text style={styles.metaTexto}>
                    Detectados: {preLancamento.confianca.camposDetectados.join(', ')}
                  </Text>
                ) : null}
                {preLancamento.confianca?.camposFaltantes?.length ? (
                  <Text style={styles.metaTexto}>
                    Faltando: {preLancamento.confianca.camposFaltantes.join(', ')}
                  </Text>
                ) : null}

                {(preLancamento.avisos || []).slice(0, 4).map((aviso) => (
                  <Text key={aviso} style={styles.avisoTexto}>
                    • {aviso}
                  </Text>
                ))}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.btnContinuar, !podeContinuar && styles.btnContinuarDisabled]}
              onPress={continuar}
              disabled={!podeContinuar}
              activeOpacity={0.85}
            >
              <Text style={styles.btnContinuarText}>Continuar para lançamento</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnCancelar} onPress={fechar} activeOpacity={0.85}>
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PreviewLinha({ label, valor }) {
  return (
    <View style={styles.previewLinha}>
      <Text style={styles.previewLabel}>{label}</Text>
      <Text style={styles.previewValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(22, 50, 79, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '92%',
    backgroundColor: '#F8FAFD',
    borderRadius: 18,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 16,
    elevation: 12,
    shadowColor: '#16324F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 32,
    marginBottom: 14,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E9F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerTexto: {
    flex: 1,
    paddingTop: 2,
  },
  titulo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#16324F',
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7A90',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16324F',
    marginBottom: 6,
  },
  textarea: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12,
    fontSize: 14,
    color: '#16324F',
    marginBottom: 8,
  },
  privacidade: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6B7A90',
    marginBottom: 12,
  },
  btnInterpretar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E4DB7',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  btnInterpretarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3EBF5',
    padding: 14,
    marginBottom: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  previewTitulo: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16324F',
  },
  badgeNivel: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeNivelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  previewLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  previewLabel: {
    fontSize: 13,
    color: '#6B7A90',
    fontWeight: '600',
  },
  previewValor: {
    flex: 1,
    fontSize: 13,
    color: '#16324F',
    fontWeight: '600',
    textAlign: 'right',
  },
  metaTexto: {
    fontSize: 12,
    color: '#6B7A90',
    marginTop: 4,
  },
  avisoTexto: {
    fontSize: 12,
    color: '#C47A1A',
    marginTop: 4,
    lineHeight: 17,
  },
  footer: {
    marginTop: 8,
    gap: 8,
  },
  btnContinuar: {
    backgroundColor: '#1E8E5A',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnContinuarDisabled: {
    backgroundColor: '#A8C5B5',
  },
  btnContinuarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  btnCancelar: {
    backgroundColor: '#E3EBF5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnCancelarText: {
    color: '#16324F',
    fontWeight: '700',
    fontSize: 14,
  },
});
