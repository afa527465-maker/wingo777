import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  apiFetch,
  setSessionToken,
  getActiveSessionToken,
  type UserProfile,
  type WalletData,
} from '../lib/api';
import {
  detectBrowserLanguage,
  getLanguageMeta,
  isSupportedLanguage,
  type AppLanguage,
} from '../lib/i18n';

const LANG_STORAGE_KEY = 'wingo_preferred_lang';

function readStoredLanguage(): AppLanguage | null {
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isSupportedLanguage(saved)) return saved;
  } catch {
    // ignore storage access issues
  }
  return null;
}

function saveStoredLanguage(lang: AppLanguage) {
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore storage access issues
  }
}

function getInitialLanguage(): AppLanguage {
  const saved = readStoredLanguage();
  if (saved) return saved;
  return detectBrowserLanguage();
}

interface AuthContextValue {
  user: UserProfile | null;
  wallet: WalletData | null;
  loading: boolean;
  language: AppLanguage;
  dir: 'ltr' | 'rtl';
  setLanguage: (lang: AppLanguage) => void;
  signInWithGoogle: () => Promise<void>;
  setAuthenticatedSession: (token: string, user: UserProfile, wallet: WalletData) => void;
  refreshAccount: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguageState] = useState<AppLanguage>(getInitialLanguage);
  const hasExplicitLocalSelectionRef = useRef<boolean>(readStoredLanguage() !== null);

  const meta = getLanguageMeta(language);

  useEffect(() => {
    document.documentElement.lang = meta.localeTag;
    document.documentElement.dir = meta.dir;
  }, [meta.localeTag, meta.dir]);

  const reconcileUserLanguage = useCallback(
    (profileLang: string | undefined) => {
      const savedLocal = readStoredLanguage();
      if (savedLocal || hasExplicitLocalSelectionRef.current) {
        const activeLang = savedLocal || language;
        if (isSupportedLanguage(activeLang) && profileLang !== activeLang) {
          apiFetch('/api/auth/preferences', {
            method: 'PATCH',
            body: JSON.stringify({ language: activeLang }),
          }).catch(() => {});
        }
        return;
      }
      if (isSupportedLanguage(profileLang)) {
        setLanguageState(profileLang);
        saveStoredLanguage(profileLang);
      }
    },
    [language]
  );

  const refreshAccount = useCallback(async () => {
    if (!getActiveSessionToken()) {
      setUser(null);
      setWallet(null);
      return;
    }
    try {
      const data = await apiFetch<{ user: UserProfile; wallet: WalletData }>('/api/auth/me');
      setUser(data.user);
      setWallet(data.wallet);
      reconcileUserLanguage(data.user.language);
    } catch {
      setSessionToken(null);
      setUser(null);
      setWallet(null);
    }
  }, [reconcileUserLanguage]);

  useEffect(() => {
    refreshAccount().finally(() => setLoading(false));
  }, [refreshAccount]);

  const signInWithGoogle = useCallback(async () => {
    throw new Error('Google OAuth provider is not configured in standalone local mode. Sign in with your phone, email, or username.');
  }, []);

  const setAuthenticatedSession = useCallback(
    (token: string, nextUser: UserProfile, nextWallet: WalletData) => {
      setSessionToken(token);
      setUser(nextUser);
      setWallet(nextWallet);
      reconcileUserLanguage(nextUser.language);
    },
    [reconcileUserLanguage]
  );

  const setLanguage = useCallback(
    (lang: AppLanguage) => {
      if (!isSupportedLanguage(lang)) return;
      hasExplicitLocalSelectionRef.current = true;
      setLanguageState(lang);
      saveStoredLanguage(lang);
      if (user) {
        apiFetch('/api/auth/preferences', {
          method: 'PATCH',
          body: JSON.stringify({ language: lang }),
        }).catch(() => {});
      }
    },
    [user]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore if already expired
    }
    setSessionToken(null);
    setUser(null);
    setWallet(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        loading,
        language,
        dir: meta.dir,
        setLanguage,
        signInWithGoogle,
        setAuthenticatedSession,
        refreshAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
