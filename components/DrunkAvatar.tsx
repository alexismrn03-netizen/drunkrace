"use client"
import { useEffect, useRef } from "react"

export interface AvatarConfig {
  teamIndex: number   // 0-9 = écurie F1
  helmetColor: number // 0-11 = couleur casque
  visorColor: number  // 0-5 = couleur visière
}

export const DEFAULT_AVATAR: AvatarConfig = {
  teamIndex: 0,
  helmetColor: 0,
  visorColor: 0,
}

// Pour compat avec le reste du code
export const SKIN_TONES    = ["#fde8d0"]
export const HAIR_COLORS   = ["#1a0a00"]
export const OUTFIT_COLORS = ["#e10600"]
export const AVATAR_COUNT  = 10

export const F1_TEAMS = [
  { name: "Red Bull",      primary: "#0600ef", secondary: "#cc1e4a", accent: "#ffd700" },
  { name: "Ferrari",       primary: "#e8002d", secondary: "#ffffff", accent: "#ffd700" },
  { name: "Mercedes",      primary: "#00d2be", secondary: "#000000", accent: "#c0c0c0" },
  { name: "McLaren",       primary: "#ff8000", secondary: "#000000", accent: "#ffffff" },
  { name: "Aston Martin",  primary: "#006f62", secondary: "#cedc00", accent: "#ffffff" },
  { name: "Alpine",        primary: "#0093cc", secondary: "#ff69b4", accent: "#ffffff" },
  { name: "Williams",      primary: "#005aff", secondary: "#ffffff", accent: "#00a0dd" },
  { name: "Haas",          primary: "#b6babd", secondary: "#e8002d", accent: "#ffffff" },
  { name: "RB",            primary: "#6692ff", secondary: "#1e41ff", accent: "#ffffff" },
  { name: "Kick Sauber",   primary: "#52e252", secondary: "#000000", accent: "#ffffff" },
]

export const HELMET_COLORS = [
  { name: "Rouge F1",    color: "#e10600" },
  { name: "Bleu nuit",   color: "#00008b" },
  { name: "Noir mat",    color: "#1a1a1a" },
  { name: "Blanc",       color: "#f0f0f0" },
  { name: "Jaune",       color: "#ffd700" },
  { name: "Vert",        color: "#00a550" },
  { name: "Orange",      color: "#ff6600" },
  { name: "Rose",        color: "#ec4899" },
  { name: "Violet",      color: "#7c3aed" },
  { name: "Cyan",        color: "#00d2be" },
  { name: "Argent",      color: "#c0c0c0" },
  { name: "Or",          color: "#d4af37" },
]

export const VISOR_COLORS = [
  { name: "Noir",    color: "#0a0a0a" },
  { name: "Miroir",  color: "#c0c0c0" },
  { name: "Bleu",    color: "#1e3a8a" },
  { name: "Rouge",   color: "#7f1d1d" },
  { name: "Or",      color: "#92400e" },
  { name: "Fumé",    color: "#374151" },
]

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#',''), 16)
  const r = Math.min(255, Math.max(0, (n >> 16) + amt))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + amt))
  const b = Math.min(255, Math.max(0, (n & 0xff) + amt))
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

export function renderAvatarSVG(cfg: AvatarConfig, bac = 0): string {
  const team   = F1_TEAMS[cfg.teamIndex % F1_TEAMS.length]
  const helmet = HELMET_COLORS[cfg.helmetColor % HELMET_COLORS.length].color
  const visor  = VISOR_COLORS[cfg.visorColor % VISOR_COLORS.length].color
  const tp     = team.primary
  const ts     = team.secondary
  const ta     = team.accent
  const hL     = lighten(helmet, 35)
  const hD     = lighten(helmet, -30)

  const cheekOp = Math.min(0.65, Math.max(0, (bac - 0.3) * 0.9))
  const sweat    = bac > 0.8
  const stars    = bac > 1.2
  const zzz      = bac > 1.8
  const eyeOpen  = bac < 1.5 ? 1 : Math.max(0.1, 1 - (bac - 1.5) * 0.85)

  const uid = `f1_${cfg.teamIndex}_${cfg.helmetColor}_${cfg.visorColor}`

  return `
  <defs>
    <radialGradient id="hg${uid}" cx="35%" cy="28%" r="70%">
      <stop offset="0%" stop-color="${hL}"/>
      <stop offset="55%" stop-color="${helmet}"/>
      <stop offset="100%" stop-color="${hD}"/>
    </radialGradient>
    <radialGradient id="sk${uid}" cx="40%" cy="30%" r="68%">
      <stop offset="0%" stop-color="#fde8d0"/>
      <stop offset="60%" stop-color="#f5cba7"/>
      <stop offset="100%" stop-color="#dba678"/>
    </radialGradient>
    <radialGradient id="suit${uid}" cx="35%" cy="25%" r="70%">
      <stop offset="0%" stop-color="${lighten(tp, 25)}"/>
      <stop offset="60%" stop-color="${tp}"/>
      <stop offset="100%" stop-color="${lighten(tp, -30)}"/>
    </radialGradient>
    <linearGradient id="visor${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${visor}" stop-opacity="0.97"/>
      <stop offset="100%" stop-color="${lighten(visor, -20)}" stop-opacity="0.95"/>
    </linearGradient>
    <radialGradient id="shadow${uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#000" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Ground shadow -->
  <ellipse cx="50" cy="148" rx="24" ry="5" fill="url(#shadow${uid})"/>

  <!-- ── COMBINAISON / CORPS ──────────────────────────────────────── -->
  <!-- Jambes -->
  <path d="M33,100 Q30,118 29,132 Q29,137 34,137 Q39,137 39,132 Q38,118 40,100Z"
    fill="${lighten(tp,-15)}"/>
  <path d="M67,100 Q70,118 71,132 Q71,137 66,137 Q61,137 61,132 Q62,118 60,100Z"
    fill="${lighten(tp,-15)}"/>
  <!-- Chaussures -->
  <ellipse cx="34" cy="136" rx="11" ry="5" fill="#111" transform="rotate(-5,34,136)"/>
  <ellipse cx="66" cy="136" rx="11" ry="5" fill="#111" transform="rotate(5,66,136)"/>
  <ellipse cx="31" cy="134" rx="5" ry="2" fill="white" opacity="0.1"/>
  <ellipse cx="63" cy="134" rx="5" ry="2" fill="white" opacity="0.1"/>

  <!-- Bras G -->
  <path d="M27,65 Q18,78 18,97 Q18,103 24,103 Q30,103 30,97 Q29,80 33,67Z"
    fill="url(#suit${uid})"/>
  <!-- Bras D -->
  <path d="M73,65 Q82,78 82,97 Q82,103 76,103 Q70,103 70,97 Q71,80 67,67Z"
    fill="url(#suit${uid})"/>
  <!-- Gants -->
  <ellipse cx="23" cy="103" r="7" fill="${lighten(ts,10)}"/>
  <ellipse cx="77" cy="103" r="7" fill="${lighten(ts,10)}"/>

  <!-- Torse combinaison -->
  <path d="M27,63 Q24,76 26,90 Q28,100 33,104 L67,104 Q72,100 74,90 Q76,76 73,63 Q62,57 50,57 Q38,57 27,63Z"
    fill="url(#suit${uid})"/>

  <!-- Bandes latérales équipe -->
  <path d="M27,63 Q25,76 26,92 Q28,80 27,63Z" fill="${ts}" opacity="0.7"/>
  <path d="M73,63 Q75,76 74,92 Q72,80 73,63Z" fill="${ts}" opacity="0.7"/>

  <!-- Logo équipe sur poitrine -->
  <rect x="36" y="68" width="28" height="8" rx="3" fill="${ts}" opacity="0.9"/>
  <rect x="36" y="68" width="28" height="8" rx="3" fill="${ta}" opacity="0.15"/>

  <!-- Numéro sur poitrine -->
  <rect x="40" y="80" width="20" height="14" rx="3" fill="${lighten(tp,20)}" opacity="0.3"/>

  <!-- Bandes taille -->
  <path d="M28,92 Q50,96 72,92 Q50,98 28,92Z" fill="${ts}" opacity="0.5"/>

  <!-- HANS device / harnais -->
  <path d="M32,58 Q50,54 68,58 Q62,63 50,61 Q38,63 32,58Z" fill="${hD}" opacity="0.8"/>

  <!-- ── CASCO ─────────────────────────────────────────────────── -->
  <!-- Coque casque principale -->
  <ellipse cx="50" cy="34" rx="30" ry="32" fill="url(#hg${uid})"/>

  <!-- Cache-oreilles -->
  <ellipse cx="21" cy="42" rx="8" ry="11" fill="${helmet}"/>
  <ellipse cx="79" cy="42" rx="8" ry="11" fill="${helmet}"/>
  <ellipse cx="21" cy="42" rx="5" ry="7" fill="${hD}"/>
  <ellipse cx="79" cy="42" rx="5" ry="7" fill="${hD}"/>

  <!-- Visière -->
  <path d="M21,30 Q50,21 79,30 L77,55 Q50,65 23,55Z" fill="url(#visor${uid})"/>
  <!-- Reflet visière -->
  <path d="M24,32 Q50,24 76,32 L75,41 Q50,34 25,41Z" fill="white" opacity="0.08"/>
  <!-- Contour visière -->
  <path d="M21,30 Q50,21 79,30" fill="none" stroke="${hD}" stroke-width="2.5"/>
  <path d="M22,55 Q50,65 78,55" fill="none" stroke="${hD}" stroke-width="1.5"/>

  <!-- Bande centrale déco -->
  <rect x="46" y="3" width="8" height="36" rx="4" fill="${hD}" opacity="0.65"/>
  <!-- Bandes latérales équipe sur casque -->
  <path d="M22,20 Q26,10 34,6 Q28,14 22,20Z" fill="${ts}" opacity="0.6"/>
  <path d="M78,20 Q74,10 66,6 Q72,14 78,20Z" fill="${ts}" opacity="0.6"/>

  <!-- Boulons -->
  <circle cx="24" cy="26" r="3.5" fill="${hD}"/>
  <circle cx="76" cy="26" r="3.5" fill="${hD}"/>

  <!-- Reflet haut casque -->
  <ellipse cx="38" cy="14" rx="13" ry="7" fill="white" opacity="0.18"/>
  <ellipse cx="34" cy="11" rx="6" ry="3" fill="white" opacity="0.1"/>

  <!-- ── VISAGE (visible sous visière si bac élevé) ─────────────── -->
  <!-- Visage partiel visible sous visière ouverte -->
  ${bac > 1.0 ? `
  <!-- Visage légèrement visible -->
  <ellipse cx="50" cy="50" rx="12" ry="8" fill="#f5cba7" opacity="${Math.min(0.9, (bac-1)*0.8)}"/>
  <ellipse cx="44" cy="48" rx="2" ry="${eyeOpen * 1.5}" fill="#050510" opacity="0.8"/>
  <ellipse cx="56" cy="48" rx="2" ry="${eyeOpen * 1.5}" fill="#050510" opacity="0.8"/>
  <path d="${bac < 1.5 ? 'M44,53 Q50,57 56,53' : 'M44,55 Q50,51 56,55'}"
    stroke="#7a3535" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.8"/>
  ` : ''}

  <!-- ── EFFETS BAC ──────────────────────────────────────────────── -->
  ${cheekOp > 0.05 ? `
  <ellipse cx="22" cy="48" rx="6" ry="4" fill="#ff9cb4" opacity="${cheekOp}"/>
  <ellipse cx="78" cy="48" rx="6" ry="4" fill="#ff9cb4" opacity="${cheekOp}"/>` : ''}
  ${sweat ? `<ellipse cx="82" cy="20" rx="3" ry="5" fill="#60a5fa" opacity="0.8"/>` : ''}
  ${stars ? `<text x="2" y="18" font-size="13">⭐</text><text x="76" y="14" font-size="11">✨</text>` : ''}
  ${zzz ? `<text x="76" y="9" font-size="10" fill="#60a5fa">z</text>
    <text x="84" y="2" font-size="12" fill="#60a5fa" opacity="0.7">z</text>` : ''}
  `
}

// compat export
export function buildAvatarUrl(_cfg: AvatarConfig): string { return '' }

interface Props {
  config: AvatarConfig
  bac?: number
  size?: number
  animate?: boolean
  isMe?: boolean
  color?: string
}

export default function DrunkAvatar({ config, bac = 0, size = 80, animate = true, isMe = false, color }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!animate || !containerRef.current) return
    const el = containerRef.current
    const frame = (ts: number) => {
      if (!el) return
      if (bac < 0.2) el.style.transform = `translateY(${Math.sin(ts/900)*2}px)`
      else if (bac < 0.5) el.style.transform = `rotate(${Math.sin(ts/700)*6}deg)`
      else if (bac < 0.8) el.style.transform = `rotate(${Math.sin(ts/450)*13}deg) translateX(${Math.sin(ts/550)*4}px)`
      else if (bac < 1.2) el.style.transform = `rotate(${Math.sin(ts/300)*20}deg) translate(${Math.sin(ts/280)*9}px,${Math.abs(Math.sin(ts/240))*6}px)`
      else if (bac < 1.8) el.style.transform = `rotate(${Math.sin(ts/200)*28}deg) translate(${Math.sin(ts/170)*12}px,${Math.abs(Math.sin(ts/150))*9}px) scale(${1+Math.sin(ts/280)*0.08})`
      else { el.style.transform = `rotate(${(ts/7)%360}deg) scale(${0.8+Math.sin(ts/320)*0.2})`; el.style.opacity = String(0.5+Math.sin(ts/550)*0.5) }
      frameRef.current = requestAnimationFrame(frame)
    }
    frameRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(frameRef.current)
  }, [bac, animate])

  const svgContent = renderAvatarSVG(config, bac)

  return (
    <div style={{ position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
      {isMe && <div style={{ position:"absolute", inset:-4, borderRadius:"50%", background:`radial-gradient(circle, ${color||"#a855f7"}50, transparent 70%)`, pointerEvents:"none" }}/>}
      <div ref={containerRef} style={{ transformOrigin:"center 78%", willChange:"transform" }}>
        <svg width={size} height={size*1.5} viewBox="0 0 100 150" overflow="visible"
          dangerouslySetInnerHTML={{ __html: svgContent }}/>
      </div>
    </div>
  )
}
