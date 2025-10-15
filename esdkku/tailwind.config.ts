import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans Thai Variable"', 'sans-serif'],
      },
    },
  },
};

export default config;