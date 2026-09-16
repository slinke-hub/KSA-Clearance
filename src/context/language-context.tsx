'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '@/lib/i18n/translations';

export type UserRole = 'ADMIN' | 'AGENT' | 'AUDITOR';
export type Theme = 'light' | 'dark';
export type NavigationTab = 'console' | 'ingestion' | 'tariff' | 'regulations' | 'audit' | 'admin';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  dir: 'ltr' | 'rtl';
  t: typeof translations['en'];
  role: UserRole;
  setRole: (role: UserRole) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [role, setRole] = useState<UserRole>('AGENT');
  const [theme, setThemeState] = useState<Theme>('dark'); // Default to sleek dark mode
  const [activeTab, setActiveTab] = useState<NavigationTab>('console');
  const [themeReady, setThemeReady] = useState(false);

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    // Read saved theme from localStorage if available
    let savedTheme: string | null = null;
    try { savedTheme = localStorage.getItem('ksa_theme'); } catch { /* Session-only theme if storage is unavailable. */ }
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setThemeState(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setThemeState('light');
    }
    setThemeReady(true);
  }, []);

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [dir, language]);

  useEffect(() => {
    if (!themeReady) return;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('ksa_theme', theme); } catch { /* Theme still works without persistence. */ }
  }, [theme, themeReady]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const t = translations[language];

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        dir,
        t,
        role,
        setRole,
        theme,
        setTheme,
        toggleTheme,
        activeTab,
        setActiveTab,
      }}
    >
      <div dir={dir} className={language === 'ar' ? 'font-arabic' : 'font-sans'}>
        {children}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
