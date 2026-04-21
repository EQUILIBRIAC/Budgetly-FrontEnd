import {createI18n} from "vue-i18n";

import es from './locales/es.json'
import en from './locales/en.json'
import {isRef, watch} from "vue";

const STORAGE_KEY = 'app:locale';

const saved =
    (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) ||
    'en';


const i18n = createI18n({
    legacy: false,
    locale: saved,
    globalInjection: true,
    messages:{
        es,
        en
    }
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