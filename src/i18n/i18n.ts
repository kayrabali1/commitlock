import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import de from './locales/de.json';
import tr from './locales/tr.json';

const STORE_LANGUAGE_KEY = 'settings.lang';

const languageDetectorPlugin = {
  type: 'languageDetector' as const,
  async: true,
  init: () => {},
  detect: async function (callback: (lang: string) => void) {
    try {
      // get stored language from Async storage
      const language = await AsyncStorage.getItem(STORE_LANGUAGE_KEY);
      if (language) {
        // if language was stored before, use this language in the app
        return callback(language);
      } else {
        // if language was not stored yet, use device's locale
        const deviceLang = Localization.getLocales()[0]?.languageCode || 'en';
        return callback(deviceLang);
      }
    } catch (error) {
      console.log('Error reading language', error);
      const deviceLang = Localization.getLocales()[0]?.languageCode || 'en';
      return callback(deviceLang);
    }
  },
  cacheUserLanguage: async function (language: string) {
    try {
      // save a user's language choice in Async storage
      await AsyncStorage.setItem(STORE_LANGUAGE_KEY, language);
    } catch (error) {
      console.log('Error saving language', error);
    }
  },
};

const resources = {
  en: { translation: en },
  de: { translation: de },
  tr: { translation: tr },
};

i18n
  .use(initReactI18next)
  .use(languageDetectorPlugin)
  .init({
    resources,
    compatibilityJSON: 'v4', // Required for React Native
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
