/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        // Use CSS variables for easy theme changes
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          active: "var(--primary-active)",
          light: "var(--primary-light)",
          focus: "var(--primary-focus)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          light: "var(--accent-light)",
        },
        success: {
          DEFAULT: "var(--success)",
          light: "var(--success-light)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          light: "var(--warning-light)",
        },
        error: {
          DEFAULT: "var(--error)",
          light: "var(--error-light)",
        },
      },
    },
  },
};

