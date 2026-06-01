import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  token: '@authToken',
  userId: '@userId',
  username: '@username',
  userKeyShare: '@userKeyShare',
  userKeyShareId: '@userKeyShareId',
};

const FIELD_TO_KEY = {
  token: STORAGE_KEYS.token,
  userId: STORAGE_KEYS.userId,
  username: STORAGE_KEYS.username,
  key_share: STORAGE_KEYS.userKeyShare,
  key_share_id: STORAGE_KEYS.userKeyShareId,
};

export async function saveSession(session = {}) {
  const tasks = Object.entries(FIELD_TO_KEY).map(async ([field, storageKey]) => {
    if (session[field] === undefined) {
      return;
    }

    const value = session[field];
    if (value === null || value === '') {
      await AsyncStorage.removeItem(storageKey);
      return;
    }

    await AsyncStorage.setItem(storageKey, String(value));
  });

  await Promise.all(tasks);
}

export async function clearSession() {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
}

export async function getAuthToken() {
  return AsyncStorage.getItem(STORAGE_KEYS.token);
}

export async function hasValidSession() {
  const [userId, orgId] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.userId),
    AsyncStorage.getItem(STORAGE_KEYS.userKeyShareId),
  ]);

  // Backend atual não emite JWT; sessão = userId + organização
  return Boolean(userId && orgId);
}
