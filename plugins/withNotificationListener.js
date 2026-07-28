/**
 * Config plugin de segurança: garante declaração do NotificationListenerService
 * no AndroidManifest gerado pelo prebuild/EAS (além do manifest do módulo local).
 * Não versiona a pasta android/.
 */
const {
  withAndroidManifest,
  AndroidConfig,
} = require('@expo/config-plugins');

const SERVICE_NAME =
  'expo.modules.notificationcapture.NotificationCaptureService';

function ensureNotificationListenerService(androidManifest) {
  const app = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
  if (!app.service) {
    app.service = [];
  }

  const exists = app.service.some(
    (service) => service?.$?.['android:name'] === SERVICE_NAME
  );

  if (!exists) {
    app.service.push({
      $: {
        'android:name': SERVICE_NAME,
        'android:exported': 'true',
        'android:label': 'OrganizeContas — captura de notificações',
        'android:permission':
          'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
      },
      'intent-filter': [
        {
          action: [
            {
              $: {
                'android:name':
                  'android.service.notification.NotificationListenerService',
              },
            },
          ],
        },
      ],
    });
  }

  return androidManifest;
}

function withNotificationListener(config) {
  return withAndroidManifest(config, (config) => {
    config.modResults = ensureNotificationListenerService(config.modResults);
    return config;
  });
}

module.exports = withNotificationListener;
