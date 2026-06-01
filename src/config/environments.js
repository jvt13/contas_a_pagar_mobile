/**
 * Fonte única de URLs da API por ambiente.
 *
 * DEV (Expo Go / metro): .env → EXPO_PUBLIC_API_URL ou API_URL_LOCAL
 * EAS (APK/AAB): eas.json / .bat → EXPO_PUBLIC_API_URL (produção)
 */

export const API_URL_PRODUCTION = 'https://api-contas.srv-jvt.com';

export const DEV_API_HOST = '192.168.15.100';
export const DEV_API_PORT = 3100;
export const DEV_API_SCHEME = 'http';

export function buildApiBaseUrl(
  host = DEV_API_HOST,
  port = DEV_API_PORT,
  scheme = DEV_API_SCHEME
) {
  return `${scheme}://${host}:${port}`;
}

/** URL padrão quando não há EXPO_PUBLIC_API_URL (desenvolvimento local). */
export const API_URL_LOCAL = buildApiBaseUrl();

/**
 * Resolve a URL em tempo de build (app.config.js).
 * @param {boolean} isEasBuild true no servidor EAS
 */
export function resolveApiUrlForBuild(isEasBuild = false) {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.trim();
  }
  if (isEasBuild) {
    return API_URL_PRODUCTION;
  }
  return API_URL_LOCAL;
}
