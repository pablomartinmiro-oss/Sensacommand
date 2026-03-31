import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#F8F7F4',
          darker: '#F0EFE9',
          card: '#FFFFFF',
          border: '#E8E4DD',
          muted: '#6B7280',
        },
        amber: {
          400: '#fbbf24',
          500: '#E8A838',
          600: '#D4971F',
        },
        emerald: {
          400: '#34d399',
          500: '#22C55E',
          600: '#059669',
        },
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['IBM Plex Sans', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
export default config;
