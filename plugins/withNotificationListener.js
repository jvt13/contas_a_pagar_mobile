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
        'android:enabled': 'true',
        'android:label': 'OrganizeContas',
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
  } else {
    // Garante atributos essenciais mesmo se já existir (prebuild incremental)
    const service = app.service.find(
      (item) => item?.$?.['android:name'] === SERVICE_NAME
    );
    if (service?.$) {
      service.$['android:exported'] = 'true';
      service.$['android:enabled'] = 'true';
      service.$['android:label'] = service.$['android:label'] || 'OrganizeContas';
      service.$['android:permission'] =
        'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE';
    }
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
