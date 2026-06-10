import { useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { postDados } from '../utils/services';
import { STORAGE_KEYS } from '../utils/authSession';
import {
  msgToast,
  formatarErroApi,
  normalizarVencimentoParaApi,
  validarVencimentoConta,
} from '../utils/util';
import { extrairMesAnoCompetencia } from '../utils/competenciaCartao';
import { isCartaoDebito, formatarDataBRHoje } from '../utils/tipoCartao';
import {
  ESCOPOS_PARCELA,
  OPCOES_PARCELAS,
  contaPertenceGrupoParcela,
  extrairNomeBaseParcela,
  perguntarEscopoParcela,
} from '../utils/parcelamento';

export { OPCOES_PARCELAS };

export default function useNovaConta(ano, mes, onSuccess, editarConta, cartaoSelecionado = null) {
  const [form, setForm] = useState({
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
  const [valorBackend, setValorBackend] = useState({ valor: '' });

  async function salvarConta() {
    const {
      tipo_cartao,
      nome,
      categoria,
      vencimento,
      parcelado,
      total_parcelas,
      recorrente,
      total_recorrencias,
    } = form;

    if (!tipo_cartao || !nome || !categoria || !vencimento || !valorBackend?.valor) {
      return Alert.alert('Erro', 'Preencha todos os campos.');
    }

    const ehDebito = isCartaoDebito(cartaoSelecionado);

    if (ehDebito && !editarConta && (parcelado || recorrente)) {
      return Alert.alert(
        'Erro',
        'Parcelamento e recorrência estão disponíveis apenas para cartão de crédito.'
      );
    }

    let vencimentoFinal = vencimento;
    if (ehDebito && !editarConta) {
      vencimentoFinal = formatarDataBRHoje();
    }

    const vencimentoNormalizado = normalizarVencimentoParaApi(vencimentoFinal, mes, ano);
    if (!vencimentoNormalizado || !validarVencimentoConta(vencimentoNormalizado)) {
      return Alert.alert(
        'Erro',
        'Informe uma data de vencimento válida (dd/mm/aaaa). Se escolheu um cartão, o dia será aplicado ao mês/ano selecionados na tela principal.'
      );
    }

    const organization = await AsyncStorage.getItem(STORAGE_KEYS.userKeyShareId);
    const userId = await AsyncStorage.getItem(STORAGE_KEYS.userId);

    if (!organization) {
      return Alert.alert('Erro', 'Organização não encontrada.');
    }

    const competencia = extrairMesAnoCompetencia(vencimentoNormalizado);
    const mesCompetencia = competencia?.mesIndex0 ?? mes;
    const anoCompetencia = competencia?.ano ?? ano;

    let escopo = ESCOPOS_PARCELA.APENAS_ESTA;

    if (editarConta && contaPertenceGrupoParcela(form)) {
      const escopoEscolhido = await perguntarEscopoParcela(
        'Aplicar alterações',
        'Esta conta faz parte de um grupo. Deseja aplicar as alterações para:'
      );
      if (!escopoEscolhido) {
        return false;
      }
      escopo = escopoEscolhido;
    }

    const totalParcelas = parseInt(total_parcelas, 10);
    const totalRecorrencias = parseInt(total_recorrencias, 10);
    const isParcelado = !editarConta && parcelado && totalParcelas > 1;
    const isRecorrente = !editarConta && recorrente && totalRecorrencias > 1;

    if (isParcelado && isRecorrente) {
      return Alert.alert('Erro', 'Escolha apenas um modo: parcelado ou recorrente.');
    }

    const hoje = new Date();
    const mesLancamento = hoje.getMonth();
    const anoLancamento = hoje.getFullYear();

    const payload = {
      ...form,
      nome: extrairNomeBaseParcela(nome),
      subcategoria: form.subcategoria || null,
      ano: anoCompetencia,
      mes: mesCompetencia,
      vencimento: vencimentoNormalizado,
      data_lancamento: formatarDataBRHoje(),
      valor: valorBackend.valor,
      conta_user: userId,
      organization,
      parcelado: ehDebito ? false : isParcelado,
      total_parcelas: ehDebito ? 1 : isParcelado ? totalParcelas : 1,
      recorrente: ehDebito ? false : isRecorrente,
      total_recorrencias: ehDebito ? 1 : isRecorrente ? totalRecorrencias : 1,
      paga: ehDebito && !editarConta ? true : undefined,
      escopo,
    };

    try {
      if (__DEV__) {
        console.log('[useNovaConta] payload:', payload);
      }

      if (editarConta) {
        const res = await postDados('/form_conta/editar', payload);
        if (res?.success) {
          finalizaSets();
          msgToast('Conta atualizada com sucesso!');
          onSuccess?.();
          return true;
        }

        Alert.alert('Erro', res?.message || 'Falha ao editar conta');
      } else {
        const res = await postDados('/form_conta', payload);
        if (res?.success) {
          finalizaSets();
          const qtd = isParcelado ? totalParcelas : isRecorrente ? totalRecorrencias : 1;
          msgToast(
            isParcelado
              ? `${qtd} parcelas adicionadas com sucesso!`
              : isRecorrente
                ? `${qtd} recorrências adicionadas com sucesso!`
                : 'Conta adicionada com sucesso!'
          );
          onSuccess?.({
            mes: String(mesLancamento),
            ano: String(anoLancamento),
            vencimento: vencimentoNormalizado,
          });
          return true;
        }

        Alert.alert('Erro', res?.message || 'Falha ao adicionar conta');
      }
    } catch (error) {
      console.error('[useNovaConta] salvarConta:', error);
      Alert.alert(
        'Erro',
        formatarErroApi(error, editarConta ? 'Erro ao editar conta' : 'Erro ao adicionar conta')
      );
    }

    return false;
  }

  const finalizaSets = () => {
    setValorBackend({ valor: '' });
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
  };

  return { form, setForm, valorBackend, setValorBackend, salvarConta };
}
