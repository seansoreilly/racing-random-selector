/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./*.js", "./lib/**/*.js"],
  theme: {
    extend: {
      colors: {
        // Racing theme colors
        "racing-red": "#DC2626",
        "racing-black": "#1F2937",
        "racing-white": "#F9FAFB",
        "racing-yellow": "#FCD34D",
        "racing-green": "#10B981",
        "racing-blue": "#3B82F6",
        "racing-orange": "#F97316",
        // Custom racing palette
        primary: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
        },
        secondary: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
        accent: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
      },
      fontFamily: {
        racing: ["Montserrat", "sans-serif"],
        display: ["Poppins", "sans-serif"],
      },
      animation: {
        race: "race 3s ease-in-out",
        winner: "winner 1s ease-in-out",
        checkered: "checkered 0.5s ease-in-out infinite",
        countdown: "countdown 1s ease-in-out",
      },
      keyframes: {
        race: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
        winner: {
          "0%": { transform: "scale(1)", opacity: "0" },
          "50%": { transform: "scale(1.1)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        checkered: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        countdown: {
          "0%": { transform: "scale(1.2)", opacity: "0" },
          "50%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.9)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
