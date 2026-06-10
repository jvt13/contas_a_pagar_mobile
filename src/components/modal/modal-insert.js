import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppIcon from '../AppIcon';
import CustomPicker from './CustomPicker';

import { formatarMoeda, validarVencimentoConta, formatarDataBR } from '../../utils/util';
import {
  obterVencimentoSugeridoPorCartao,
  parseDataBRparaDate,
} from '../../utils/competenciaCartao';
import { formatarNomeCartao } from '../../utils/cartao';
import { isCartaoDebito, formatarDataBRHoje } from '../../utils/tipoCartao';
import BancoBadge from '../bancos/BancoBadge';
import { OPCOES_PARCELAS, extrairNomeBaseParcela } from '../../utils/parcelamento';
import { OPCOES_RECORRENCIA, isCategoriaFixa } from '../../utils/recorrencia';
import useCartaoManager from '../../hooks/useCartaoManager';
import useNovaConta from '../../hooks/useNovaConta';
import CategorySelectorField from '../categorias/CategorySelectorField';
import SubcategorySelectorField from '../categorias/SubcategorySelectorField';

export default function Modal_Nova_Conta({
  visible,
  onClose,
  onSuccess,
  ano,
  mes,
  contaSelecionada,
  setContaSelecionada,
}) {
  const [editarConta, setEditarConta] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { cartoes, carregarCartoes, getCartaoById } = useCartaoManager();
  const { form, setForm, setValorBackend, salvarConta } = useNovaConta(
    ano,
    mes,
    onSuccess,
    editarConta,
    cartaoSelecionado
  );

  const ehDebito = isCartaoDebito(cartaoSelecionado);

  const tipoCartaoId = String(form.tipo_cartao || '');
  const cartaoSelecionado = cartoes.find((c) => String(c.id) === tipoCartaoId);

  const cartoesOptions = [
    { label: 'Selecione', value: '' },
    ...cartoes.map((cartao) => ({
      label: formatarNomeCartao(cartao),
      value: String(cartao.id),
    })),
  ];

  const sugerirVencimento = (cartao) => {
    if (!cartao) {
      return null;
    }
    if (isCartaoDebito(cartao)) {
      return formatarDataBRHoje();
    }
    return obterVencimentoSugeridoPorCartao(cartao, {
      mesIndex0: mes,
      ano,
      dataReferencia: new Date(),
    });
  };

  const setValoresSelecionados = () => {
    if (!contaSelecionada) {
      return;
    }

    setEditarConta(true);
    setForm({
      id: contaSelecionada.id || '',
      tipo_cartao:
        parseInt(contaSelecionada.tipo_cartao_id ?? contaSelecionada.tipo_cartao, 10) || '',
      nome: extrairNomeBaseParcela(contaSelecionada.nome) || contaSelecionada.nome || '',
      categoria: contaSelecionada.categoria || '',
      subcategoria: contaSelecionada.subcategoria || '',
      vencimento: contaSelecionada.vencimento || '',
      valor: contaSelecionada.valor?.toString() || '',
      conta_user: contaSelecionada.conta_user || '',
      organization: contaSelecionada.organization || '',
      parcelado: false,
      total_parcelas: 12,
      recorrente: Boolean(contaSelecionada.grupo_recorrencia && contaSelecionada.total_recorrencias > 1),
      total_recorrencias: contaSelecionada.total_recorrencias || 6,
      grupo_parcelamento: contaSelecionada.grupo_parcelamento || null,
      parcela_atual: contaSelecionada.parcela_atual || null,
      total_parcelas_grupo: contaSelecionada.total_parcelas || null,
      grupo_recorrencia: contaSelecionada.grupo_recorrencia || null,
      recorrencia_atual: contaSelecionada.recorrencia_atual || null,
      total_recorrencias_grupo: contaSelecionada.total_recorrencias || null,
    });
    setValorBackend({ valor: contaSelecionada.valor });
  };

  const reseteForms_onClose = () => {
    setForm({
      tipo_cartao: '',
      nome: '',
      categoria: '',
      subcategoria: '',
      vencimento: '',
      valor: '',
      conta_user: '',
      organization: '',
      parcelado: false,
      total_parcelas: 12,
      recorrente: false,
      total_recorrencias: 6,
      grupo_parcelamento: null,
      parcela_atual: null,
      total_parcelas_grupo: null,
      grupo_recorrencia: null,
      recorrencia_atual: null,
      total_recorrencias_grupo: null,
    });
    setValorBackend({ valor: '' });
    setContaSelecionada(null);
    setEditarConta(false);
    onClose();
  };

  useEffect(() => {
    if (!visible) {
      return;
    }

    setValoresSelecionados();
    carregarCartoes();
  }, [visible]);

  // Cartões carregados após abrir o modal: preenche vencimento se já houver cartão escolhido
  useEffect(() => {
    if (!visible || editarConta || !form.tipo_cartao || form.vencimento) {
      return;
    }

    const cartao = cartoes.find((c) => String(c.id) === String(form.tipo_cartao));
    const sugerido = sugerirVencimento(cartao);
    if (sugerido) {
      setForm((current) => ({ ...current, vencimento: sugerido }));
    }
  }, [visible, cartoes, form.tipo_cartao, editarConta]);

  useEffect(() => {
    if (!visible || !form.valor || form.valor.toString().startsWith('R$')) {
      return;
    }

    const valorFloat = parseFloat(form.valor);
    if (!Number.isNaN(valorFloat)) {
      const display = valorFloat.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      setForm((current) => ({ ...current, valor: display }));
    }
  }, [visible, form.valor]);

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event?.type === 'dismissed') {
      return;
    }

    if (selectedDate) {
      const formatted = selectedDate.toLocaleDateString('pt-BR');
      setForm((current) => ({ ...current, vencimento: formatted }));
    }

    if (Platform.OS === 'ios') {
      setShowDatePicker(false);
    }
  };

  const trataSelect = async (id) => {
    const idStr = String(id || '');

    if (!idStr) {
      setForm((current) => ({ ...current, tipo_cartao: '', vencimento: '' }));
      return;
    }

    const cartaoLocal = cartoes.find((c) => String(c.id) === idStr);
    let vencimentoSugerido = sugerirVencimento(cartaoLocal);

    if (!vencimentoSugerido) {
      const cartaoApi = await getCartaoById(idStr);
      if (cartaoApi?.vencimento_conta) {
        vencimentoSugerido = formatarDataBR(cartaoApi.vencimento_conta);
      } else if (cartaoApi) {
        vencimentoSugerido = sugerirVencimento({
          ...cartaoApi,
          vencimento: cartaoApi.dia_vencimento ?? cartaoApi.vencimento,
        });
      }
    }

    setForm((current) => ({
      ...current,
      tipo_cartao: idStr,
      vencimento: vencimentoSugerido || '',
    }));

    if (!vencimentoSugerido && __DEV__) {
      console.warn('[modal-insert] Não foi possível calcular vencimento para o cartão:', idStr);
    }
  };

  const salvar = async () => {
    const success = await salvarConta();
    if (success) {
      reseteForms_onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.titulo}>{editarConta ? 'Editar Conta' : 'Adicionar Nova Conta'}</Text>

          <Text style={styles.label}>Cartão:</Text>
          <CustomPicker
            selectedValue={tipoCartaoId}
            onValueChange={trataSelect}
            options={cartoesOptions}
            placeholder="Selecione o cartão"
            style={styles.selectWrapper}
          />
          {tipoCartaoId ? (
            <View style={styles.selectedCartaoRow}>
              <BancoBadge cartao={cartaoSelecionado || {}} size="sm" />
              <Text style={styles.selectedCartao} numberOfLines={1}>
                {formatarNomeCartao(cartaoSelecionado || {})}
              </Text>
            </View>
          ) : null}

          {ehDebito && !editarConta ? (
            <View style={styles.avisoDebito}>
              <Text style={styles.avisoDebitoTexto}>
                Cartão débito: o lançamento será registrado como pago na data de hoje.
              </Text>
            </View>
          ) : null}

          <Text style={styles.label}>Tipo de gasto:</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome do gasto"
            value={form.nome}
            onChangeText={(text) => setForm((current) => ({ ...current, nome: text }))}
          />

          <CategorySelectorField
            value={form.categoria}
            onChange={(id) =>
              setForm((current) => ({
                ...current,
                categoria: id,
                subcategoria: '',
                // Compatibilidade: categoria legado "fixa" ativa recorrência automaticamente.
                recorrente: isCategoriaFixa(id) ? true : current.recorrente,
              }))
            }
          />

          <SubcategorySelectorField
            parentId={form.categoria}
            value={form.subcategoria}
            onChange={(id) => setForm((current) => ({ ...current, subcategoria: id }))}
          />

          <View style={styles.row}>
            <View style={styles.column}>
              <Text style={styles.label}>
                {ehDebito ? 'Data da compra:' : 'Vencimento (data):'}
              </Text>
              <View style={styles.inputWithIcon}>
                <TextInput
                  style={styles.inputDate}
                  placeholder="dd/mm/aaaa"
                  value={form.vencimento}
                  onChangeText={(text) =>
                    setForm((current) => ({ ...current, vencimento: text }))
                  }
                  keyboardType="numeric"
                  maxLength={10}
                />
                <TouchableOpacity
                  style={styles.btnIconCalendario}
                  onPress={() => setShowDatePicker(true)}
                  accessibilityLabel="Abrir calendário"
                >
                  <AppIcon name="calendar" size={20} color="#1E4DB7" />
                </TouchableOpacity>
              </View>
              {showDatePicker && (
                <DateTimePicker
                  mode="date"
                  value={parseDataBRparaDate(form.vencimento)}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
              )}
              <Text style={styles.hintVencimento}>
                {ehDebito
                  ? 'Débito: data preenchida automaticamente (hoje).'
                  : 'Preenchido ao escolher o cartão; você pode alterar se o banco mudou o fechamento.'}
              </Text>
            </View>
            <View style={styles.column}>
              <Text style={styles.label}>Valor:</Text>
              <TextInput
                style={styles.input}
                placeholder="Valor"
                keyboardType="numeric"
                value={form.valor}
                onChangeText={(text) => {
                  const { display, backend } = formatarMoeda(text);
                  setValorBackend({ valor: backend });
                  setForm((current) => ({ ...current, valor: display }));
                }}
              />
            </View>
          </View>

          {!editarConta && !ehDebito ? (
            <>
              <TouchableOpacity
                style={styles.parceladoRow}
                onPress={() =>
                  setForm((current) => ({
                    ...current,
                    parcelado: !current.parcelado,
                    recorrente: !current.parcelado ? false : current.recorrente,
                  }))
                }
              >
                <View
                  style={[
                    styles.checkboxParcelado,
                    form.parcelado && styles.checkboxParceladoAtivo,
                  ]}
                >
                  {form.parcelado ? <AppIcon name="check" size={12} color="#fff" /> : null}
                </View>
                <Text style={styles.parceladoLabel}>Parcelado</Text>
              </TouchableOpacity>

              {form.parcelado ? (
                <View style={styles.parcelasContainer}>
                  <Text style={styles.label}>Quantidade de parcelas:</Text>
                  <View style={styles.parcelasOpcoes}>
                    {OPCOES_PARCELAS.map((qtd) => (
                      <TouchableOpacity
                        key={qtd}
                        style={[
                          styles.parcelaChip,
                          parseInt(form.total_parcelas, 10) === qtd && styles.parcelaChipAtivo,
                        ]}
                        onPress={() =>
                          setForm((current) => ({ ...current, total_parcelas: qtd }))
                        }
                      >
                        <Text
                          style={[
                            styles.parcelaChipText,
                            parseInt(form.total_parcelas, 10) === qtd && styles.parcelaChipTextAtivo,
                          ]}
                        >
                          {qtd}x
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.inputParcelasCustom}
                    placeholder="Outro (1-36)"
                    keyboardType="numeric"
                    value={
                      OPCOES_PARCELAS.includes(parseInt(form.total_parcelas, 10))
                        ? ''
                        : String(form.total_parcelas || '')
                    }
                    onChangeText={(text) => {
                      const num = parseInt(text.replace(/\D/g, ''), 10);
                      if (!text) {
                        return;
                      }
                      if (!Number.isNaN(num) && num >= 1 && num <= 36) {
                        setForm((current) => ({ ...current, total_parcelas: num }));
                      }
                    }}
                    maxLength={2}
                  />
                  <Text style={styles.hintVencimento}>
                    O valor informado será dividido igualmente entre as parcelas. A 1ª parcela usa
                    a data de vencimento acima; as demais avançam mês a mês.
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.parceladoRow}
                onPress={() =>
                  setForm((current) => ({
                    ...current,
                    recorrente: !current.recorrente,
                    parcelado: !current.recorrente ? false : current.parcelado,
                  }))
                }
              >
                <View
                  style={[
                    styles.checkboxParcelado,
                    form.recorrente && styles.checkboxParceladoAtivo,
                  ]}
                >
                  {form.recorrente ? <AppIcon name="check" size={12} color="#fff" /> : null}
                </View>
                <Text style={styles.parceladoLabel}>Conta fixa (recorrência)</Text>
              </TouchableOpacity>

              {form.recorrente ? (
                <View style={styles.parcelasContainer}>
                  <Text style={styles.label}>Quantidade de meses:</Text>
                  <View style={styles.parcelasOpcoes}>
                    {OPCOES_RECORRENCIA.map((qtd) => (
                      <TouchableOpacity
                        key={qtd}
                        style={[
                          styles.parcelaChip,
                          parseInt(form.total_recorrencias, 10) === qtd && styles.parcelaChipAtivo,
                        ]}
                        onPress={() =>
                          setForm((current) => ({ ...current, total_recorrencias: qtd }))
                        }
                      >
                        <Text
                          style={[
                            styles.parcelaChipText,
                            parseInt(form.total_recorrencias, 10) === qtd &&
                              styles.parcelaChipTextAtivo,
                          ]}
                        >
                          {qtd} meses
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.inputParcelasCustom}
                    placeholder="Outro (1-36)"
                    keyboardType="numeric"
                    value={
                      OPCOES_RECORRENCIA.includes(parseInt(form.total_recorrencias, 10))
                        ? ''
                        : String(form.total_recorrencias || '')
                    }
                    onChangeText={(text) => {
                      const num = parseInt(text.replace(/\D/g, ''), 10);
                      if (!text) {
                        return;
                      }
                      if (!Number.isNaN(num) && num >= 1 && num <= 36) {
                        setForm((current) => ({ ...current, total_recorrencias: num }));
                      }
                    }}
                    maxLength={2}
                  />
                  <Text style={styles.hintVencimento}>
                    Cria lançamentos mensais com o mesmo valor e categoria pelos próximos meses.
                  </Text>
                </View>
              ) : null}
            </>
          ) : form.grupo_parcelamento ? (
            <Text style={styles.infoParcelaEdit}>
              Parcela {form.parcela_atual}/{form.total_parcelas_grupo} de um parcelamento
            </Text>
          ) : form.grupo_recorrencia ? (
            <Text style={styles.infoParcelaEdit}>
              Recorrência {form.recorrencia_atual}/{form.total_recorrencias_grupo}
            </Text>
          ) : null}

          <TouchableOpacity onPress={salvar} style={styles.btnSalvar}>
            <Text style={styles.btnText}>{editarConta ? 'Salvar Alterações' : 'Salvar Conta'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={reseteForms_onClose}
            style={[styles.btnSalvar, styles.btnCancelar]}
          >
            <Text style={[styles.btnText, styles.btnCancelarText]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#AEB8C7',
    padding: 10,
    color: '#fff',
    borderRadius: 6,
  },
  label: {
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
    padding: 8,
    borderRadius: 6,
  },
  selectWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginBottom: 4,
    overflow: 'hidden',
  },
  selectedCartaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  selectedCartao: {
    flex: 1,
    fontSize: 13,
    color: '#1E4DB7',
    fontWeight: '500',
  },
  avisoDebito: {
    backgroundColor: '#EAF9EF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#C8E6D0',
  },
  avisoDebitoTexto: {
    fontSize: 13,
    color: '#1E8E5A',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    marginRight: 8,
  },
  btnSalvar: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
  },
  btnCancelar: {
    backgroundColor: '#ccc',
  },
  btnText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  btnCancelarText: {
    color: '#333',
  },
  inputText: {
    color: '#333',
  },
  hintVencimento: {
    fontSize: 11,
    color: '#666',
    marginTop: -4,
    marginBottom: 4,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  inputDate: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 0,
    borderWidth: 0,
    color: '#333',
  },
  btnIconCalendario: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 38,
  },
  parceladoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkboxParcelado: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxParceladoAtivo: {
    backgroundColor: '#1E4DB7',
    borderColor: '#1E4DB7',
  },
  parceladoLabel: {
    fontWeight: '600',
    fontSize: 15,
  },
  parcelasContainer: {
    marginBottom: 12,
  },
  parcelasOpcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  parcelaChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f8f9fa',
  },
  parcelaChipAtivo: {
    backgroundColor: '#1E4DB7',
    borderColor: '#1E4DB7',
  },
  parcelaChipText: {
    color: '#333',
    fontWeight: '600',
  },
  parcelaChipTextAtivo: {
    color: '#fff',
  },
  inputParcelasCustom: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
    width: 120,
  },
  infoParcelaEdit: {
    fontSize: 13,
    color: '#1E4DB7',
    marginBottom: 12,
    fontWeight: '500',
  },
});
