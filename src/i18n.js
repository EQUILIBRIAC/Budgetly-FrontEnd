import { createI18n } from "vue-i18n";

import en from './locales/en.json'
import es from './locales/es.json'
import { isRef, watch } from "vue";

const STORAGE_KEY = 'app:locale';
const messages = { en, es };

const savedLocale =
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;

const locale = savedLocale && Object.prototype.hasOwnProperty.call(messages, savedLocale)
    ? savedLocale
    : 'en';

const i18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    globalInjection: true,
    messages
})

export function setUpLocalePersistence() {
    if(typeof  window === 'undefined') return;

    const locale = i18n.global.locale;

    if(isRef(locale)){
        watch(locale, (value) => {
            try{ localStorage.setItem(STORAGE_KEY, String(value));
            } catch {}
        }, {immediate: true});
    } else {
        try {
            localStorage.setItem(STORAGE_KEY, String(locale));
        }catch {

        }
    }
}

export default i18n;