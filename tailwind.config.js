/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        "glass": "rgba(255,255,255,0.08)",
        "neon-blue": "#4cc9f0",
        "neon-purple": "#8a4dff",
        "neon-pink": "#ff5bd8",
        "bg-deep": "#0b1020"
      },
      boxShadow: {
        glow: "0 0 24px rgba(76, 201, 240, 0.35)",
        glowPink: "0 0 24px rgba(255, 91, 216, 0.35)"
      },
      backdropBlur: {
        glass: "16px"
      }
    }
  },
  plugins: []
};
