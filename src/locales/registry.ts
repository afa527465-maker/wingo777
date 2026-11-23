import { en, type TranslationDict } from './en';
import { zhCN } from './zh-CN';
import { km } from './km';
import { zhTW } from './zh-TW';
import { th } from './th';
import { vi } from './vi';
import { lo } from './lo';
import { id } from './id';
import { ms } from './ms';
import { hi } from './hi';
import { bn } from './bn';
import { my } from './my';
import { ja } from './ja';
import { ko } from './ko';
import { fr } from './fr';
import { es } from './es';
import { pt } from './pt';
import { de } from './de';
import { it } from './it';
import { ru } from './ru';
import { ar } from './ar';
import { tr } from './tr';
import { fil } from './fil';
import { ur } from './ur';
import { ne } from './ne';

export const SUPPORTED_LANGUAGE_CODES = [
  'en',
  'zh-CN',
  'km',
  'zh-TW',
  'th',
  'vi',
  'lo',
  'id',
  'ms',
  'hi',
  'bn',
  'my',
  'ja',
  'ko',
  'fr',
  'es',
  'pt',
  'de',
  'it',
  'ru',
  'ar',
  'tr',
  'fil',
  'ur',
  'ne',
] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export interface LanguageMeta {
  code: AppLanguage;
  nativeName: string;
  englishName: string;
  shortLabel: string;
  localeTag: string;
  dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: readonly LanguageMeta[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', shortLabel: 'EN', localeTag: 'en-US', dir: 'ltr' },
  { code: 'zh-CN', nativeName: '简体中文', englishName: 'Simplified Chinese', shortLabel: '简中', localeTag: 'zh-CN', dir: 'ltr' },
  { code: 'km', nativeName: 'ភាសាខ្មែរ', englishName: 'Khmer', shortLabel: 'KM', localeTag: 'km-KH', dir: 'ltr' },
  { code: 'zh-TW', nativeName: '繁體中文', englishName: 'Traditional Chinese', shortLabel: '繁中', localeTag: 'zh-TW', dir: 'ltr' },
  { code: 'th', nativeName: 'ไทย', englishName: 'Thai', shortLabel: 'TH', localeTag: 'th-TH', dir: 'ltr' },
  { code: 'vi', nativeName: 'Tiếng Việt', englishName: 'Vietnamese', shortLabel: 'VI', localeTag: 'vi-VN', dir: 'ltr' },
  { code: 'lo', nativeName: 'ພາສາລາວ', englishName: 'Lao', shortLabel: 'LO', localeTag: 'lo-LA', dir: 'ltr' },
  { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian', shortLabel: 'ID', localeTag: 'id-ID', dir: 'ltr' },
  { code: 'ms', nativeName: 'Bahasa Melayu', englishName: 'Malay', shortLabel: 'MS', localeTag: 'ms-MY', dir: 'ltr' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', shortLabel: 'HI', localeTag: 'hi-IN', dir: 'ltr' },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', shortLabel: 'BN', localeTag: 'bn-BD', dir: 'ltr' },
  { code: 'my', nativeName: 'မြန်မာဘာသာ', englishName: 'Burmese', shortLabel: 'MY', localeTag: 'my-MM', dir: 'ltr' },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese', shortLabel: 'JA', localeTag: 'ja-JP', dir: 'ltr' },
  { code: 'ko', nativeName: '한국어', englishName: 'Korean', shortLabel: 'KO', localeTag: 'ko-KR', dir: 'ltr' },
  { code: 'fr', nativeName: 'Français', englishName: 'French', shortLabel: 'FR', localeTag: 'fr-FR', dir: 'ltr' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', shortLabel: 'ES', localeTag: 'es-ES', dir: 'ltr' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese', shortLabel: 'PT', localeTag: 'pt-BR', dir: 'ltr' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', shortLabel: 'DE', localeTag: 'de-DE', dir: 'ltr' },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian', shortLabel: 'IT', localeTag: 'it-IT', dir: 'ltr' },
  { code: 'ru', nativeName: 'Русский', englishName: 'Russian', shortLabel: 'RU', localeTag: 'ru-RU', dir: 'ltr' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', shortLabel: 'AR', localeTag: 'ar-SA', dir: 'rtl' },
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', shortLabel: 'TR', localeTag: 'tr-TR', dir: 'ltr' },
  { code: 'fil', nativeName: 'Filipino', englishName: 'Filipino', shortLabel: 'FIL', localeTag: 'fil-PH', dir: 'ltr' },
  { code: 'ur', nativeName: 'اردو', englishName: 'Urdu', shortLabel: 'UR', localeTag: 'ur-PK', dir: 'rtl' },
  { code: 'ne', nativeName: 'नेपाली', englishName: 'Nepali', shortLabel: 'NE', localeTag: 'ne-NP', dir: 'ltr' },
] as const;

export const LOCALES: Record<AppLanguage, TranslationDict> = {
  en,
  'zh-CN': zhCN,
  km,
  'zh-TW': zhTW,
  th,
  vi,
  lo,
  id,
  ms,
  hi,
  bn,
  my,
  ja,
  ko,
  fr,
  es,
  pt,
  de,
  it,
  ru,
  ar,
  tr,
  fil,
  ur,
  ne,
};

const SUPPORTED_SET = new Set<string>(SUPPORTED_LANGUAGE_CODES);
const META_BY_CODE = new Map<AppLanguage, LanguageMeta>(
  SUPPORTED_LANGUAGES.map((meta) => [meta.code, meta])
);

export function isSupportedLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && SUPPORTED_SET.has(value);
}

export function getLanguageMeta(lang: AppLanguage | string): LanguageMeta {
  if (isSupportedLanguage(lang)) {
    return META_BY_CODE.get(lang)!;
  }
  return META_BY_CODE.get('en')!;
}

/**
 * Matches browser preferred languages as an initial suggestion only.
 * Never forces a language based on IP/location and always falls back to English.
 */
export function detectBrowserLanguage(browserLanguages?: readonly string[]): AppLanguage {
  const candidates =
    browserLanguages && browserLanguages.length > 0
      ? browserLanguages
      : typeof navigator !== 'undefined'
        ? navigator.languages && navigator.languages.length > 0
          ? navigator.languages
          : navigator.language
            ? [navigator.language]
            : []
        : [];

  for (const raw of candidates) {
    if (!raw) continue;
    const normalized = raw.trim().replace(/_/g, '-');
    const lower = normalized.toLowerCase();

    // Direct case-insensitive match
    for (const code of SUPPORTED_LANGUAGE_CODES) {
      if (code.toLowerCase() === lower) {
        return code;
      }
    }

    // Chinese script / region disambiguation
    if (lower.startsWith('zh')) {
      if (
        lower.includes('hant') ||
        lower.includes('-tw') ||
        lower.includes('-hk') ||
        lower.includes('-mo')
      ) {
        return 'zh-TW';
      }
      return 'zh-CN';
    }

    // Filipino / Tagalog mapping
    if (lower === 'tl' || lower.startsWith('tl-') || lower.startsWith('fil-')) {
      return 'fil';
    }

    // Primary subtag match (e.g., ar-AE -> ar, es-MX -> es, pt-PT -> pt)
    const primary = lower.split('-')[0];
    if (isSupportedLanguage(primary)) {
      return primary;
    }
  }

  return 'en';
}
