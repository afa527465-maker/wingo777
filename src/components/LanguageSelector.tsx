import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Globe, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  SUPPORTED_LANGUAGES,
  detectBrowserLanguage,
  getLanguageMeta,
  t,
  type AppLanguage,
} from '../lib/i18n';

interface LanguageSelectorProps {
  variant?: 'header-dark' | 'header-light' | 'admin-dark';
  compact?: boolean;
}

export function LanguageSelector({
  variant = 'header-dark',
  compact = false,
}: LanguageSelectorProps) {
  const { language, setLanguage } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentMeta = useMemo(() => getLanguageMeta(language), [language]);
  const browserSuggested = useMemo(() => detectBrowserLanguage(), []);

  const filteredLanguages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter(
      (item) =>
        item.nativeName.toLowerCase().includes(q) ||
        item.englishName.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.shortLabel.toLowerCase().includes(q)
    );
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 30);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleSelect = (code: AppLanguage) => {
    setLanguage(code);
    setOpen(false);
  };

  const triggerClasses =
    variant === 'admin-dark'
      ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
      : variant === 'header-light'
        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
        : 'bg-white/20 hover:bg-white/30 text-white';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t(language, 'lang_select_title')}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${triggerClasses}`}
      >
        <Globe className="w-3.5 h-3.5 shrink-0" />
        <span className="max-w-[84px] truncate">
          {compact ? currentMeta.shortLabel : currentMeta.nativeName}
        </span>
        <ChevronDown className="w-3 h-3 opacity-80 shrink-0" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t(language, 'lang_select_title')}
        >
          <div
            className="bg-white text-slate-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[82vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="wingo-gradient text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                <h3 className="font-display font-bold text-base">
                  {t(language, 'lang_select_title')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t(language, 'common_close')}
                className="p-1.5 rounded-full bg-white/15 hover:bg-white/25 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t(language, 'lang_search_placeholder')}
                  className="w-full ps-9 pe-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#F54E2E]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label={t(language, 'common_close')}
                    className="absolute end-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Language List */}
            <div className="overflow-y-auto p-2.5 space-y-1 flex-1">
              {filteredLanguages.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  {t(language, 'lang_no_results')}
                </div>
              ) : (
                filteredLanguages.map((item) => {
                  const selected = item.code === language;
                  const isSuggested = item.code === browserSuggested && item.code !== 'en';
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleSelect(item.code)}
                      className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-start transition cursor-pointer ${
                        selected
                          ? 'bg-orange-50 border border-orange-200 text-[#E63E22]'
                          : 'hover:bg-slate-50 border border-transparent text-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{item.nativeName}</span>
                          {item.nativeName !== item.englishName && (
                            <span className="text-xs text-slate-400">{item.englishName}</span>
                          )}
                          {isSuggested && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {t(language, 'lang_browser_suggested')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono-num uppercase text-slate-400">
                          {item.code}
                        </span>
                        {selected && <Check className="w-4 h-4 text-[#F54E2E]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
