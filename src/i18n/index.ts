import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import enUi from './locales/en/ui.json';
import enGame from './locales/en/game.json';
import enCampaign from './locales/en/campaign.json';
import enIntro from './locales/en/intro.json';

import frCommon from './locales/fr/common.json';
import frUi from './locales/fr/ui.json';
import frGame from './locales/fr/game.json';
import frCampaign from './locales/fr/campaign.json';
import frIntro from './locales/fr/intro.json';

import { STORAGE_KEYS } from '@/src/storageKeys';

export const I18N_STORAGE_KEY = STORAGE_KEYS.i18nLang;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        ui: enUi,
        game: enGame,
        campaign: enCampaign,
        intro: enIntro,
      },
      fr: {
        common: frCommon,
        ui: frUi,
        game: frGame,
        campaign: frCampaign,
        intro: frIntro,
      },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],
    defaultNS: 'common',
    ns: ['common', 'ui', 'game', 'campaign', 'intro'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: I18N_STORAGE_KEY,
    },
  });

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
  try {
    localStorage.setItem(I18N_STORAGE_KEY, lng);
  } catch {
    /* ignore */
  }
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language;
}

export default i18n;
