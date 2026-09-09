/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))', foreground: 'hsl(var(--foreground))',
        primary: 'hsl(var(--primary))', 'primary-foreground': 'hsl(var(--primary-foreground))',
        secondary: 'hsl(var(--secondary))', accent: 'hsl(var(--accent))',
        muted: 'hsl(var(--muted))', 'muted-foreground': 'hsl(var(--muted-foreground))',
        border: 'hsl(var(--border))',
      },
      fontFamily: { body: ['Ray', 'sans-serif'], display: ['Azar', 'Ray', 'sans-serif'] },
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)' }
    }
  }
}
