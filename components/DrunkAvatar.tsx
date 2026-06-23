"use client"
import { useEffect, useRef } from "react"

export interface AvatarConfig {
  sex: "M" | "F"
  skinTone: number   // 0-5
  hairColor: number  // 0-7
  hairStyle: number  // 0-4
  outfit: number     // 0-4
  accessory: number  // 0-5 (0=none,1=sunglasses,2=glasses,3=party hat,4=crown,5=f1 helmet)
  outfitColor: number // 0-5
}

export const DEFAULT_AVATAR: AvatarConfig = {
  sex: "M", skinTone: 0, hairColor: 0, hairStyle: 0,
  outfit: 0, accessory: 0, outfitColor: 0
}

export const SKIN_TONES = ["#FDBCB4","#F5CBA7","#F1C27D","#C68642","#8D5524","#4A2912"]
export const HAIR_COLORS = ["#1a0a00","#3D2314","#6B3A2A","#B5651D","#D4A017","#E8C547","#EC4899","#a855f7"]
export const OUTFIT_COLORS = ["#6366f1","#ec4899","#22c55e","#ef4444","#f59e0b","#0ea5e9"]
export const AVATAR_COUNT = 12

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#',''), 16)
  const r = Math.min(255,Math.max(0,(n>>16)+amt))
  const g = Math.min(255,Math.max(0,((n>>8)&0xff)+amt))
  const b = Math.min(255,Math.max(0,(n&0xff)+amt))
  return '#'+((r<<16)|(g<<8)|b).toString(16).padStart(6,'0')
}

export function renderAvatarSVG(cfg: AvatarConfig, bac: number = 0, size: number = 100): string {
  const skin = SKIN_TONES[cfg.skinTone] || SKIN_TONES[0]
  const hair = HAIR_COLORS[cfg.hairColor] || HAIR_COLORS[0]
  const oc   = OUTFIT_COLORS[cfg.outfitColor] || OUTFIT_COLORS[0]
  const isFemale = cfg.sex === "F"

  const eyeOpen = bac < 1.5 ? 1 : Math.max(0.1, 1-(bac-1.5)*0.9)
  const cheekOp = Math.min(0.65, bac*1.3)
  const mouthD  = bac < 0.3
    ? "M32,68 Q40,73 48,68"
    : bac < 1.5
    ? "M32,66 Q40,77 48,66"
    : "M32,72 Q40,65 48,72"
  const sweat = bac > 0.8

  // Hair styles
  const hairSVG = (() => {
    switch(cfg.hairStyle) {
      case 0: return `
        <ellipse cx="40" cy="10" rx="24" ry="11" fill="${hair}"/>
        <rect x="16" y="10" width="48" height="13" fill="${hair}"/>
        ${isFemale ? `<rect x="14" y="12" width="9" height="35" rx="4" fill="${hair}"/>
        <rect x="57" y="12" width="9" height="35" rx="4" fill="${hair}"/>` : ''}`
      case 1: return `
        <ellipse cx="40" cy="8" rx="26" ry="13" fill="${hair}"/>
        <ellipse cx="40" cy="13" rx="28" ry="10" fill="${hair}"/>
        <ellipse cx="15" cy="22" rx="8" ry="14" fill="${hair}"/>
        <ellipse cx="65" cy="22" rx="8" ry="14" fill="${hair}"/>
        ${isFemale ? `<rect x="12" y="20" width="9" height="30" rx="4" fill="${hair}"/>
        <rect x="59" y="20" width="9" height="30" rx="4" fill="${hair}"/>` : ''}`
      case 2: return `
        <ellipse cx="40" cy="9" rx="24" ry="11" fill="${hair}"/>
        <circle cx="40" cy="3" r="9" fill="${hair}"/>
        ${isFemale ? `<rect x="13" y="14" width="9" height="32" rx="4" fill="${hair}"/>
        <rect x="58" y="14" width="9" height="32" rx="4" fill="${hair}"/>` : ''}`
      case 3: return `
        <rect x="34" y="0" width="12" height="22" rx="6" fill="${hair}"/>
        <rect x="15" y="11" width="11" height="7" rx="3" fill="${hair}"/>
        <rect x="54" y="11" width="11" height="7" rx="3" fill="${hair}"/>`
      case 4: return `
        <ellipse cx="40" cy="9" rx="24" ry="11" fill="${hair}"/>
        <rect x="16" y="10" width="44" height="12" fill="${hair}"/>
        <ellipse cx="20" cy="21" rx="7" ry="10" fill="${hair}"/>`
      default: return ''
    }
  })()

  // Outfit
  const outfitSVG = (() => {
    switch(cfg.outfit) {
      case 0: return `
        <rect x="18" y="60" width="44" height="28" rx="12" fill="${oc}"/>
        <polygon points="34,60 40,72 46,60" fill="white" opacity="0.7"/>
        <ellipse cx="11" cy="72" rx="8" ry="6" fill="${oc}" transform="rotate(18 11 72)"/>
        <ellipse cx="69" cy="72" rx="8" ry="6" fill="${oc}" transform="rotate(-18 69 72)"/>
        <circle cx="5" cy="80" r="6" fill="${skin}"/>
        <circle cx="75" cy="80" r="6" fill="${skin}"/>`
      case 1: return `
        <rect x="18" y="60" width="44" height="28" rx="12" fill="#1a1a2e"/>
        <rect x="20" y="62" width="40" height="24" rx="11" fill="${oc}" opacity="0.15"/>
        <polygon points="34,60 40,68 46,60" fill="white" opacity="0.5"/>
        <rect x="36" y="62" width="8" height="20" fill="white" opacity="0.15"/>
        <ellipse cx="11" cy="72" rx="8" ry="6" fill="#1a1a2e" transform="rotate(18 11 72)"/>
        <ellipse cx="69" cy="72" rx="8" ry="6" fill="#1a1a2e" transform="rotate(-18 69 72)"/>
        <circle cx="5" cy="80" r="6" fill="${skin}"/>
        <circle cx="75" cy="80" r="6" fill="${skin}"/>`
      case 2: return `
        <rect x="18" y="60" width="44" height="28" rx="12" fill="${oc}"/>
        <rect x="18" y="60" width="44" height="4" fill="${lighten(oc,20)}" rx="3"/>
        <text x="28" y="76" fontSize="10" fill="white" opacity="0.8">🏎️</text>
        <ellipse cx="11" cy="72" rx="8" ry="6" fill="${oc}" transform="rotate(18 11 72)"/>
        <ellipse cx="69" cy="72" rx="8" ry="6" fill="${oc}" transform="rotate(-18 69 72)"/>
        <circle cx="5" cy="80" r="6" fill="${skin}"/>
        <circle cx="75" cy="80" r="6" fill="${skin}"/>
        <rect x="3" y="74" width="5" height="10" rx="2" fill="${oc}"/>
        <rect x="72" y="74" width="5" height="10" rx="2" fill="${oc}"/>`
      case 3: return `
        <rect x="18" y="60" width="44" height="28" rx="12" fill="${isFemale?oc:'#374151'}"/>
        ${isFemale ? `<path d="M18,65 Q40,58 62,65 L62,88 Q40,95 18,88 Z" fill="${oc}" opacity="0.3"/>` : ''}
        <ellipse cx="11" cy="72" rx="8" ry="6" fill="${isFemale?oc:'#374151'}" transform="rotate(18 11 72)"/>
        <ellipse cx="69" cy="72" rx="8" ry="6" fill="${isFemale?oc:'#374151'}" transform="rotate(-18 69 72)"/>
        <circle cx="5" cy="80" r="6" fill="${skin}"/>
        <circle cx="75" cy="80" r="6" fill="${skin}"/>`
      case 4: return `
        <rect x="18" y="60" width="44" height="28" rx="12" fill="${oc}"/>
        <circle cx="30" cy="72" r="4" fill="white" opacity="0.5"/>
        <circle cx="50" cy="72" r="4" fill="white" opacity="0.5"/>
        <ellipse cx="11" cy="72" rx="8" ry="6" fill="${oc}" transform="rotate(18 11 72)"/>
        <ellipse cx="69" cy="72" rx="8" ry="6" fill="${oc}" transform="rotate(-18 69 72)"/>
        <circle cx="5" cy="80" r="6" fill="${skin}"/>
        <circle cx="75" cy="80" r="6" fill="${skin}"/>`
      default: return ''
    }
  })()

  // Accessory
  const accessorySVG = (() => {
    switch(cfg.accessory) {
      case 1: return `
        <rect x="21" y="28" width="16" height="10" rx="5" fill="#1a1a1a" opacity="0.92"/>
        <rect x="43" y="28" width="16" height="10" rx="5" fill="#1a1a1a" opacity="0.92"/>
        <line x1="37" y1="33" x2="43" y2="33" stroke="#1a1a1a" strokeWidth="2"/>
        <rect x="22" y="29" width="14" height="8" rx="4" fill="${oc}" opacity="0.7"/>`
      case 2: return `
        <circle cx="28" cy="32" r="8" fill="none" stroke="#92400e" strokeWidth="2"/>
        <circle cx="52" cy="32" r="8" fill="none" stroke="#92400e" strokeWidth="2"/>
        <line x1="36" y1="32" x2="44" y2="32" stroke="#92400e" strokeWidth="2"/>
        <line x1="12" y1="32" x2="20" y2="32" stroke="#92400e" strokeWidth="2"/>
        <line x1="60" y1="32" x2="68" y2="32" stroke="#92400e" strokeWidth="2"/>`
      case 3: return `
        <polygon points="40,0 25,18 55,18" fill="${oc}"/>
        <rect x="25" y="16" width="30" height="5" rx="2" fill="${lighten(oc,-20)}"/>
        <circle cx="40" cy="2" r="3" fill="#fbbf24"/>
        <line x1="40" y1="0" x2="40" y2="-8" stroke="#fbbf24" strokeWidth="1.5"/>
        <circle cx="40" cy="-10" r="3" fill="#fbbf24"/>`
      case 4: return `
        <ellipse cx="40" cy="10" rx="20" ry="8" fill="#fbbf24" opacity="0.9"/>
        <ellipse cx="40" cy="8" rx="18" ry="6" fill="#f59e0b"/>
        <polygon points="30,8 25,-2 35,2" fill="#fbbf24"/>
        <polygon points="50,8 55,-2 45,2" fill="#fbbf24"/>
        <polygon points="40,6 40,-4 44,2" fill="#fbbf24"/>
        <circle cx="33" cy="6" r="2" fill="#ef4444"/>
        <circle cx="40" cy="4" r="2" fill="#3b82f6"/>
        <circle cx="47" cy="6" r="2" fill="#22c55e"/>`
      case 5: return `
        <ellipse cx="40" cy="18" rx="26" ry="22" fill="${oc}"/>
        <ellipse cx="40" cy="16" rx="24" ry="20" fill="${lighten(oc,20)}"/>
        <ellipse cx="40" cy="28" rx="18" ry="8" fill="${lighten(oc,-10)}" opacity="0.8"/>
        <rect x="22" y="30" width="36" height="8" rx="4" fill="${lighten(oc,-20)}"/>
        <ellipse cx="40" cy="30" rx="14" ry="5" fill="black" opacity="0.5"/>
        <rect x="28" y="27" width="24" height="8" rx="2" fill="black" opacity="0.3"/>
        <rect x="30" y="28" width="20" height="5" rx="2" fill="#60a5fa" opacity="0.6"/>
        <ellipse cx="40" cy="10" rx="10" ry="6" fill="white" opacity="0.2"/>`
      default: return ''
    }
  })()

  const uid = `av_${cfg.skinTone}${cfg.hairColor}${cfg.sex}`

  return `
    <defs>
      <radialGradient id="sk_${uid}" cx="45%" cy="35%" r="65%">
        <stop offset="0%" stop-color="${lighten(skin,25)}"/>
        <stop offset="100%" stop-color="${skin}"/>
      </radialGradient>
      <radialGradient id="ey_${uid}" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#6ab0ff"/>
        <stop offset="100%" stop-color="#1a4aaa"/>
      </radialGradient>
    </defs>
    <ellipse cx="40" cy="115" rx="20" ry="4" fill="rgba(0,0,0,0.2)"/>
    ${/* Legs */''}
    <rect x="25" y="84" width="12" height="22" rx="6" fill="#1a1a2e"/>
    <rect x="44" y="84" width="12" height="22" rx="6" fill="#1a1a2e"/>
    <ellipse cx="31" cy="107" rx="9" ry="4" fill="#111"/>
    <ellipse cx="50" cy="107" rx="9" ry="4" fill="#111"/>
    ${outfitSVG}
    ${/* Neck */''}
    <rect x="34" y="50" width="12" height="13" rx="5" fill="url(#sk_${uid})"/>
    ${/* Head */''}
    <ellipse cx="40" cy="30" rx="27" ry="29" fill="url(#sk_${uid})"/>
    <ellipse cx="14" cy="32" rx="6" ry="8" fill="${skin}"/>
    <ellipse cx="66" cy="32" rx="6" ry="8" fill="${skin}"/>
    <ellipse cx="14" cy="32" rx="4" ry="6" fill="${lighten(skin,-12)}"/>
    <ellipse cx="66" cy="32" rx="4" ry="6" fill="${lighten(skin,-12)}"/>
    ${hairSVG}
    ${/* Eyes */''}
    <g transform="scale(1,${eyeOpen}) translate(0,${(1-eyeOpen)*28})">
      <circle cx="30" cy="28" r="7" fill="white"/>
      <circle cx="30" cy="28" r="5" fill="url(#ey_${uid})"/>
      <circle cx="30" cy="28" r="2.8" fill="#060612"/>
      <circle cx="31.3" cy="26.8" r="1.2" fill="white"/>
      <circle cx="52" cy="28" r="7" fill="white"/>
      <circle cx="52" cy="28" r="5" fill="url(#ey_${uid})"/>
      <circle cx="52" cy="28" r="2.8" fill="#060612"/>
      <circle cx="53.3" cy="26.8" r="1.2" fill="white"/>
    </g>
    ${bac>0.8 ? `<ellipse cx="30" cy="25" rx="7" ry="${3*(bac-0.8)}" fill="${skin}"/>
    <ellipse cx="52" cy="25" rx="7" ry="${3*(bac-0.8)}" fill="${skin}"/>` : ''}
    ${/* Brows */''}
    <path d="${bac<0.8?'M23,18 Q30,14 37,18':'M23,21 Q30,17 37,21'}" stroke="${hair}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="${bac<0.8?'M45,18 Q52,14 59,18':'M45,21 Q52,17 59,21'}" stroke="${hair}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    ${/* Nose */''}
    <ellipse cx="40" cy="40" rx="4" ry="3" fill="${lighten(skin,-14)}"/>
    ${/* Cheeks */''}
    ${cheekOp>0.05 ? `<ellipse cx="18" cy="40" rx="7" ry="5" fill="#ff6b9d" opacity="${cheekOp}"/>
    <ellipse cx="62" cy="40" rx="7" ry="5" fill="#ff6b9d" opacity="${cheekOp}"/>` : ''}
    ${/* Mouth */''}
    <path d="${mouthD}" stroke="#c0392b" stroke-width="2" fill="${bac>0.5?'#ff8888':'none'}" stroke-linecap="round"/>
    ${isFemale ? `<path d="M30,42 Q40,50 50,42" stroke="${lighten(oc,10)}" stroke-width="1.5" fill="none" opacity="0.4"/>` : ''}
    ${/* Accessories on top of hair for helmet, else below */''}
    ${cfg.accessory !== 5 ? accessorySVG : ''}
    ${sweat ? `<ellipse cx="64" cy="14" rx="2.5" ry="5" fill="#60a5fa" opacity="0.8"/>` : ''}
    ${bac>1.2 ? `<text x="2" y="12" font-size="11">⭐</text><text x="62" y="12" font-size="9">✨</text>` : ''}
    ${bac>1.8 ? `<text x="60" y="8" font-size="7" fill="#60a5fa">z</text>
    <text x="66" y="2" font-size="9" fill="#60a5fa" opacity="0.8">z</text>` : ''}
    ${cfg.accessory === 5 ? accessorySVG : ''}
  `
}

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
      if (bac < 0.2) {
        el.style.transform = `translateY(${Math.sin(ts/900)*2}px)`
      } else if (bac < 0.5) {
        el.style.transform = `rotate(${Math.sin(ts/700)*7}deg)`
      } else if (bac < 0.8) {
        const r = Math.sin(ts/450)*14 + Math.sin(ts/180)*4
        el.style.transform = `rotate(${r}deg) translateX(${Math.sin(ts/550)*5}px)`
      } else if (bac < 1.2) {
        const r = Math.sin(ts/300)*22 + Math.sin(ts/120)*8
        el.style.transform = `rotate(${r}deg) translate(${Math.sin(ts/280)*10}px,${Math.abs(Math.sin(ts/240))*7}px)`
      } else if (bac < 1.8) {
        const r = Math.sin(ts/200)*30 + Math.sin(ts/80)*12
        const s = 1 + Math.sin(ts/280)*0.1
        el.style.transform = `rotate(${r}deg) translate(${Math.sin(ts/170)*14}px,${Math.abs(Math.sin(ts/150))*10}px) scale(${s})`
      } else {
        el.style.transform = `rotate(${(ts/7)%360}deg) scale(${0.8+Math.sin(ts/320)*0.2})`
        el.style.opacity = String(0.5 + Math.sin(ts/550)*0.5)
      }
      frameRef.current = requestAnimationFrame(frame)
    }
    frameRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(frameRef.current)
  }, [bac, animate])

  const svgContent = renderAvatarSVG(config, bac, size)

  return (
    <div style={{ position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
      {isMe && (
        <div style={{ position:"absolute", inset:-4, borderRadius:"50%", background:`radial-gradient(circle, ${color||"#a855f7"}50, transparent 70%)`, pointerEvents:"none" }}/>
      )}
      <div ref={containerRef} style={{ transformOrigin:"center 85%", willChange:"transform" }}>
        <svg width={size} height={size*1.2} viewBox="0 0 80 120" overflow="visible"
          dangerouslySetInnerHTML={{ __html: svgContent }}/>
      </div>
    </div>
  )
}
