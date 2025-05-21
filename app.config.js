import 'dotenv/config'; // se usar .env

export default ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,                           // mantém eas.projectId
    EXPO_PUBLIC_API_URL:'http://192.168.15.100:5000'             // ou fallback local
  }
});
