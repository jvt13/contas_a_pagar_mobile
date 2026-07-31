/**
 * Hook da tela Lançamentos detectados (captura experimental Android).
 */

import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import {
  listarRascunhosDetectados,
  ativarCapturaExperimental,
  desativarCapturaExperimental,
  obterStatusPermissao,
  marcarRascunhoImportado,
  marcarRascunhoIgnorado,
  excluirRascunho,
  limparTodosRascunhos,
  abrirConfiguracaoAcessoNotificacoes,
  obterModoAprendizado,
  definirModoAprendizado,
  sincronizarConfigNativa,
} from '../utils/lancamentosDetectados';

export default function useLancamentosDetectados() {
  const [rascunhos, setRascunhos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    permissaoConcedida: false,
    capturaAtiva: false,
  });
  const [modoAprendizado, setModoAprendizado] = useState(false);
  const [bancosMonitorados, setBancosMonitorados] = useState([]);
  const [pacotesPermitidos, setPacotesPermitidos] = useState([]);

  const recarregar = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setRascunhos([]);
      setBancosMonitorados([]);
      setPacotesPermitidos([]);
      setStatus({ permissaoConcedida: false, capturaAtiva: false });
      return;
    }
    setLoading(true);
    try {
      const [resultado, modo] = await Promise.all([
        listarRascunhosDetectados({ apenasPendentes: false }),
        obterModoAprendizado(),
      ]);
      setRascunhos(resultado?.rascunhos || []);
      setBancosMonitorados(resultado?.bancosMonitorados || []);
      setPacotesPermitidos(resultado?.pacotesPermitidos || []);
      setModoAprendizado(modo);
      setStatus(obterStatusPermissao());
    } catch (error) {
      console.error('Erro ao carregar lançamentos detectados:', error);
      setRascunhos([]);
      setBancosMonitorados([]);
      setPacotesPermitidos([]);
      setStatus(obterStatusPermissao());
    } finally {
      setLoading(false);
    }
  }, []);

  const ativar = useCallback(async () => {
    await ativarCapturaExperimental();
    await recarregar();
  }, [recarregar]);

  const desativar = useCallback(async () => {
    await desativarCapturaExperimental();
    await recarregar();
  }, [recarregar]);

  const abrirPermissaoAndroid = useCallback(async () => {
    const ok = await abrirConfiguracaoAcessoNotificacoes();
    setTimeout(() => {
      recarregar();
    }, 600);
    return ok;
  }, [recarregar]);

  const alternarModoAprendizado = useCallback(
    async (valor) => {
      await definirModoAprendizado(!!valor);
      await sincronizarConfigNativa();
      await recarregar();
    },
    [recarregar]
  );

  const ignorar = useCallback(
    async (id) => {
      await marcarRascunhoIgnorado(id);
      await recarregar();
    },
    [recarregar]
  );

  const excluir = useCallback(
    async (id) => {
      await excluirRascunho(id);
      await recarregar();
    },
    [recarregar]
  );

  const limpar = useCallback(async () => {
    await limparTodosRascunhos();
    await recarregar();
  }, [recarregar]);

  const marcarImportado = useCallback(
    async (id) => {
      await marcarRascunhoImportado(id);
      await recarregar();
    },
    [recarregar]
  );

  const pendentes = rascunhos.filter((r) => r.status === 'pendente');

  return {
    rascunhos,
    pendentes,
    loading,
    status,
    modoAprendizado,
    bancosMonitorados,
    pacotesPermitidos,
    recarregar,
    ativar,
    desativar,
    abrirPermissaoAndroid,
    alternarModoAprendizado,
    ignorar,
    excluir,
    limpar,
    marcarImportado,
  };
}
