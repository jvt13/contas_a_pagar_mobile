import 'dotenv/config'; // só se usar .env

export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra, // mantém eas.projectId
    // Aqui sim, usamos a env do EAS ou, em dev, caímos no fallback local
    EXPO_PUBLIC_API_URL:
      process.env.EXPO_PUBLIC_API_URL ||
      'http://192.168.15.100:5000',
  },
});
