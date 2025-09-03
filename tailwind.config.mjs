/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        glass: "rgba(255,255,255,0.08)",
        accent: {
          DEFAULT: "#6366f1",
          fg: "#eef2ff",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.08),0 4px 16px -4px rgba(0,0,0,0.4),0 0 0 4px rgba(99,102,241,0.15)",
      },
      keyframes: {
        pop: { "0%": { transform: "translateY(4px)", opacity: 0 }, "100%": { transform: "translateY(0)", opacity: 1 } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        pulseBorder: { "0%,100%": { boxShadow: "0 0 0 0 rgba(99,102,241,0.6)" }, "50%": { boxShadow: "0 0 0 6px rgba(99,102,241,0)" } },
      },
      animation: {
        pop: "pop .3s ease",
        float: "float 5s ease-in-out infinite",
        pulseBorder: "pulseBorder 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};