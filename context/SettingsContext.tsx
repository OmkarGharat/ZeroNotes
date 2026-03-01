import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { encrypt, decrypt } from '../services/encryption';

export interface AppSettings {
  autoSave: boolean;
  geminiApiKey: string;
}

const defaultSettings: AppSettings = {
  autoSave: true,
  geminiApiKey: '',
};

const SETTINGS_KEY = 'zeronotes-settings';
const API_KEY_STORAGE_KEY = 'zeronotes-api-key-encrypted';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  updateSettings: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = { ...defaultSettings, ...JSON.parse(stored) };
        // API key is loaded asynchronously (decryption is async)
        parsed.geminiApiKey = '';
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
    return defaultSettings;
  });

  // Load encrypted API key on mount
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const encrypted = localStorage.getItem(API_KEY_STORAGE_KEY);
        if (encrypted) {
          const decrypted = await decrypt(encrypted);
          setSettings(prev => ({ ...prev, geminiApiKey: decrypted }));
        } else {
          // Migration: check if there's a plain text key in the old settings
          const stored = localStorage.getItem(SETTINGS_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.geminiApiKey) {
              // Encrypt and move to secure storage
              const enc = await encrypt(parsed.geminiApiKey);
              localStorage.setItem(API_KEY_STORAGE_KEY, enc);
              // Remove plain text key from settings
              delete parsed.geminiApiKey;
              localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
              
              const decrypted = await decrypt(enc);
              setSettings(prev => ({ ...prev, geminiApiKey: decrypted }));
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load API key:', e);
      }
    };
    loadApiKey();
  }, []);

  // Save non-sensitive settings to localStorage
  useEffect(() => {
    const { geminiApiKey, ...safeSettings } = settings;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(safeSettings));
  }, [settings]);

  const updateSettings = async (updates: Partial<AppSettings>) => {
    // If API key is being updated, encrypt and store separately
    if (updates.geminiApiKey !== undefined) {
      try {
        if (updates.geminiApiKey) {
          const encrypted = await encrypt(updates.geminiApiKey);
          localStorage.setItem(API_KEY_STORAGE_KEY, encrypted);
        } else {
          localStorage.removeItem(API_KEY_STORAGE_KEY);
        }
      } catch (e) {
        console.warn('Failed to encrypt API key:', e);
      }
    }
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
