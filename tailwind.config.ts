import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        reddit: {
          orange: "#ff4500",
          dark: "#1a1a1b",
          card: "#ffffff",
          border: "#edeff1",
          hover: "#1e1e1e",
          text: "#1c1c1c",
          muted: "#718096",
          accent: "#ff4500",
        },
        primary: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          500: "#ff4500",
          600: "#ea3900",
          700: "#c2410c",
        },
      },
    },
  },
  plugins: [],
};
export default config;
