// PostCSS: Tailwind v4 (solo para la página /tienda, ver src/app/tienda/tienda.css)
// + autoprefixer, que Next.js traía por defecto y hay que declarar a mano
// al tener un postcss.config propio (lo necesitan, por ejemplo, los
// `backdrop-filter` del chatbot en Safari viejo).
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
  },
};
