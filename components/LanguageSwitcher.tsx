"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const changeLocale = (newLocale: string) => {
    startTransition(() => {
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
      window.location.reload();
    });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border-2 border-gray-100 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md group"
        disabled={isPending}
        aria-label="Change language"
      >
        <Globe className={`w-5 h-5 text-gray-600 group-hover:text-primary transition-colors ${isPending ? 'animate-spin' : ''}`} />
        <span className="font-bold text-sm text-gray-700 uppercase">
          {locale}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 min-w-[120px] animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => changeLocale('fr')}
            className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${
              locale === 'fr' ? 'bg-primary/5 text-primary font-bold' : 'text-gray-700'
            }`}
          >
            <span className="text-lg">🇫🇷</span>
            <span className="text-sm">Français</span>
          </button>
          <button
            onClick={() => changeLocale('en')}
            className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-2 ${
              locale === 'en' ? 'bg-primary/5 text-primary font-bold' : 'text-gray-700'
            }`}
          >
            <span className="text-lg">🇬🇧</span>
            <span className="text-sm">English</span>
          </button>
        </div>
      )}
    </div>
  );
}
