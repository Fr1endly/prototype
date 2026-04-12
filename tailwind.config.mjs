/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        cream:    '#FAF6F0',
        sand:     '#EDE5D8',
        sage:     '#8A9E85',
        blush:    '#C9897A',
        espresso: '#3B2A1A',
        mist:     '#D8E2DC',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        body:    ['Jost', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
