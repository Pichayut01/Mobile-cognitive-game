const AUTH_USER_STORAGE_KEY = "mobile-app-auth-user";
const AUTH_SESSION_STORAGE_KEY = "mobile-app-auth-session";
const DICEBEAR_MICAH_URL = "https://api.dicebear.com/9.x/micah/svg";

function readJson(key) {
  const storedValue = window.localStorage.getItem(key);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue);
  } catch {
    return null;
  }
}

function generateAvatarSeed() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function writeUser(user) {
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

export function getStoredUser() {
  const user = readJson(AUTH_USER_STORAGE_KEY);

  if (!user) {
    return null;
  }

  if (user.avatarSeed) {
    return user;
  }

  const hydratedUser = {
    ...user,
    avatarSeed: generateAvatarSeed(),
  };

  writeUser(hydratedUser);
  return hydratedUser;
}

export function saveUser(user) {
  const nextUser = {
    ...user,
    avatarSeed: user.avatarSeed ?? generateAvatarSeed(),
  };

  writeUser(nextUser);
}

export function getSession() {
  return readJson(AUTH_SESSION_STORAGE_KEY);
}

export function createSession(session) {
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

export function getDicebearAvatarUrl(seed) {
  return `${DICEBEAR_MICAH_URL}?seed=${encodeURIComponent(seed)}`;
}
