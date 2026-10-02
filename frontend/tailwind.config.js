// Couleur issue d'une variable CSS (triplet RGB défini dans src/assets/main.css) :
// les thèmes clair et sombre changent les variables, pas les classes.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js}"
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces et texte
        bg: token('bg'),
        surface: token('surface'),
        sunken: token('sunken'),
        line: { DEFAULT: token('line'), field: token('line-field') },
        ink: { DEFAULT: token('ink'), 2: token('ink-2'), 3: token('ink-3') },
        // Action
        primary: { DEFAULT: token('primary'), soft: token('primary-soft'), ink: token('primary-ink') },
        'on-primary': token('on-primary'),
        // Données : une couleur par nature d'argent, identique dans toute l'app
        capital: token('capital'),     // l'argent de la banque : capital, prêt
        interest: token('interest'),   // le coût du crédit : intérêts
        insurance: token('insurance'), // l'assurance emprunteur
        apport: token('apport'),       // l'argent personnel : apport
        // États
        danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
        warn: { ink: token('warn-ink'), soft: token('warn-soft'), line: token('warn-line') }
      },
      fontFamily: {
        sans: ['"Archivo Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif']
      },
      // Échelle typographique : 12 / 14 / 16 / 20 / 28 / 44
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.25rem', { lineHeight: '1.625rem' }],
        xl: ['1.75rem', { lineHeight: '2.125rem' }],
        hero: ['2.75rem', { lineHeight: '1' }]
      }
    }
  },
  plugins: []
}
