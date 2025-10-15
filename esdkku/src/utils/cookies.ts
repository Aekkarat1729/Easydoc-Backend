// esdkku/src/utils/cookies.ts
// ใช้ localStorage แทน cookies สำหรับ token

export const getCookie = (name: string): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  
  if (name === 'token') {
    try {
      const local = localStorage.getItem('esd-kku');
      if (local) {
        const parsed = JSON.parse(local);
        return parsed.token;
      }
    } catch (e) {
      console.error("Invalid token format in localStorage", e);
    }
  }
  
  return undefined;
};

export const setCookie = (name: string, value: string, options?: any): void => {
  if (typeof window === 'undefined') return;
  
  if (name === 'token') {
    try {
      const existing = localStorage.getItem('esd-kku');
      const data = existing ? JSON.parse(existing) : {};
      data.token = value;
      localStorage.setItem('esd-kku', JSON.stringify(data));
    } catch (e) {
      console.error("Error setting token in localStorage", e);
    }
  }
};

export const removeCookie = (name: string): void => {
  if (typeof window === 'undefined') return;
  
  if (name === 'token') {
    try {
      const existing = localStorage.getItem('esd-kku');
      if (existing) {
        const data = JSON.parse(existing);
        delete data.token;
        localStorage.setItem('esd-kku', JSON.stringify(data));
      }
    } catch (e) {
      console.error("Error removing token from localStorage", e);
    }
  }
};