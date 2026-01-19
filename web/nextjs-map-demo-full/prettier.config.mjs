/** @type {import('prettier').Options} */

const config = {
  singleQuote: true,
  semi: false,
  plugins: ['prettier-plugin-organize-imports', 'prettier-plugin-tailwindcss'],
  tailwindFunctions: ['clsx'],
  tailwindStylesheet: './src/styles/tailwind.css',
}
export default config;