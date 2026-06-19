import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Correo Postino',
  description: 'Plataforma logística de Correo Postino',
}

// Script que aplica el tema antes del primer paint (evita el parpadeo).
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('cp_theme');
    var dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased dark:bg-gray-950 dark:text-gray-100 transition-colors">
        {children}
      </body>
    </html>
  )
}
