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
  const [modoAprendizado, setModoAprendizado] = useState(true);

  const recarregar = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setRascunhos([]);
      setStatus({ permissaoConcedida: false, capturaAtiva: false });
      return;
    }
    setLoading(true);
    try {
      await sincronizarConfigNativa();
      const [lista, modo] = await Promise.all([
        listarRascunhosDetectados({ apenasPendentes: false }),
        obterModoAprendizado(),
      ]);
      setRascunhos(lista);
      setModoAprendizado(modo);
      setStatus(obterStatusPermissao());
    } catch (error) {
      console.error('Erro ao carregar lançamentos detectados:', error);
      setRascunhos([]);
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
    // Reconsulta status ao voltar (usuário pode ter habilitado)
    setTimeout(() => {
      recarregar();
    }, 600);
    return ok;
  }, [recarregar]);

  const alternarModoAprendizado = useCallback(
    async (valor) => {
      await definirModoAprendizado(!!valor);
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
