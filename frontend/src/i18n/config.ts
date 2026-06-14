import 'server-only';

const dictionaries = {
    en: () => import('./dictionaries/en.json').then((module) => module.default),
    ar: () => import('./dictionaries/ar.json').then((module) => module.default),
};

export type Locale = 'en' | 'ar';

export const getDictionary = async (locale: Locale) => {
    return dictionaries[locale]?.() ?? dictionaries.en();
};

export const locales: Locale[] = ['en', 'ar'];

export const defaultLocale: Locale = 'en';

export const isRTL = (locale: Locale): boolean => locale === 'ar';

export const getDirection = (locale: Locale): 'rtl' | 'ltr' =>
    isRTL(locale) ? 'rtl' : 'ltr';
