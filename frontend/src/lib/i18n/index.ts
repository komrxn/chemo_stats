/**
 * Internationalization (i18n) System
 * 
 * Supported languages:
 * - English (en)
 * - Русский (ru)
 * - O'zbek (uz)
 * 
 * To edit translations, modify the corresponding language file:
 * - /src/lib/i18n/en.ts - English
 * - /src/lib/i18n/ru.ts - Русский
 * - /src/lib/i18n/uz.ts - O'zbek
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { en } from './en'
import { ru } from './ru'
import { uz } from './uz'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type Language = 'en' | 'ru' | 'uz'
export type TranslationKey = keyof typeof en

// ═══════════════════════════════════════════════════════════════════════════
// Translations Map
// ═══════════════════════════════════════════════════════════════════════════

const translations: Record<Language, Record<string, string>> = {
  en,
  ru,
  uz,
}

// ═══════════════════════════════════════════════════════════════════════════
// Language Store
// ═══════════════════════════════════════════════════════════════════════════

interface I18nStore {
  language: Language
  setLanguage: (lang: Language) => void
}

export const useI18nStore = create<I18nStore>()(
  persist(
    (set) => ({
      language: 'ru', // Default to Russian
      setLanguage: (language) => set({ language }),
    }),
    { name: 'kkh-language' }
  )
)

// ═══════════════════════════════════════════════════════════════════════════
// Translation Hook
// ═══════════════════════════════════════════════════════════════════════════

export function useTranslation() {
  const { language, setLanguage } = useI18nStore()

  /**
   * Get translation for a key
   * @param key - Translation key
   * @returns Translated string or key if not found
   */
  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key
  }

  return { t, language, setLanguage }
}

// ═══════════════════════════════════════════════════════════════════════════
// Language Metadata
// ═══════════════════════════════════════════════════════════════════════════

export const languages: { value: Language; label: string; flag: string; native: string }[] = [
  { value: 'en', label: 'English', flag: '🇬🇧', native: 'English' },
  { value: 'ru', label: 'Русский', flag: '🇷🇺', native: 'Русский' },
  { value: 'uz', label: "O'zbek", flag: '🇺🇿', native: "O'zbekcha" },
]
