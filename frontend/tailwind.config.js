/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  mode: "jit",
  theme: {
    extend: {
      colors: {
        primary: "#000000",
        secondary: "#9b9b9b",
        tertiary: "#151030",
        "black-100": "#100d25",
        "black-200": "#090325",
        "white-100": "#f3f3f3",
        "neutral-1": "#2e2e2e",
        "neutral-2": "#1a1a1a",
      },
      boxShadow: {
        card: "0px 35px 120px -15px #211e35",
        custom: "0 0.5px 0.5px 1px rgba(0, 0, 0, 0.2), 0 10px 20px rgba(0, 0, 0, 0.2), 0 4px 5px 0px rgba(0, 0, 0, 0.05)",
      },
      keyframes: {
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        wave: {
          '30%': {
            opacity: '1',
            transform: 'translateY(4px) translateX(0) rotate(0)',
          },
          '50%': {
            opacity: '1',
            transform: 'translateY(-3px) translateX(0) rotate(0)',
            color: '#ff5569',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) translateX(0) rotate(0)',
          },
        },
        marquee: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
      },
      animation: {
        spin: 'spin 2s linear infinite paused',
        wave: 'wave 1.5s ease-in-out infinite',
        marquee: 'marquee 10s linear infinite',
      },
      screens: {
        xs: "450px",
        'h-sm': { 'raw': '(max-height: 450px)' },
      },
      backgroundImage: {
        "hero-pattern": "url('/src/assets/herobg.png')",
        'navbar-gradient': 'linear-gradient(to bottom, rgba(0, 0, 0, 1) 60%, rgba(0, 0, 0, 0))',
      },
    },
  },
  plugins: [],
};


