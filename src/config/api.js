/**
 * Configuração da API — reexporta de environments.js (compatibilidade).
 * Em runtime o app usa EXPO_PUBLIC_API_URL embutido via app.config.js.
 */
export {
  DEV_API_HOST,
  DEV_API_PORT,
  DEV_API_SCHEME,
  API_URL_LOCAL as API_BASE_URL,
  API_URL_LOCAL as DEV_API_URL,
  buildApiBaseUrl,
} from './environments';
