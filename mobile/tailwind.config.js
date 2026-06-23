/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Brand palette — mirrors web CSS custom properties
        purple: {
          DEFAULT: "#5B2FA0",
          light: "#7B4FBF",
          dark: "#3D1F6E",
          foreground: "#FAFAFA",
        },
        cream: {
          DEFAULT: "#FAF6E8",
          foreground: "#231F16",
        },
        teal: {
          DEFAULT: "#3A9B8E",
          light: "#5AB5A9",
          dark: "#257A6F",
          foreground: "#FAFAFA",
        },
        gold: {
          DEFAULT: "#D4B44A",
          light: "#E6CC6A",
          dark: "#A88A2E",
        },
        border: "#DDD8C8",
        input: "#DDD8C8",
        muted: {
          DEFAULT: "#F0ECE0",
          foreground: "#756B5C",
        },
      },
      fontFamily: {
        sans: ["Inter_400Regular", "System"],
        "sans-medium": ["Inter_500Medium", "System"],
        "sans-semibold": ["Inter_600SemiBold", "System"],
        "sans-bold": ["Inter_700Bold", "System"],
      },
      borderRadius: {
        DEFAULT: "8px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        full: "9999px",
      },
    },
  },
  plugins: [],
};
