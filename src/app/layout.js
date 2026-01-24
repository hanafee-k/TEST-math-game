import './globals.css'

export const metadata = {
  title: 'Math Adventure - เกมคณิตศาสตร์สุดมันส์',
  description: 'เกมผจญภัยคณิตศาสตร์ 2D ฝึกสมองบวกลบเลข สนุกและท้าทาย!',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: 0,
  },
  themeColor: '#667eea',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="overflow-hidden overscroll-none touch-none">
        {children}
      </body>
    </html>
  )
}