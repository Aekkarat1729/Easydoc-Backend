// src/i18n/index.ts
import th from "./th";

const resources = {
  th,
};

const currentLang = 'th';

export function t(key: string): string {
  const keys = key.split('.');
  let result: unknown = resources[currentLang];

  for (const k of keys) {
    if (typeof result === 'object' && result !== null && k in result) {
      result = (result as Record<string, unknown>)[k];
    } else {
      return key; // fallback เป็น key เอง
    }
  }

  return typeof result === 'string' ? result : key;
}