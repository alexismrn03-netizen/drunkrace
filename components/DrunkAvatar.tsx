"use client"
import { useEffect, useRef } from "react"

export interface AvatarConfig {
  sex: "M" | "F"
  skinTone: number   // 0-5
  hairColor: number  // 0-7
  hairStyle: number  // 0-6
  outfit: number     // 0-6
  accessory: number  // 0-7
  outfitColor: number // 0-5
}

export const DEFAULT_AVATAR: AvatarConfig = {
  sex: "M", skinTone: 0, hairColor: 0, hairStyle: 0,
  outfit: 0, accessory: 0, outfitColor: 0
}

export const SKIN_TONES   = ["#FDBCB4","#F5CBA7","#F1C27D","#C68642","#8D5524","#4A2912"]
export const HAIR_COLORS  = ["#1a0a00","#3D2314","#6B3A2A","#B5651D","#D4A017","#E8C547","#EC4899","#a855f7"]
export const AVATAR_COUNT = 7
export const OUTFIT_COLORS = ["#6366f1","#ec4899","#22c55e","#ef4444","#f59e0b","#0ea5e9"]

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#',''), 16)
  const r = Math.min(255,Math.max(0,(n>>16)+amt))
  const g = Math.min(255,Math.max(0,((n>>8)&0xff)+amt))
  const b = Math.min(255,Math.max(0,(n&0xff)+amt))
  return '#'+((r<<16)|(g<<8)|b).toString(16).padStart(6,'0')
}

// ── SVG viewBox: 0 0 80 130 ───────────────────────────────────────────────
// Head center: (40, 32), radius ~22
// Neck: y 54-62
// Body: y 62-95, width ~36 centered at 40
// Arms: sides of body
// Legs: y 95-118

export function renderAvatarSVG(cfg: AvatarConfig, bac: number = 0, size: number = 100): string {
  const skin = SKIN_TONES[cfg.skinTone] || SKIN_TONES[0]
  const hair = HAIR_COLORS[cfg.hairColor] || HAIR_COLORS[0]
  const oc   = OUTFIT_COLORS[cfg.outfitColor] || OUTFIT_COLORS[0]
  const isFemale = cfg.sex === "F"
  const sl = lighten(skin, 28)
  const sd = lighten(skin, -18)

  const eyeOpen = bac < 1.5 ? 1 : Math.max(0.1, 1-(bac-1.5)*0.9)
  const cheekOp = Math.min(0.7, bac * 1.4)
  const mouthD  = bac < 0.3
    ? "M33,46 Q40,50 47,46"
    : bac < 1.5
    ? "M33,44 Q40,52 47,44"
    : "M33,48 Q40,43 47,48"
  const sweat = bac > 0.8

  // ── HAIR ─────────────────────────────────────────────────────────────────
  const hairSVG = (() => {
    const hd = lighten(hair, -25)
    switch(cfg.hairStyle) {
      case 0: // Court
        return `
        <ellipse cx="40" cy="13" rx="22" ry="10" fill="${hair}"/>
        <rect x="18" y="13" width="44" height="11" fill="${hair}"/>
        ${isFemale ? `<rect x="16" y="14" width="7" height="28" rx="3.5" fill="${hair}"/>
        <rect x="57" y="14" width="7" height="28" rx="3.5" fill="${hair}"/>` : ''}`
      case 1: // Long / fluide
        return `
        <ellipse cx="40" cy="11" rx="23" ry="12" fill="${hair}"/>
        <rect x="17" y="11" width="46" height="12" fill="${hair}"/>
        <rect x="14" y="14" width="9" height="45" rx="4.5" fill="${hair}"/>
        <rect x="57" y="14" width="9" height="45" rx="4.5" fill="${hair}"/>
        <ellipse cx="18" cy="58" rx="7" ry="5" fill="${hair}"/>
        <ellipse cx="62" cy="58" rx="7" ry="5" fill="${hair}"/>`
      case 2: // Afro
        return `
        <ellipse cx="40" cy="12" rx="27" ry="20" fill="${hair}"/>
        <ellipse cx="17" cy="24" rx="11" ry="16" fill="${hair}"/>
        <ellipse cx="63" cy="24" rx="11" ry="16" fill="${hair}"/>
        <ellipse cx="40" cy="30" rx="23" ry="12" fill="${hair}"/>
        <!-- texture puffs -->
        <ellipse cx="28" cy="8" rx="7" ry="6" fill="${hd}" opacity="0.4"/>
        <ellipse cx="52" cy="8" rx="7" ry="6" fill="${hd}" opacity="0.4"/>
        <ellipse cx="40" cy="4" rx="8" ry="6" fill="${hd}" opacity="0.3"/>`
      case 3: // Mohawk
        return `
        <rect x="35" y="-4" width="10" height="26" rx="5" fill="${hair}"/>
        <!-- sides rasées -->
        <rect x="18" y="13" width="17" height="9" fill="${hair}" opacity="0.25"/>
        <rect x="45" y="13" width="17" height="9" fill="${hair}" opacity="0.25"/>`
      case 4: // Queue de cheval
        return `
        <ellipse cx="40" cy="13" rx="22" ry="10" fill="${hair}"/>
        <rect x="18" y="13" width="44" height="11" fill="${hair}"/>
        <!-- Queue -->
        <rect x="52" y="18" width="8" height="32" rx="4" fill="${hair}"/>
        <ellipse cx="56" cy="50" rx="6" ry="8" fill="${hair}"/>
        ${isFemale ? `<rect x="14" y="14" width="7" height="18" rx="3.5" fill="${hair}"/>` : ''}`
      case 5: // Chignon
        return `
        <ellipse cx="40" cy="13" rx="22" ry="10" fill="${hair}"/>
        <rect x="18" y="13" width="44" height="11" fill="${hair}"/>
        <!-- Bun on top -->
        <circle cx="40" cy="6" r="10" fill="${hair}"/>
        <circle cx="40" cy="5" r="7" fill="${hd}"/>
        ${isFemale ? `<rect x="14" y="14" width="7" height="22" rx="3.5" fill="${hair}"/>
        <rect x="59" y="14" width="7" height="22" rx="3.5" fill="${hair}"/>` : ''}`
      case 6: // Chauve — crâne brillant
        return `
        <!-- Reflets brillants sur le crâne chauve -->
        <ellipse cx="32" cy="10" rx="6" ry="4" fill="white" opacity="0.22"/>
        <ellipse cx="28" cy="14" rx="3" ry="2" fill="white" opacity="0.14"/>
        <!-- Légère ombre de contour -->
        <ellipse cx="40" cy="12" rx="22" ry="11" fill="${skin}" opacity="0.0"/>`
      default: return ''
    }
  })()

  // ── OUTFIT ────────────────────────────────────────────────────────────────
  // Body block: torso x22-58, y62-94; arms as ellipses; hands as circles
  const outfitSVG = (() => {
    const armL = `<ellipse cx="14" cy="76" rx="7" ry="14" fill`
    const armR = `<ellipse cx="66" cy="76" rx="7" ry="14" fill`
    const handsL = `<circle cx="14" cy="91" r="6" fill="${skin}"/>`
    const handsR = `<circle cx="66" cy="91" r="6" fill="${skin}"/>`
    switch(cfg.outfit) {
      case 0: // Casual hoodie
        return `
                <!-- Épaules -->
        <circle cx="22" cy="66" r="8" fill="${oc}"/>
        <circle cx="58" cy="66" r="8" fill="${oc}"/>
        ${armL}="${oc}" transform="rotate(-8,14,76)"/>
        ${armR}="${oc}" transform="rotate(8,66,76)"/>
        <rect x="22" y="62" width="36" height="32" rx="10" fill="${oc}"/>
        <!-- Capuche -->
        <path d="M26,62 Q40,54 54,62" fill="${lighten(oc,-15)}"/>
        <!-- Poche centrale -->
        <rect x="31" y="78" width="18" height="10" rx="5" fill="${lighten(oc,-20)}"/>
        ${handsL}${handsR}`
      case 1: // Smoking
        return `
                <!-- Épaules -->
        <circle cx="22" cy="66" r="8" fill="#1a1a1a"/>
        <circle cx="58" cy="66" r="8" fill="#1a1a1a"/>
        ${armL}="#1a1a1a" transform="rotate(-8,14,76)"/>
        ${armR}="#1a1a1a" transform="rotate(8,66,76)"/>
        <rect x="22" y="62" width="36" height="32" rx="10" fill="#1a1a1a"/>
        <!-- Plastron blanc -->
        <rect x="35" y="62" width="10" height="28" rx="2" fill="white"/>
        <!-- Revers -->
        <polygon points="35,62 40,74 28,66" fill="#2a2a2a"/>
        <polygon points="45,62 40,74 52,66" fill="#2a2a2a"/>
        <!-- Boutons -->
        <circle cx="40" cy="76" r="1.5" fill="#888"/>
        <circle cx="40" cy="82" r="1.5" fill="#888"/>
        <!-- Nœud pap -->
        <polygon points="37,65 40,68 43,65 40,62" fill="${oc}"/>
        <!-- Manchettes -->
        <rect x="9" y="88" width="10" height="5" rx="2" fill="white"/>
        <rect x="61" y="88" width="10" height="5" rx="2" fill="white"/>
        ${handsL}${handsR}`
      case 2: // Maillot de bain
        return `
        <!-- Épaules rondes pour raccorder les bras -->
        <circle cx="22" cy="66" r="8" fill="${skin}"/>
        <circle cx="58" cy="66" r="8" fill="${skin}"/>
        ${armL}="${skin}" transform="rotate(-8,14,76)"/>
        ${armR}="${skin}" transform="rotate(8,66,76)"/>
        <!-- Torse nu -->
        <rect x="22" y="62" width="36" height="18" rx="8" fill="${skin}"/>
        <!-- Tétons si homme -->
        ${!isFemale ? `<circle cx="33" cy="72" r="2" fill="${sd}" opacity="0.5"/>
        <circle cx="47" cy="72" r="2" fill="${sd}" opacity="0.5"/>` : ''}
        <!-- Bikini haut si femme -->
        ${isFemale ? `<path d="M27,68 Q33,62 40,66 Q47,62 53,68 Q47,76 40,72 Q33,76 27,68Z" fill="${oc}"/>` : ''}
        <!-- Maillot/Short -->
        <rect x="24" y="80" width="32" height="14" rx="8" fill="${oc}"/>
        <!-- Motifs -->
        <line x1="30" y1="80" x2="30" y2="94" stroke="${lighten(oc,20)}" stroke-width="2" opacity="0.5"/>
        <line x1="40" y1="80" x2="40" y2="94" stroke="${lighten(oc,20)}" stroke-width="2" opacity="0.5"/>
        <line x1="50" y1="80" x2="50" y2="94" stroke="${lighten(oc,20)}" stroke-width="2" opacity="0.5"/>
        ${handsL}${handsR}`
      case 3: // Captain Morgan
        return `
                <!-- Épaules -->
        <circle cx="22" cy="66" r="8" fill="#8B0000"/>
        <circle cx="58" cy="66" r="8" fill="#8B0000"/>
        ${armL}="#8B0000" transform="rotate(-8,14,76)"/>
        ${armR}="#8B0000" transform="rotate(8,66,76)"/>
        <rect x="22" y="62" width="36" height="32" rx="10" fill="#8B0000"/>
        <!-- Veste avec bordure or -->
        <rect x="22" y="62" width="36" height="4" rx="2" fill="#D4AF37"/>
        <!-- Croix sur la poitrine -->
        <rect x="36" y="65" width="8" height="24" rx="2" fill="#D4AF37" opacity="0.8"/>
        <rect x="26" y="72" width="28" height="7" rx="2" fill="#D4AF37" opacity="0.8"/>
        <!-- Ceinture -->
        <rect x="22" y="85" width="36" height="6" rx="3" fill="#4a1a00"/>
        <rect x="36" y="85" width="8" height="6" rx="2" fill="#D4AF37"/>
        <!-- Manchettes -->
        <rect x="8" y="86" width="12" height="6" rx="3" fill="#D4AF37"/>
        <rect x="60" y="86" width="12" height="6" rx="3" fill="#D4AF37"/>
        ${handsL}${handsR}`
      case 4: // Pyjama
        return `
                <!-- Épaules -->
        <circle cx="22" cy="66" r="8" fill="${oc}"/>
        <circle cx="58" cy="66" r="8" fill="${oc}"/>
        ${armL}="${oc}" transform="rotate(-8,14,76)"/>
        ${armR}="${oc}" transform="rotate(8,66,76)"/>
        <rect x="22" y="62" width="36" height="32" rx="10" fill="${oc}"/>
        <!-- Rayures pyjama -->
        <rect x="27" y="62" width="5" height="32" rx="2" fill="${lighten(oc,-30)}" opacity="0.4"/>
        <rect x="38" y="62" width="5" height="32" rx="2" fill="${lighten(oc,-30)}" opacity="0.4"/>
        <rect x="49" y="62" width="5" height="32" rx="2" fill="${lighten(oc,-30)}" opacity="0.4"/>
        <!-- Col -->
        <path d="M34,62 Q40,70 46,62" fill="none" stroke="${lighten(oc,-40)}" stroke-width="2"/>
        <!-- Étoiles -->
        <text x="27" y="77" font-size="8">⭐</text>
        <text x="43" y="85" font-size="7">🌙</text>
        ${handsL}${handsR}`
      case 5: // Sportif
        return `
                <!-- Épaules -->
        <circle cx="22" cy="66" r="8" fill="${oc}"/>
        <circle cx="58" cy="66" r="8" fill="${oc}"/>
        ${armL}="${oc}" transform="rotate(-8,14,76)"/>
        ${armR}="${oc}" transform="rotate(8,66,76)"/>
        <rect x="22" y="62" width="36" height="32" rx="10" fill="${oc}"/>
        <!-- Bandes latérales -->
        <rect x="22" y="62" width="8" height="32" rx="5" fill="white" opacity="0.25"/>
        <rect x="50" y="62" width="8" height="32" rx="5" fill="white" opacity="0.25"/>
        <!-- Col en V -->
        <polygon points="34,62 40,72 46,62" fill="white" opacity="0.3"/>
        <!-- Logo -->
        <circle cx="40" cy="76" r="6" fill="white" opacity="0.2"/>
        <text x="36" y="80" font-size="8" fill="white">⚡</text>
        ${handsL}${handsR}`
      case 6: // F1
        return `
                <!-- Épaules -->
        <circle cx="22" cy="66" r="8" fill="${oc}"/>
        <circle cx="58" cy="66" r="8" fill="${oc}"/>
        ${armL}="${oc}" transform="rotate(-8,14,76)"/>
        ${armR}="${oc}" transform="rotate(8,66,76)"/>
        <rect x="22" y="62" width="36" height="32" rx="10" fill="${oc}"/>
        <!-- Combinaison F1 -->
        <rect x="22" y="62" width="36" height="5" rx="3" fill="${lighten(oc,20)}"/>
        <rect x="22" y="89" width="36" height="5" rx="3" fill="${lighten(oc,20)}"/>
        <!-- Sponsors -->
        <rect x="26" y="70" width="12" height="6" rx="2" fill="white" opacity="0.8"/>
        <rect x="42" y="70" width="12" height="6" rx="2" fill="#fbbf24" opacity="0.9"/>
        <!-- Numéro -->
        <text x="34" y="87" font-size="9" font-weight="bold" fill="white">F1</text>
        <!-- Étoiles sur manches -->
        <circle cx="10" cy="76" r="4" fill="white" opacity="0.3"/>
        <circle cx="70" cy="76" r="4" fill="white" opacity="0.3"/>
        ${handsL}${handsR}`
      default: return ''
    }
  })()

  // ── ACCESSORY ─────────────────────────────────────────────────────────────
  const accessorySVG = (() => {
    switch(cfg.accessory) {
      case 1: // Lunettes de soleil
        return `
        <rect x="23" y="32" width="14" height="9" rx="4.5" fill="#111" opacity="0.95"/>
        <rect x="43" y="32" width="14" height="9" rx="4.5" fill="#111" opacity="0.95"/>
        <line x1="37" y1="36" x2="43" y2="36" stroke="#555" stroke-width="1.5"/>
        <line x1="17" y1="36" x2="23" y2="36" stroke="#555" stroke-width="1.5"/>
        <line x1="57" y1="36" x2="63" y2="36" stroke="#555" stroke-width="1.5"/>
        <rect x="24" y="33" width="12" height="7" rx="3.5" fill="${oc}" opacity="0.6"/>`
      case 2: // Lunettes rondes
        return `
        <circle cx="30" cy="36" r="7.5" fill="none" stroke="#92400e" stroke-width="2"/>
        <circle cx="50" cy="36" r="7.5" fill="none" stroke="#92400e" stroke-width="2"/>
        <line x1="37.5" y1="36" x2="42.5" y2="36" stroke="#92400e" stroke-width="1.5"/>
        <line x1="14" y1="36" x2="22.5" y2="36" stroke="#92400e" stroke-width="1.5"/>
        <line x1="57.5" y1="36" x2="66" y2="36" stroke="#92400e" stroke-width="1.5"/>
        <circle cx="30" cy="36" r="6" fill="#bfdbfe" opacity="0.3"/>
        <circle cx="50" cy="36" r="6" fill="#bfdbfe" opacity="0.3"/>`
      case 3: // Chapeau de fête — couvre le dessus de la tête, cache les cheveux du haut
        return `
        <!-- Bande élastique qui cache les cheveux du haut -->
        <rect x="17" y="14" width="46" height="8" rx="4" fill="${lighten(oc,-30)}"/>
        <!-- Cône -->
        <polygon points="40,-8 20,16 60,16" fill="${oc}"/>
        <polygon points="40,-8 30,4 50,4" fill="${lighten(oc,30)}" opacity="0.45"/>
        <!-- Pompon -->
        <circle cx="40" cy="-10" r="4" fill="#fbbf24"/>
        <circle cx="40" cy="-10" r="2.5" fill="#fde68a"/>
        <!-- Confettis sur le cône -->
        <circle cx="32" cy="2" r="1.8" fill="#ef4444"/>
        <circle cx="50" cy="5" r="1.8" fill="#22c55e"/>
        <circle cx="40" cy="0" r="1.5" fill="#60a5fa"/>
        <circle cx="28" cy="10" r="1.5" fill="#fbbf24"/>`
      case 4: // Couronne
        return `
        <polygon points="20,16 20,4 28,12 40,2 52,12 60,4 60,16" fill="#fbbf24"/>
        <rect x="20" y="14" width="40" height="5" rx="2" fill="#D4AF37"/>
        <circle cx="30" cy="10" r="3" fill="#ef4444"/>
        <circle cx="40" cy="7" r="3" fill="#60a5fa"/>
        <circle cx="50" cy="10" r="3" fill="#22c55e"/>
        <ellipse cx="40" cy="16" rx="20" ry="4" fill="#D4AF37" opacity="0.5"/>`
      case 5: // Chapeau pirate
        return `
        <!-- Bord du chapeau -->
        <ellipse cx="40" cy="18" rx="28" ry="7" fill="#111"/>
        <!-- Calotte -->
        <rect x="22" y="-4" width="36" height="23" rx="6" fill="#111"/>
        <!-- Tête de mort -->
        <circle cx="40" cy="7" r="7" fill="white"/>
        <circle cx="37" cy="5" r="2" fill="#111"/>
        <circle cx="43" cy="5" r="2" fill="#111"/>
        <path d="M36,10 Q40,14 44,10" stroke="#111" stroke-width="1.5" fill="none"/>
        <rect x="37" y="10" width="2" height="3" fill="#111"/>
        <rect x="41" y="10" width="2" height="3" fill="#111"/>
        <!-- Bandeau rouge -->
        <rect x="22" y="14" width="36" height="5" rx="2" fill="#dc2626" opacity="0.9"/>
        <circle cx="40" cy="16" r="3" fill="#fbbf24"/>`
      case 6: // Casque F1 — couvre tout le visage + oreilles
        return `
        <!-- Coque principale du casque -->
        <ellipse cx="40" cy="28" rx="28" ry="30" fill="${oc}"/>
        <ellipse cx="40" cy="26" rx="26" ry="28" fill="${lighten(oc,15)}"/>
        <!-- Cache-oreilles -->
        <ellipse cx="13" cy="35" rx="7" ry="10" fill="${oc}"/>
        <ellipse cx="67" cy="35" rx="7" ry="10" fill="${oc}"/>
        <!-- Visière noire — couvre tout le visage -->
        <path d="M15,24 Q40,18 65,24 L63,48 Q40,56 17,48 Z" fill="#0a0a0a" opacity="0.95"/>
        <!-- Reflet visière -->
        <path d="M20,26 Q35,22 55,26 L53,34 Q35,30 22,34 Z" fill="white" opacity="0.12"/>
        <path d="M22,24 Q40,20 58,24" fill="none" stroke="#333" stroke-width="1.5" opacity="0.6"/>
        <!-- Ligne de visière (séparation casque/visière) -->
        <path d="M15,24 Q40,18 65,24" fill="none" stroke="${lighten(oc,-30)}" stroke-width="2.5"/>
        <!-- Bande centrale déco -->
        <rect x="37" y="0" width="6" height="30" rx="3" fill="${lighten(oc,-25)}" opacity="0.8"/>
        <!-- Écrous latéraux -->
        <circle cx="18" cy="22" r="3" fill="${lighten(oc,-35)}"/>
        <circle cx="62" cy="22" r="3" fill="${lighten(oc,-35)}"/>
        <!-- Reflet haut du casque -->
        <ellipse cx="30" cy="12" rx="10" ry="6" fill="white" opacity="0.2"/>
        <!-- HANS device -->
        <rect x="20" y="50" width="8" height="6" rx="2" fill="${lighten(oc,-20)}"/>
        <rect x="52" y="50" width="8" height="6" rx="2" fill="${lighten(oc,-20)}"/>`
      case 7: // Palmes (sur les pieds)
        return `
        <!-- Palmes vertes sur les pieds -->
        <ellipse cx="28" cy="122" rx="14" ry="5" fill="#22c55e" transform="rotate(-15,28,122)"/>
        <ellipse cx="52" cy="122" rx="14" ry="5" fill="#22c55e" transform="rotate(15,52,122)"/>
        <ellipse cx="28" cy="122" rx="10" ry="3.5" fill="#16a34a" transform="rotate(-15,28,122)"/>
        <ellipse cx="52" cy="122" rx="10" ry="3.5" fill="#16a34a" transform="rotate(15,52,122)"/>`
      default: return ''
    }
  })()

  const uid = `av_${cfg.skinTone}${cfg.hairColor}${cfg.sex}${cfg.outfit}`

  return `
    <defs>
      <radialGradient id="sk_${uid}" cx="42%" cy="35%" r="65%">
        <stop offset="0%" stop-color="${sl}"/>
        <stop offset="100%" stop-color="${skin}"/>
      </radialGradient>
      <radialGradient id="ey_${uid}" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#7ec8ff"/>
        <stop offset="100%" stop-color="#1a5aaa"/>
      </radialGradient>
    </defs>

    <!-- Shadow -->
    <ellipse cx="40" cy="126" rx="22" ry="5" fill="rgba(0,0,0,0.18)"/>

    <!-- Legs + Shoes — depend on outfit -->
    ${cfg.outfit === 2 ? `
      <!-- Maillot: jambes nues + pieds nus -->
      <rect x="24" y="94" width="13" height="26" rx="6" fill="${skin}"/>
      <rect x="43" y="94" width="13" height="26" rx="6" fill="${skin}"/>
      <ellipse cx="30" cy="120" rx="10" ry="4" fill="${sd}"/>
      <ellipse cx="50" cy="120" rx="10" ry="4" fill="${sd}"/>
    ` : cfg.outfit === 4 ? `
      <!-- Pyjama: jambes rayées -->
      <rect x="24" y="94" width="13" height="26" rx="6" fill="${oc}"/>
      <rect x="43" y="94" width="13" height="26" rx="6" fill="${oc}"/>
      <rect x="26" y="94" width="4" height="26" rx="2" fill="${lighten(oc,-30)}" opacity="0.4"/>
      <rect x="45" y="94" width="4" height="26" rx="2" fill="${lighten(oc,-30)}" opacity="0.4"/>
      <!-- Chaussons -->
      <ellipse cx="30" cy="120" rx="11" ry="5" fill="${lighten(oc,-10)}"/>
      <ellipse cx="50" cy="120" rx="11" ry="5" fill="${lighten(oc,-10)}"/>
    ` : cfg.outfit === 3 ? `
      <!-- Captain Morgan: bottes en cuir -->
      <rect x="24" y="94" width="13" height="22" rx="6" fill="#3a1800"/>
      <rect x="43" y="94" width="13" height="22" rx="6" fill="#3a1800"/>
      <ellipse cx="30" cy="118" rx="12" ry="6" fill="#2a1000"/>
      <ellipse cx="50" cy="118" rx="12" ry="6" fill="#2a1000"/>
      <ellipse cx="28" cy="116" rx="5" ry="2" fill="#5a3010" opacity="0.5"/>
      <ellipse cx="48" cy="116" rx="5" ry="2" fill="#5a3010" opacity="0.5"/>
    ` : cfg.outfit === 6 ? `
      <!-- F1: combinaison jambes -->
      <rect x="24" y="94" width="13" height="24" rx="6" fill="${oc}"/>
      <rect x="43" y="94" width="13" height="24" rx="6" fill="${oc}"/>
      <rect x="24" y="110" width="13" height="8" rx="3" fill="${lighten(oc,20)}"/>
      <rect x="43" y="110" width="13" height="8" rx="3" fill="${lighten(oc,20)}"/>
      <ellipse cx="30" cy="120" rx="11" ry="5" fill="#111"/>
      <ellipse cx="50" cy="120" rx="11" ry="5" fill="#111"/>
    ` : `
      <!-- Default: jean sombre + chaussures -->
      <rect x="24" y="94" width="13" height="26" rx="6" fill="#1a1a2e"/>
      <rect x="43" y="94" width="13" height="26" rx="6" fill="#1a1a2e"/>
      <ellipse cx="30" cy="120" rx="11" ry="5" fill="#111"/>
      <ellipse cx="50" cy="120" rx="11" ry="5" fill="#111"/>
      <ellipse cx="27" cy="118" rx="5" ry="2" fill="white" opacity="0.12"/>
      <ellipse cx="47" cy="118" rx="5" ry="2" fill="white" opacity="0.12"/>
    `}

    ${accessorySVG.includes('122') ? accessorySVG : ''}

    <!-- Outfit (includes arms) -->
    ${outfitSVG}

    <!-- Neck -->
    <rect x="35" y="54" width="10" height="10" rx="4" fill="url(#sk_${uid})"/>

    <!-- Head -->
    <ellipse cx="40" cy="33" rx="23" ry="24" fill="url(#sk_${uid})"/>
    <!-- Ears -->
    <ellipse cx="17" cy="36" rx="5" ry="7" fill="${skin}"/>
    <ellipse cx="63" cy="36" rx="5" ry="7" fill="${skin}"/>
    <ellipse cx="17" cy="36" rx="3" ry="5" fill="${sd}"/>
    <ellipse cx="63" cy="36" rx="3" ry="5" fill="${sd}"/>

    <!-- Hair (behind face for most styles) -->
    ${cfg.hairStyle !== 6 ? hairSVG : ''}

    <!-- Eyes -->
    <g transform="translate(0,${(1-eyeOpen)*28}) scale(1,${eyeOpen})">
      <circle cx="31" cy="32" r="7" fill="white"/>
      <circle cx="31" cy="32" r="5" fill="url(#ey_${uid})"/>
      <circle cx="31" cy="32" r="2.8" fill="#050510"/>
      <circle cx="32.3" cy="30.8" r="1.2" fill="white"/>
      <circle cx="49" cy="32" r="7" fill="white"/>
      <circle cx="49" cy="32" r="5" fill="url(#ey_${uid})"/>
      <circle cx="49" cy="32" r="2.8" fill="#050510"/>
      <circle cx="50.3" cy="30.8" r="1.2" fill="white"/>
    </g>
    ${bac > 0.8 ? `
    <ellipse cx="31" cy="27" rx="7" ry="${Math.min(7,3*(bac-0.8))}" fill="${skin}"/>
    <ellipse cx="49" cy="27" rx="7" ry="${Math.min(7,3*(bac-0.8))}" fill="${skin}"/>` : ''}

    <!-- Eyebrows -->
    <path d="${bac<0.8?'M24,22 Q31,18 38,22':'M24,25 Q31,21 38,25'}"
      stroke="${hair}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="${bac<0.8?'M42,22 Q49,18 56,22':'M42,25 Q49,21 56,25'}"
      stroke="${hair}" stroke-width="2.2" fill="none" stroke-linecap="round"/>

    <!-- Nose -->
    <ellipse cx="40" cy="42" rx="3.5" ry="3" fill="${sd}"/>

    <!-- Cheeks -->
    ${cheekOp > 0.05 ? `
    <ellipse cx="19" cy="43" rx="7" ry="5" fill="#ff6b9d" opacity="${cheekOp}"/>
    <ellipse cx="61" cy="43" rx="7" ry="5" fill="#ff6b9d" opacity="${cheekOp}"/>` : ''}

    <!-- Mouth -->
    <path d="${mouthD}" stroke="#c0392b" stroke-width="2.2"
      fill="${bac>0.5?'#ff9999':'none'}" stroke-linecap="round"/>

    <!-- Bald shine -->
    ${cfg.hairStyle === 6 ? hairSVG : ''}

    <!-- Accessories on face/head -->
    ${!accessorySVG.includes('122') ? accessorySVG : ''}

    <!-- Sweat drop -->
    ${sweat ? `<ellipse cx="64" cy="18" rx="2.5" ry="4.5" fill="#60a5fa" opacity="0.85"/>` : ''}

    <!-- Drunk stars -->
    ${bac>1.2 ? `<text x="4" y="14" font-size="11">⭐</text><text x="60" y="12" font-size="9">✨</text>` : ''}
    ${bac>1.8 ? `<text x="58" y="8" font-size="8" fill="#60a5fa">z</text>
    <text x="65" y="2" font-size="10" fill="#60a5fa" opacity="0.75">z</text>` : ''}
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
        <svg width={size} height={size*1.3} viewBox="0 0 80 130" overflow="visible"
          dangerouslySetInnerHTML={{ __html: svgContent }}/>
      </div>
    </div>
  )
}
