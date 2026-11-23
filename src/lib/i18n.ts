import { en, type TranslationKey } from '../locales/en';
import {
  LOCALES,
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  detectBrowserLanguage,
  getLanguageMeta,
  isSupportedLanguage,
  type AppLanguage,
  type LanguageMeta,
} from '../locales/registry';

export {
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  detectBrowserLanguage,
  getLanguageMeta,
  isSupportedLanguage,
  type AppLanguage,
  type LanguageMeta,
  type TranslationKey,
};

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const val = params[key];
    return val === undefined || val === null ? `{${key}}` : String(val);
  });
}

/**
 * Translates a key for the given language, falling back to English if unavailable.
 */
export function t(
  lang: AppLanguage | string,
  key: TranslationKey | string,
  params?: Record<string, string | number>
): string {
  const safeLang: AppLanguage = isSupportedLanguage(lang) ? lang : 'en';
  const dict = LOCALES[safeLang] as Record<string, string> | undefined;
  const fallbackDict = en as Record<string, string>;
  const raw = dict?.[key] || fallbackDict[key] || key;
  return interpolate(raw, params);
}

const STATUS_KEY_MAP: Record<string, TranslationKey> = {
  open: 'status_open',
  closed: 'status_closed',
  pending: 'status_pending',
  won: 'status_won',
  lost: 'status_lost',
  refunded: 'status_refunded',
  completed: 'status_completed',
  settled: 'status_completed',
  paid: 'status_completed',
  rejected: 'status_rejected',
  approved: 'status_approved',
  expired: 'status_expired',
  active: 'status_active',
  suspended: 'status_suspended',
  pending_verification: 'status_pending_verification',
  in_progress: 'status_in_progress',
  resolved: 'status_resolved',
  verified: 'status_verified',
  unverified: 'status_unverified',
};

/**
 * Translates dynamic backend status codes into localized user-facing labels.
 */
export function translateStatus(lang: AppLanguage, status: string | null | undefined): string {
  if (!status) return '';
  const normalized = status.toLowerCase().trim().replace(/[\s-]+/g, '_');
  const key = STATUS_KEY_MAP[normalized];
  return key ? t(lang, key) : status.replace(/_/g, ' ');
}

const CATEGORY_KEY_MAP: Record<string, TranslationKey> = {
  'Deposit problem': 'support_cat_deposit',
  'Withdrawal problem': 'support_cat_withdrawal',
  'Account problem': 'support_cat_account',
  'Bank account problem': 'support_cat_bank',
  'Game problem': 'support_cat_game',
  'Promotion or activity issue': 'support_cat_promo',
  'Cryptocurrency payment issue': 'support_cat_crypto',
  'Other problems': 'support_cat_other',
};

/**
 * Translates customer service issue category names while preserving canonical backend values.
 */
export function translateCategory(lang: AppLanguage, category: string): string {
  const key = CATEGORY_KEY_MAP[category];
  return key ? t(lang, key) : category;
}

const ERROR_PATTERNS: Array<{ pattern: RegExp; key: TranslationKey }> = [
  { pattern: /^invalid credentials/i, key: 'err_invalid_credentials' },
  { pattern: /insufficient available wallet balance|insufficient balance/i, key: 'err_insufficient_balance' },
  { pattern: /betting is closed/i, key: 'err_betting_closed' },
  { pattern: /phone number or email already exists/i, key: 'err_duplicate_account' },
  { pattern: /invalid verification code/i, key: 'err_invalid_code' },
  { pattern: /gift code not found/i, key: 'err_gift_not_found' },
  { pattern: /already redeemed this gift code/i, key: 'err_gift_already_redeemed' },
  { pattern: /gift code has expired/i, key: 'err_gift_expired' },
  { pattern: /authentication required|unauthorized/i, key: 'err_auth_required' },
];

/**
 * Translates common backend/API error messages while preserving unknown detailed messages.
 */
export function translateError(lang: AppLanguage, message: string | null | undefined): string {
  if (!message) return t(lang, 'err_generic');
  for (const { pattern, key } of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return t(lang, key);
    }
  }
  return message;
}

/**
 * Formats a number using the selected language's locale separators without altering its value.
 */
export function formatLocaleNumber(
  value: number | string,
  lang: AppLanguage = 'en',
  options?: Intl.NumberFormatOptions
): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const safe = Number.isFinite(num) ? num : 0;
  const { localeTag } = getLanguageMeta(lang);
  try {
    return new Intl.NumberFormat(localeTag, options).format(safe);
  } catch {
    return safe.toLocaleString('en-US', options);
  }
}

/**
 * Formats a monetary value according to the selected language's locale conventions
 * WITHOUT converting the numerical balance or changing the platform's actual currency.
 */
export function formatLocaleCurrency(
  amount: number | string,
  currency = 'USD',
  lang: AppLanguage = 'en'
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const safe = Number.isFinite(num) ? num : 0;
  const { localeTag } = getLanguageMeta(lang);
  const code = (currency || 'USD').toUpperCase();

  // ISO 4217 currency codes supported natively by Intl.NumberFormat
  if (/^[A-Z]{3}$/.test(code)) {
    try {
      return new Intl.NumberFormat(localeTag, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(safe);
    } catch {
      // fall through to symbol formatting below
    }
  }

  const formattedNum = formatLocaleNumber(safe, lang, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = code === 'INR' ? '₹' : code === 'KHR' ? '៛' : code === 'USD' ? '$' : `${code} `;
  return `${symbol}${formattedNum}`;
}

export function formatLocaleDate(
  date: string | number | Date,
  lang: AppLanguage = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const { localeTag } = getLanguageMeta(lang);
  try {
    return new Intl.DateTimeFormat(
      localeTag,
      options ?? { year: 'numeric', month: 'short', day: 'numeric' }
    ).format(d);
  } catch {
    return d.toLocaleDateString('en-US');
  }
}

export function formatLocaleTime(
  date: string | number | Date,
  lang: AppLanguage = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const { localeTag } = getLanguageMeta(lang);
  try {
    return new Intl.DateTimeFormat(
      localeTag,
      options ?? { hour: '2-digit', minute: '2-digit', second: '2-digit' }
    ).format(d);
  } catch {
    return d.toLocaleTimeString('en-US');
  }
}

export function formatLocaleDateTime(
  date: string | number | Date,
  lang: AppLanguage = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const { localeTag } = getLanguageMeta(lang);
  try {
    return new Intl.DateTimeFormat(
      localeTag,
      options ?? {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    ).format(d);
  } catch {
    return d.toLocaleString('en-US');
  }
}
