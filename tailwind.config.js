/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "fly-across": {
          "0%": {
            transform: "translateX(-100%) translateY(-50%) rotate(-45deg)",
          },
          "100%": {
            transform: "translateX(200%) translateY(-50%) rotate(-45deg)",
          },
        },
      },
      animation: {
        "fly-across": "fly-across 8s linear infinite",
      },
    },
  },
  plugins: [],
};
