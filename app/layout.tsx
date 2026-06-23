import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "DrunkRace 🏁",
  description: "La course de soirée entre amis",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, background: "#0a0a14", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  )
}
