/**
 * Tailwind v4 is a PostCSS plugin rather than a config file — the design tokens
 * themselves live in `src/app/globals.css` under `@theme`, which is why there is
 * no `tailwind.config.ts` in this project.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
