/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          'Helvetica Neue',
          'Segoe UI',
          'Apple SD Gothic Neo',
          'Noto Sans KR',
          'sans-serif',
        ],
        serif: ['Nanum Myeongjo', 'serif'],
      },
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.slate.700'),
            '--tw-prose-headings': theme('colors.slate.900'),
            '--tw-prose-links': theme('colors.brand.700'),
            'h2': {
              fontSize: '1.5rem',
              marginTop: '2.25rem',
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: `2px solid ${theme('colors.slate.200')}`,
              fontWeight: '700',
            },
            'h3': {
              fontSize: '1.25rem',
              marginTop: '1.75rem',
              marginBottom: '0.75rem',
              fontWeight: '700',
            },
            'p': {
              lineHeight: '1.85',
              marginTop: '1rem',
              marginBottom: '1rem',
            },
            'ul, ol': {
              marginTop: '0.75rem',
              marginBottom: '0.75rem',
            },
            'li': {
              marginTop: '0.25rem',
              marginBottom: '0.25rem',
            },
            'a': {
              fontWeight: '500',
              textDecoration: 'underline',
              textDecorationColor: theme('colors.brand.300'),
              textUnderlineOffset: '3px',
              '&:hover': {
                color: theme('colors.brand.800'),
              },
            },
            'blockquote': {
              borderLeftColor: theme('colors.brand.500'),
              backgroundColor: theme('colors.brand.50'),
              padding: '0.75rem 1rem',
              borderRadius: '0.25rem',
              fontStyle: 'normal',
              fontWeight: '400',
            },
          },
        },
      }),
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
