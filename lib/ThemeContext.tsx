"use client"
import { createContext, useContext, useState, type ReactNode } from "react"
import { THEMES, getSavedTheme, saveTheme, type ThemeId, type Theme } from "@/lib/theme"

interface ThemeContextType {
  themeId: ThemeId
  T: Theme
  setTheme: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextType>({
  themeId: "f1night",
  T: THEMES["f1night"],
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => getSavedTheme())
  const T = THEMES[themeId]

  const setTheme = (id: ThemeId) => {
    setThemeId(id)
    saveTheme(id)
  }

  // Injecter les couleurs du thème comme variables CSS globales
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--accent', T.accent)
    root.style.setProperty('--accent2', T.accent2)
    root.style.setProperty('--bg', T.bg)
    root.style.setProperty('--bg-card', T.bgCard)
    root.style.setProperty('--bg-nav', T.bgNav)
    root.style.setProperty('--border', T.border)
    root.style.setProperty('--accent-grad', T.accentGrad)
    root.style.setProperty('--text-muted', T.textMuted)
    root.style.setProperty('--glow', T.glowColor)
    // Changer aussi le background body
    document.body.style.background = T.bg
  }, [T])

  return (
    <ThemeContext.Provider value={{ themeId, T, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
