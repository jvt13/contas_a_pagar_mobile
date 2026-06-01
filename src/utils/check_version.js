import Constants from 'expo-constants';
import VersionCheck from 'react-native-version-check';
import { Alert, Linking } from 'react-native';

function resolveCurrentVersion() {
  const fromNative = VersionCheck.getCurrentVersion?.();
  if (fromNative) {
    return String(fromNative);
  }

  return Constants.expoConfig?.version || Constants.manifest?.version || null;
}

export async function verificarAtualizacao() {
  if (__DEV__) {
    return;
  }

  try {
    const currentVersion = resolveCurrentVersion();
    if (!currentVersion) {
      console.warn(
        '[version-check] Versão atual indisponível no ambiente. Verificação ignorada.'
      );
      return;
    }

    const latestVersion = await VersionCheck.getLatestVersion();
    if (!latestVersion) {
      console.warn(
        '[version-check] Versão da loja indisponível. Verificação ignorada.'
      );
      return;
    }

    const updateNeeded = await VersionCheck.needUpdate({
      currentVersion,
      latestVersion,
    });

    if (!updateNeeded || typeof updateNeeded.isNeeded !== 'boolean') {
      console.warn('[version-check] Resposta inválida de needUpdate:', updateNeeded);
      return;
    }

    if (updateNeeded.isNeeded) {
      Alert.alert(
        'Nova versão disponível!',
        'Deseja atualizar o aplicativo?',
        [
          { text: 'Agora não', style: 'cancel' },
          {
            text: 'Atualizar',
            onPress: () => {
              const storeUrl = VersionCheck.getStoreUrl();
              if (storeUrl) {
                Linking.openURL(storeUrl);
              }
            },
          },
        ]
      );
    }
  } catch (error) {
    console.warn('[version-check] Falha ao verificar atualização:', error?.message || error);
  }
}
