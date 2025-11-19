"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "../locales/en/common.json";
import teCommon from "../locales/te/common.json";
import taCommon from "../locales/ta/common.json";
import hiCommon from "../locales/hi/common.json";

const resources = {
  en: { common: enCommon },
  te: { common: teCommon },
  ta: { common: taCommon },
  hi: { common: hiCommon },
};

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: typeof window !== "undefined" ? (localStorage.getItem("language") || "en") : "en",
      fallbackLng: "en",
      ns: ["common"],
      defaultNS: "common",
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    })
    .catch(() => {
      // Swallow init errors to avoid breaking UI; i18n will fall back to defaults.
    });
}

export default i18n;
