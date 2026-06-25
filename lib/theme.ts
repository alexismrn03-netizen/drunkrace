// ── SYSTÈME DE THÈMES DRUNKRACE ──────────────────────────────────────────────

export type ThemeId = 'f1night' | 'casino' | 'ice'

export interface Theme {
  id: ThemeId
  name: string
  emoji: string
  // Backgrounds
  bg: string          // fond principal
  bgCard: string      // fond des cartes
  bgNav: string       // fond navbar
  // Borders
  border: string
  // Accents
  accent: string      // couleur principale
  accent2: string     // couleur secondaire
  accentGrad: string  // dégradé (CSS)
  // Text
  textMuted: string
  // Specific
  stripeBg: string    // fond bande latérale cartes
  glowColor: string   // couleur glow
  dots: [string, string, string] // preview dots
}

export const THEMES: Record<ThemeId, Theme> = {
  f1night: {
    id: 'f1night',
    name: 'F1 NIGHT',
    emoji: '🏁',
    bg: '#0a0a14',
    bgCard: '#13131f',
    bgNav: '#0a0a14',
    border: '#1e1e2e',
    accent: '#c084fc',
    accent2: '#ec4899',
    accentGrad: 'linear-gradient(135deg, #c084fc, #ec4899)',
    textMuted: '#6b7280',
    stripeBg: 'linear-gradient(to bottom, #a855f7, #7c3aed)',
    glowColor: '#a855f7',
    dots: ['#c084fc', '#ec4899', '#0a0a14'],
  },
  casino: {
    id: 'casino',
    name: 'CASINO',
    emoji: '🎰',
    bg: '#020e06',
    bgCard: '#051209',
    bgNav: '#020e06',
    border: '#0a2010',
    accent: '#4ade80',
    accent2: '#d4af37',
    accentGrad: 'linear-gradient(135deg, #22c55e, #d4af37)',
    textMuted: '#4b7060',
    stripeBg: 'linear-gradient(to bottom, #22c55e, #16a34a)',
    glowColor: '#22c55e',
    dots: ['#4ade80', '#d4af37', '#020e06'],
  },
  ice: {
    id: 'ice',
    name: 'ICE',
    emoji: '🧊',
    bg: '#030d14',
    bgCard: '#051420',
    bgNav: '#030d14',
    border: '#0c2030',
    accent: '#22d3ee',
    accent2: '#7dd3fc',
    accentGrad: 'linear-gradient(135deg, #06b6d4, #7dd3fc)',
    textMuted: '#4a7080',
    stripeBg: 'linear-gradient(to bottom, #06b6d4, #0891b2)',
    glowColor: '#06b6d4',
    dots: ['#22d3ee', '#7dd3fc', '#030d14'],
  },
}

export const DEFAULT_THEME: ThemeId = 'f1night'

// Lire le thème depuis localStorage
export function getSavedTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const t = localStorage.getItem('drunkrace_theme') as ThemeId
  return t && THEMES[t] ? t : DEFAULT_THEME
}

export function saveTheme(id: ThemeId) {
  if (typeof window === 'undefined') return
  localStorage.setItem('drunkrace_theme', id)
}

// Lire le volume depuis localStorage
export function getSavedVolume(): number {
  if (typeof window === 'undefined') return 60
  const v = localStorage.getItem('drunkrace_volume')
  return v !== null ? parseInt(v) : 60
}

export function saveVolume(v: number) {
  if (typeof window === 'undefined') return
  localStorage.setItem('drunkrace_volume', String(v))
}

export function getSavedMuted(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('drunkrace_muted') === 'true'
}

export function saveMuted(m: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem('drunkrace_muted', String(m))
}
