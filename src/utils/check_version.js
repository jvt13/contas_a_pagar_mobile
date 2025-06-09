import VersionCheck from 'react-native-version-check';
import { Alert, Linking } from 'react-native';

export async function verificarAtualizacao() {
  try {
    const currentVersion = VersionCheck.getCurrentVersion();
    const latestVersion = await VersionCheck.getLatestVersion();

    console.log(`Versão Atual: ${currentVersion}`);
    console.log(`Versão Play Store: ${latestVersion}`);

    const updateNeeded = VersionCheck.needUpdate({
      currentVersion,
      latestVersion
    });

    if (updateNeeded.isNeeded) {
      Alert.alert(
        'Nova versão disponível!',
        'Deseja atualizar o aplicativo?',
        [
          {
            text: 'Agora não',
            style: 'cancel'
          },
          {
            text: 'Atualizar',
            onPress: () => {
              const storeUrl = VersionCheck.getStoreUrl();
              Linking.openURL(storeUrl);
            }
          }
        ]
      );
    }
  } catch (error) {
    console.error('Erro ao verificar atualização:', error);
  }
}
