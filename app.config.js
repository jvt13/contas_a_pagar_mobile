import 'dotenv/config';

export default ({ config }) => {
  // EAS_BUILD é "true" somente no servidor de build da Expo
  const isEAS = !!process.env.EAS_BUILD;

  return {
    ...config,
    extra: {
      ...config.extra,
      EXPO_PUBLIC_API_URL: isEAS
        ? process.env.EXPO_PUBLIC_API_URL                    // build (preview, production…)
        : 'http://192.168.15.100:5000',                      // dev local (expo start, expo run:android)
    },
  };
};
