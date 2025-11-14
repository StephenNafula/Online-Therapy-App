module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        "primary": "#4A90E2",
        "background-light": "#f6f7f8",
        "background-dark": "#0A192F",
        "primary-text": "#FFFFFF",
        "secondary-text": "#C7D3E3",
        "card-dark": "rgba(23, 37, 61, 0.5)",
        "glow": "#9DF7E5",
        "highlight": "#64FFDA",
        "input-bg": "rgba(42, 60, 85, 0.2)",
        "input-border": "rgba(69, 90, 125, 0.5)",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.5rem",
        "lg": "1rem",
        "xl": "1.5rem",
        "full": "9999px"
      },
      boxShadow: {
        'glow': '0 0 15px rgba(100, 255, 218, 0.1)',
        'glow-md': '0 0 25px rgba(100, 255, 218, 0.15)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
