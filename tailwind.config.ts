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
      },
    },
  },
  plugins: [],
};
export default config;
