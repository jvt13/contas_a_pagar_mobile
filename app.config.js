import 'dotenv/config';
import { resolveApiUrlForBuild } from './src/config/environments';

export default ({ config }) => {
  const isEAS = !!process.env.EAS_BUILD;
  const apiUrl = resolveApiUrlForBuild(isEAS);

  return {
    ...config,
    extra: {
      ...config.extra,
      EXPO_PUBLIC_API_URL: apiUrl,
      APP_ENV: isEAS ? 'production' : 'development',
    },
  };
};
