import type { Metadata, Viewport } from "next"
import "./globals.css"

export const viewport: Viewport = {
  themeColor: "#a855f7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: "DrunkRace 🏁",
  description: "La course de soirée entre amis",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DrunkRace",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="DrunkRace"/>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png"/>
        <meta name="theme-color" content="#0a0a14"/>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet"/>
        <meta name="mobile-web-app-capable" content="yes"/>
      </head>
      <body style={{ margin:0, background:"#0a0a14", minHeight:"100vh" }}>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js')
                .then(() => console.log('SW registered'))
                .catch(e => console.log('SW failed:', e))
            })
          }
        `}}/>
      </body>
    </html>
  )
}
