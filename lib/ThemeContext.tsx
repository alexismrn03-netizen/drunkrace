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

  return (
    <ThemeContext.Provider value={{ themeId, T, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
