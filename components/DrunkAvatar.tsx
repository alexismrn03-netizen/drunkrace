"use client"
import { useEffect, useRef } from "react"

export interface AvatarConfig {
  sex: "M" | "F"
  skinTone: number    // 0-5
  hairColor: number   // 0-7
  hairStyle: number   // 0-6
  outfit: number      // 0-6
  accessory: number   // 0-7
  outfitColor: number // 0-5
}

export const DEFAULT_AVATAR: AvatarConfig = {
  sex: "M", skinTone: 1, hairColor: 0, hairStyle: 0,
  outfit: 0, accessory: 0, outfitColor: 0
}

export const SKIN_TONES    = ["#fde8d0","#f5cba7","#e8a87c","#c68642","#8d5524","#4a2912"]
export const SKIN_SHADOWS  = ["#e8c4a0","#dba678","#c47a4a","#a06030","#6a3d18","#2e1508"]
export const HAIR_COLORS   = ["#1a0a00","#3d2314","#6b3a2a","#b5651d","#d4a017","#e8c547","#ec4899","#a855f7"]
export const OUTFIT_COLORS = ["#6366f1","#ec4899","#22c55e","#ef4444","#f59e0b","#0ea5e9"]
export const AVATAR_COUNT  = 7

function hex2rgb(hex: string) {
  const n = parseInt(hex.replace('#',''),16)
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 }
}
function lighten(hex: string, amt: number): string {
  const {r,g,b} = hex2rgb(hex)
  const c = (v: number) => Math.min(255,Math.max(0,v+amt)).toString(16).padStart(2,'0')
  return `#${c(r)}${c(g)}${c(b)}`
}

export function renderAvatarSVG(cfg: AvatarConfig, bac: number = 0): string {
  const skin  = SKIN_TONES[cfg.skinTone]  || SKIN_TONES[1]
  const skinS = SKIN_SHADOWS[cfg.skinTone]|| SKIN_SHADOWS[1]
  const skinH = lighten(skin, 30)
  const hair  = HAIR_COLORS[cfg.hairColor]|| HAIR_COLORS[0]
  const hairD = lighten(hair, -30)
  const hairH = lighten(hair, 25)
  const oc    = OUTFIT_COLORS[cfg.outfitColor] || OUTFIT_COLORS[0]
  const ocD   = lighten(oc, -30)
  const ocH   = lighten(oc, 25)
  const isFemale = cfg.sex === "F"

  // BAC effects
  const eyeOpen = bac < 1.5 ? 1 : Math.max(0.15, 1-(bac-1.5)*0.85)
  const cheekOp = Math.min(0.6, bac * 1.2)
  const smile   = bac < 0.3 ? "M33,46 Q40,50 47,46" : bac < 1.5 ? "M31,44 Q40,53 49,44" : "M33,49 Q40,44 47,49"

  const uid = `av${cfg.skinTone}${cfg.hairColor}${cfg.sex}${cfg.outfit}${cfg.outfitColor}`

  // ── HAIR ─────────────────────────────────────────────────────────────────
  const hairBack = (() => { // drawn BEHIND head
    switch(cfg.hairStyle) {
      case 1: return `<ellipse cx="40" cy="14" rx="24" ry="16" fill="${hair}"/>
        <rect x="14" y="14" width="10" height="50" rx="5" fill="${hair}"/>
        <rect x="56" y="14" width="10" height="50" rx="5" fill="${hair}"/>`
      case 2: return `<ellipse cx="40" cy="10" rx="28" ry="22" fill="${hair}"/>
        <ellipse cx="14" cy="22" rx="12" ry="18" fill="${hair}"/>
        <ellipse cx="66" cy="22" rx="12" ry="18" fill="${hair}"/>`
      default: return `<ellipse cx="40" cy="14" rx="24" ry="14" fill="${hair}"/>`
    }
  })()

  const hairFront = (() => { // drawn OVER head
    switch(cfg.hairStyle) {
      case 0: return ` <!-- Court -->
        <path d="M17,24 Q18,6 40,4 Q62,6 63,24 Q58,14 52,13 Q46,18 40,15 Q34,18 28,13 Q22,14 17,24Z" fill="${hair}"/>
        <path d="M32,8 Q40,13 48,7 Q42,14 32,8Z" fill="${hairH}" opacity="0.4"/>
        ${isFemale ? `<path d="M17,24 Q14,28 15,34 Q18,28 17,24Z" fill="${hair}"/>
        <path d="M63,24 Q66,28 65,34 Q62,28 63,24Z" fill="${hair}"/>` : ''}`
      case 1: return ` <!-- Long -->
        <path d="M17,24 Q18,6 40,4 Q62,6 63,24 Q58,14 52,13 Q46,18 40,15 Q34,18 28,13 Q22,14 17,24Z" fill="${hair}"/>
        <path d="M32,8 Q40,13 48,7 Q42,14 32,8Z" fill="${hairH}" opacity="0.35"/>`
      case 2: return ` <!-- Afro -->
        <path d="M17,24 Q16,4 40,2 Q64,4 63,24 Q56,8 40,8 Q24,8 17,24Z" fill="${hair}"/>
        <ellipse cx="26" cy="10" rx="9" ry="8" fill="${hair}"/>
        <ellipse cx="54" cy="10" rx="9" ry="8" fill="${hair}"/>
        <ellipse cx="40" cy="6" rx="10" ry="7" fill="${hair}"/>
        <ellipse cx="33" cy="5" rx="6" ry="5" fill="${hairD}" opacity="0.4"/>
        <ellipse cx="47" cy="5" rx="6" ry="5" fill="${hairD}" opacity="0.4"/>
        <ellipse cx="40" cy="3" rx="7" ry="5" fill="${hairD}" opacity="0.3"/>`
      case 3: return ` <!-- Mohawk -->
        <path d="M17,24 Q18,18 22,14 Q28,22 40,22 Q52,22 58,14 Q62,18 63,24 Q56,18 40,18 Q24,18 17,24Z" fill="${hairD}" opacity="0.5"/>
        <rect x="35" y="-6" width="10" height="30" rx="5" fill="${hair}"/>
        <ellipse cx="40" cy="-6" rx="5" ry="4" fill="${hairH}"/>`
      case 4: return ` <!-- Queue de cheval -->
        <path d="M17,24 Q18,6 40,4 Q62,6 63,24 Q58,14 52,13 Q46,18 40,15 Q34,18 28,13 Q22,14 17,24Z" fill="${hair}"/>
        <rect x="54" y="20" width="9" height="36" rx="4.5" fill="${hair}"/>
        <ellipse cx="58" cy="56" rx="7" ry="9" fill="${hairD}"/>`
      case 5: return ` <!-- Chignon -->
        <path d="M17,24 Q18,6 40,4 Q62,6 63,24 Q58,14 52,13 Q46,18 40,15 Q34,18 28,13 Q22,14 17,24Z" fill="${hair}"/>
        <circle cx="40" cy="3" r="11" fill="${hair}"/>
        <circle cx="40" cy="2" r="8" fill="${hairD}"/>
        <ellipse cx="35" cy="0" rx="4" ry="3" fill="${hairH}" opacity="0.3"/>
        ${isFemale ? `<rect x="14" y="18" width="8" height="24" rx="4" fill="${hair}"/>
        <rect x="58" y="18" width="8" height="24" rx="4" fill="${hair}"/>` : ''}`
      case 6: return ` <!-- Chauve -->
        <ellipse cx="30" cy="10" rx="8" ry="5" fill="white" opacity="0.2"/>
        <ellipse cx="26" cy="14" rx="4" ry="2.5" fill="white" opacity="0.12"/>`
      default: return ''
    }
  })()

  // ── BODY ─────────────────────────────────────────────────────────────────
  // Arm color depends on outfit (skin for maillot, outfit color otherwise)
  const armColor = (cfg.outfit === 2) ? skin : oc
  const armColorS = (cfg.outfit === 2) ? skinS : lighten(oc, -20)
  const legColor = '#1a1a2e' // jeans by default, overridden per outfit
  
  const bodyBase = (armCol: string, armColS: string, legCol: string) => {
    if (isFemale) {
      return `
        <defs>
          <linearGradient id="armF_${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${armColS}"/>
            <stop offset="50%" stop-color="${armCol}"/>
            <stop offset="100%" stop-color="${armColS}"/>
          </linearGradient>
          <linearGradient id="legF_${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${lighten(legCol,-10)}"/>
            <stop offset="50%" stop-color="${lighten(legCol,15)}"/>
            <stop offset="100%" stop-color="${lighten(legCol,-10)}"/>
          </linearGradient>
        </defs>
        <path d="M26,56 Q20,70 21,86 Q21,90 25,90 Q29,90 29,86 Q28,70 30,58Z" fill="url(#armF_${uid})"/>
        <path d="M54,56 Q60,70 59,86 Q59,90 55,90 Q51,90 51,86 Q52,70 50,58Z" fill="url(#armF_${uid})"/>
        <circle cx="25" cy="90" r="5" fill="${skin}"/>
        <circle cx="55" cy="90" r="5" fill="${skin}"/>
        <path d="M30,96 Q28,112 27,118 Q27,122 31,122 Q35,122 35,118 Q34,112 34,96Z" fill="url(#legF_${uid})"/>
        <path d="M50,96 Q52,112 53,118 Q53,122 49,122 Q45,122 45,118 Q46,112 46,96Z" fill="url(#legF_${uid})"/>
        <ellipse cx="31" cy="120" rx="8" ry="4" fill="${skinS}" transform="rotate(-5,31,120)"/>
        <ellipse cx="49" cy="120" rx="8" ry="4" fill="${skinS}" transform="rotate(5,49,120)"/>`
    } else {
      return `
        <defs>
          <linearGradient id="armM_${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${armColS}"/>
            <stop offset="40%" stop-color="${armCol}"/>
            <stop offset="100%" stop-color="${armColS}"/>
          </linearGradient>
          <linearGradient id="legM_${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="${lighten(legCol,-10)}"/>
            <stop offset="50%" stop-color="${lighten(legCol,15)}"/>
            <stop offset="100%" stop-color="${lighten(legCol,-10)}"/>
          </linearGradient>
        </defs>
        <path d="M24,54 Q17,68 17,86 Q17,91 22,91 Q27,91 27,86 Q26,70 28,56Z" fill="url(#armM_${uid})"/>
        <path d="M56,54 Q63,68 63,86 Q63,91 58,91 Q53,91 53,86 Q54,70 52,56Z" fill="url(#armM_${uid})"/>
        <circle cx="22" cy="90" r="5.5" fill="${skin}"/>
        <circle cx="58" cy="90" r="5.5" fill="${skin}"/>
        <path d="M30,96 Q28,112 27,120 Q27,124 31,124 Q35,124 35,120 Q34,112 34,96Z" fill="url(#legM_${uid})"/>
        <path d="M50,96 Q52,112 53,120 Q53,124 49,124 Q45,124 45,120 Q46,112 46,96Z" fill="url(#legM_${uid})"/>
        <ellipse cx="31" cy="122" rx="9" ry="4.5" fill="${skinS}" transform="rotate(-5,31,122)"/>
        <ellipse cx="49" cy="122" rx="9" ry="4.5" fill="${skinS}" transform="rotate(5,49,122)"/>`
    }
  }

  // ── OUTFIT ───────────────────────────────────────────────────────────────
  const outfitSVG = (() => {
    const tF = (fill: string, extra='') => `
      <path d="M27,56 Q24,66 26,78 Q28,86 32,92 L48,92 Q52,86 54,78 Q56,66 53,56 Q46,52 40,52 Q34,52 27,56Z" fill="${fill}"/>
      ${extra}`
    const tM = (fill: string, extra='') => `
      <path d="M24,54 Q22,64 24,76 Q26,86 30,94 L50,94 Q54,86 56,76 Q58,64 56,54 Q48,50 40,50 Q32,50 24,54Z" fill="${fill}"/>
      ${extra}`
    const shFill = isFemale ? `
      <path d="M27,88 Q24,96 25,100 L55,100 Q56,96 53,88Z" fill="${ocD}"/>
      <path d="M25,100 Q24,110 26,116 Q30,120 34,116 Q36,110 36,100Z" fill="${oc}"/>
      <path d="M55,100 Q56,110 54,116 Q50,120 46,116 Q44,110 44,100Z" fill="${oc}"/>
    ` : `
      <path d="M28,92 Q24,100 24,106 L56,106 Q56,100 52,92Z" fill="${ocD}"/>
      <path d="M24,106 Q23,116 25,122 Q29,126 33,122 Q35,116 35,106Z" fill="${oc}"/>
      <path d="M56,106 Q57,116 55,122 Q51,126 47,122 Q45,116 45,106Z" fill="${oc}"/>
    `
    switch(cfg.outfit) {
      case 0: // Casual hoodie
        return (isFemale ? tF : tM)(oc, `
          <!-- Poche -->
          <path d="M33,${isFemale?'76':'78'} Q40,${isFemale?'80':'82'} 47,${isFemale?'76':'78'} L46,${isFemale?'84':'88'} Q40,${isFemale?'87':'91'} 34,${isFemale?'84':'88'}Z" fill="${ocD}" opacity="0.5"/>
          <!-- Capuche bord -->
          <path d="M${isFemale?'27,56 Q34,50':'24,54 Q32,48'} 40,${isFemale?'50':'48'} Q${isFemale?'46,50 53,56':'48,48 56,54'}" fill="none" stroke="${ocD}" stroke-width="1.5"/>
          <!-- Shine -->
          <ellipse cx="33" cy="${isFemale?'62':'60'}" rx="5" ry="4" fill="white" opacity="0.12"/>
        `)
      case 1: // Smoking (H) / Robe soirée (F)
        return isFemale ? `
          <path d="M27,56 Q24,70 26,86 Q28,95 32,105 Q36,115 40,120 Q44,115 48,105 Q52,95 54,86 Q56,70 53,56 Q46,52 40,52 Q34,52 27,56Z" fill="#1a1a2e"/>
          <!-- Décolleté -->
          <path d="M27,56 Q34,64 40,60 Q46,64 53,56 Q46,52 40,52 Q34,52 27,56Z" fill="${oc}"/>
          <!-- Taille -->
          <path d="M28,78 Q40,82 52,78" fill="none" stroke="${ocD}" stroke-width="2.5"/>
          <!-- Jupe évasée -->
          <path d="M28,86 Q20,100 22,118 L58,118 Q60,100 52,86Z" fill="${lighten('#1a1a2e',15)}"/>
          <ellipse cx="35" cy="64" rx="4" ry="3" fill="white" opacity="0.15"/>
        ` : `
          <path d="M24,54 Q22,64 24,76 Q26,86 30,94 L50,94 Q54,86 56,76 Q58,64 56,54 Q48,50 40,50 Q32,50 24,54Z" fill="#1a1a2e"/>
          <!-- Plastron -->
          <rect x="36" y="54" width="8" height="30" rx="2" fill="white" opacity="0.9"/>
          <!-- Revers -->
          <path d="M36,54 Q40,66 30,62Z" fill="#111"/>
          <path d="M44,54 Q40,66 50,62Z" fill="#111"/>
          <!-- Nœud pap -->
          <path d="M37,57 L40,61 L43,57 L40,54Z" fill="${oc}"/>
          <!-- Boutons -->
          <circle cx="40" cy="70" r="1.2" fill="#555"/>
          <circle cx="40" cy="76" r="1.2" fill="#555"/>
          <circle cx="40" cy="82" r="1.2" fill="#555"/>
          <!-- Manchettes -->
          <rect x="14" y="84" width="11" height="5" rx="2" fill="white"/>
          <rect x="55" y="84" width="11" height="5" rx="2" fill="white"/>
          <ellipse cx="30" cy="58" rx="4" ry="3" fill="white" opacity="0.08"/>
        `
      case 2: // Maillot
        return isFemale ? `
          <!-- Bikini haut -->
          <path d="M29,58 Q34,52 40,55 Q46,52 51,58 Q46,68 40,65 Q34,68 29,58Z" fill="${oc}"/>
          <!-- Nœuds -->
          <ellipse cx="29" cy="58" rx="3" ry="2.5" fill="${ocH}"/>
          <ellipse cx="51" cy="58" rx="3" ry="2.5" fill="${ocH}"/>
          <!-- Bikini bas -->
          <path d="M29,84 Q26,92 28,100 Q34,106 40,104 Q46,106 52,100 Q54,92 51,84 Q46,80 40,80 Q34,80 29,84Z" fill="${oc}"/>
          <!-- Ceinture -->
          <path d="M29,84 Q40,80 51,84" fill="none" stroke="${ocH}" stroke-width="1.5"/>
          <!-- Shine -->
          <ellipse cx="34" cy="89" rx="3" ry="2" fill="white" opacity="0.2"/>
        ` : `
          <!-- Torse nu -->
          <ellipse cx="36" cy="66" rx="3" ry="2" fill="${skinS}" opacity="0.4"/>
          <ellipse cx="44" cy="66" rx="3" ry="2" fill="${skinS}" opacity="0.4"/>
          <!-- Short de bain -->
          <path d="M27,84 Q24,92 24,104 Q29,110 33,104 Q35,96 37,84Z" fill="${oc}"/>
          <path d="M53,84 Q56,92 56,104 Q51,110 47,104 Q45,96 43,84Z" fill="${oc}"/>
          <path d="M27,84 Q40,80 53,84 L53,88 Q40,84 27,88Z" fill="${ocH}"/>
          <!-- Motif short -->
          <path d="M28,90 Q29,100 30,104" fill="none" stroke="${ocH}" stroke-width="1" opacity="0.5"/>
          <path d="M33,91 Q34,101 35,105" fill="none" stroke="${ocH}" stroke-width="1" opacity="0.5"/>
          <path d="M47,91 Q48,101 49,105" fill="none" stroke="${ocH}" stroke-width="1" opacity="0.5"/>
          <path d="M52,90 Q53,100 54,104" fill="none" stroke="${ocH}" stroke-width="1" opacity="0.5"/>
          <!-- Cordon -->
          <path d="M37,86 Q40,84 43,86 L42,90 L38,90Z" fill="${ocD}"/>
        `
      case 3: // Captain Morgan
        return (isFemale ? tF : tM)('#8B0000', `
          <!-- Broderies or -->
          <path d="M${isFemale?'27,56 Q40,52 53,56':'24,54 Q40,50 56,54'}" fill="none" stroke="#D4AF37" stroke-width="2"/>
          <path d="M${isFemale?'27,90 Q40,86 53,90':'28,94 Q40,90 52,94'}" fill="none" stroke="#D4AF37" stroke-width="2"/>
          <!-- Croix centrale -->
          <rect x="37" y="${isFemale?'60':'58'}" width="6" height="22" rx="2" fill="#D4AF37" opacity="0.7"/>
          <rect x="29" y="${isFemale?'68':'70'}" width="22" height="6" rx="2" fill="#D4AF37" opacity="0.7"/>
          <!-- Ceinture -->
          <rect x="${isFemale?'26':'24'}" y="${isFemale?'82':'84'}" width="${isFemale?'28':'32'}" height="7" rx="3" fill="#2a0a00"/>
          <rect x="36" y="${isFemale?'82':'84'}" width="8" height="7" rx="2" fill="#D4AF37"/>
          ${shFill}
        `)
      case 4: // Pyjama
        return (isFemale ? tF : tM)(oc, `
          <!-- Rayures -->
          ${[0,1,2,3,4].map(i=>`<path d="M${isFemale?27:24},${isFemale?56+i*8:54+i*8} Q40,${isFemale?54+i*8:52+i*8} ${isFemale?53:56},${isFemale?56+i*8:54+i*8}" fill="none" stroke="${ocD}" stroke-width="1.5" opacity="0.5"/>`).join('')}
          <!-- Col rond -->
          <ellipse cx="40" cy="${isFemale?'56':'54'}" rx="8" ry="4" fill="${ocD}" opacity="0.5"/>
          <!-- Étoile -->
          <text x="35" y="${isFemale?'72':'74'}" font-size="10">⭐</text>
          <text x="36" y="${isFemale?'84':'86'}" font-size="8">🌙</text>
          ${shFill}
        `)
      case 5: // Sportif
        return (isFemale ? tF : tM)(oc, `
          <!-- Bandes -->
          <path d="M${isFemale?'27,56':'24,54'} Q${isFemale?'28,72 27,90':'25,72 26,94'}" fill="none" stroke="white" stroke-width="4" opacity="0.25"/>
          <path d="M${isFemale?'53,56':'56,54'} Q${isFemale?'52,72 53,90':'55,72 54,94'}" fill="none" stroke="white" stroke-width="4" opacity="0.25"/>
          <!-- Col V -->
          <path d="M${isFemale?'34,56 Q40,64 46,56':'32,54 Q40,62 48,54'}" fill="none" stroke="white" stroke-width="2" opacity="0.5"/>
          <!-- Logo -->
          <circle cx="40" cy="${isFemale?'72':'74'}" r="7" fill="white" opacity="0.15"/>
          <text x="36" y="${isFemale?'76':'78'}" font-size="9" fill="white">⚡</text>
          ${shFill}
        `)
      case 6: // F1
        return (isFemale ? tF : tM)(oc, `
          <!-- Bandes F1 -->
          <path d="M${isFemale?'27,56 Q40,52 53,56':'24,54 Q40,50 56,54'}" fill="none" stroke="${ocH}" stroke-width="3"/>
          <path d="M${isFemale?'27,90 Q40,86 53,90':'28,94 Q40,90 52,94'}" fill="none" stroke="${ocH}" stroke-width="3"/>
          <!-- Sponsors -->
          <rect x="30" y="${isFemale?'62':'62'}" width="11" height="6" rx="2" fill="white" opacity="0.85"/>
          <rect x="43" y="${isFemale?'62':'62'}" width="11" height="6" rx="2" fill="#fbbf24" opacity="0.9"/>
          <!-- Numéro -->
          <text x="36" y="${isFemale?'80':'82'}" font-size="10" font-weight="bold" fill="white" opacity="0.9">F1</text>
          ${shFill}
        `)
      default: return ''
    }
  })()

  // Shoes / feet overlay
  const shoesOverlay = (() => {
    if (cfg.outfit === 2) { // Maillot: pieds nus ou tongs
      if (isFemale) return `
        <ellipse cx="31" cy="118" rx="9" ry="4" fill="${skinS}" transform="rotate(-5,31,118)"/>
        <ellipse cx="49" cy="118" rx="9" ry="4" fill="${skinS}" transform="rotate(5,49,118)"/>`
      else return `
        <!-- Tongs -->
        <ellipse cx="31" cy="122" rx="11" ry="4.5" fill="#374151" transform="rotate(-5,31,122)"/>
        <ellipse cx="49" cy="122" rx="11" ry="4.5" fill="#374151" transform="rotate(5,49,122)"/>
        <path d="M29,120 L33,114" stroke="${oc}" stroke-width="2" stroke-linecap="round"/>
        <path d="M32,120 Q33,116 37,116" stroke="${oc}" stroke-width="1.5" stroke-linecap="round" fill="none"/>`
    }
    if (cfg.outfit === 1 && !isFemale) return `` // Shoes via body
    if (cfg.outfit === 3) return `
      <!-- Bottes Captain Morgan -->
      <path d="M26,118 Q24,122 28,124 Q34,126 36,122 Q37,118 35,116Z" fill="#1a0500"/>
      <path d="M54,118 Q56,122 52,124 Q46,126 44,122 Q43,118 45,116Z" fill="#1a0500"/>
      <ellipse cx="31" cy="124" rx="9" ry="3" fill="#120300"/>
      <ellipse cx="49" cy="124" rx="9" ry="3" fill="#120300"/>`
    return `` // Default shoes in body
  })()

  // ── ACCESSORY ────────────────────────────────────────────────────────────
  const accessorySVG = (() => {
    switch(cfg.accessory) {
      case 1: return ` <!-- Lunettes soleil -->
        <rect x="23" y="33" width="15" height="10" rx="5" fill="#111" opacity="0.95"/>
        <rect x="42" y="33" width="15" height="10" rx="5" fill="#111" opacity="0.95"/>
        <line x1="38" y1="38" x2="42" y2="38" stroke="#444" stroke-width="1.5"/>
        <line x1="16" y1="38" x2="23" y2="38" stroke="#444" stroke-width="1.5"/>
        <line x1="57" y1="38" x2="64" y2="38" stroke="#444" stroke-width="1.5"/>
        <rect x="24" y="34" width="13" height="8" rx="4" fill="${oc}" opacity="0.6"/>`
      case 2: return ` <!-- Lunettes rondes -->
        <circle cx="31" cy="38" r="7.5" fill="none" stroke="#92400e" stroke-width="2"/>
        <circle cx="49" cy="38" r="7.5" fill="none" stroke="#92400e" stroke-width="2"/>
        <line x1="38.5" y1="38" x2="41.5" y2="38" stroke="#92400e" stroke-width="1.5"/>
        <line x1="14" y1="38" x2="23.5" y2="38" stroke="#92400e" stroke-width="1.5"/>
        <line x1="56.5" y1="38" x2="66" y2="38" stroke="#92400e" stroke-width="1.5"/>
        <circle cx="31" cy="38" r="6.5" fill="#bfdbfe" opacity="0.25"/>
        <circle cx="49" cy="38" r="6.5" fill="#bfdbfe" opacity="0.25"/>`
      case 3: return ` <!-- Chapeau de fête -->
        <rect x="18" y="14" width="44" height="8" rx="4" fill="${ocD}"/>
        <polygon points="40,-6 20,16 60,16" fill="${oc}"/>
        <polygon points="40,-6 30,4 50,4" fill="${ocH}" opacity="0.4"/>
        <circle cx="40" cy="-8" r="4" fill="#fbbf24"/>
        <circle cx="40" cy="-8" r="2.5" fill="#fde68a"/>
        <circle cx="32" cy="2" r="2" fill="#ef4444"/>
        <circle cx="50" cy="6" r="2" fill="#22c55e"/>
        <circle cx="42" cy="-1" r="1.5" fill="#60a5fa"/>`
      case 4: return ` <!-- Couronne -->
        <rect x="20" y="10" width="40" height="7" rx="3" fill="#D4AF37"/>
        <polygon points="22,10 22,-1 29,8 40,-4 51,8 58,-1 58,10" fill="#fbbf24"/>
        <ellipse cx="40" cy="14" rx="20" ry="4" fill="#D4AF37" opacity="0.6"/>
        <circle cx="30" cy="6" r="3" fill="#ef4444"/>
        <circle cx="40" cy="3" r="3" fill="#60a5fa"/>
        <circle cx="50" cy="6" r="3" fill="#22c55e"/>
        <ellipse cx="36" cy="-1" rx="3" ry="2" fill="#fbbf24" opacity="0.5"/>
        <ellipse cx="44" cy="-1" rx="3" ry="2" fill="#fbbf24" opacity="0.5"/>`
      case 5: return ` <!-- Chapeau pirate -->
        <ellipse cx="40" cy="16" rx="28" ry="8" fill="#111"/>
        <rect x="22" y="-4" width="36" height="22" rx="6" fill="#111"/>
        <rect x="22" y="10" width="36" height="6" rx="3" fill="#dc2626"/>
        <circle cx="40" cy="13" r="3.5" fill="#fbbf24"/>
        <circle cx="40" cy="4" r="8" fill="white"/>
        <circle cx="37" cy="2" r="2.5" fill="#111"/>
        <circle cx="43" cy="2" r="2.5" fill="#111"/>
        <path d="M36,7 Q40,11 44,7" stroke="#111" stroke-width="1.5" fill="none"/>
        <rect x="37" y="7" width="2" height="4" fill="#111"/>
        <rect x="41" y="7" width="2" height="4" fill="#111"/>`
      case 6: return ` <!-- Casque F1 -->
        <ellipse cx="40" cy="28" rx="28" ry="30" fill="${oc}"/>
        <ellipse cx="40" cy="26" rx="26" ry="28" fill="${ocH}"/>
        <ellipse cx="14" cy="36" rx="7" ry="10" fill="${oc}"/>
        <ellipse cx="66" cy="36" rx="7" ry="10" fill="${oc}"/>
        <path d="M14,26 Q40,18 66,26 L64,50 Q40,58 16,50Z" fill="#080808" opacity="0.97"/>
        <path d="M17,28 Q40,21 63,28 L61,38 Q40,32 19,38Z" fill="white" opacity="0.1"/>
        <path d="M14,26 Q40,18 66,26" fill="none" stroke="${ocD}" stroke-width="3"/>
        <rect x="37" y="0" width="6" height="30" rx="3" fill="${ocD}" opacity="0.7"/>
        <circle cx="18" cy="22" r="3.5" fill="${ocD}"/>
        <circle cx="62" cy="22" r="3.5" fill="${ocD}"/>
        <ellipse cx="30" cy="10" rx="11" ry="6" fill="white" opacity="0.18"/>`
      case 7: return ` <!-- Palmes -->
        <ellipse cx="31" cy="124" rx="14" ry="5" fill="#22c55e" transform="rotate(-18,31,124)"/>
        <ellipse cx="49" cy="124" rx="14" ry="5" fill="#22c55e" transform="rotate(18,49,124)"/>
        <ellipse cx="31" cy="124" rx="10" ry="3.5" fill="#16a34a" transform="rotate(-18,31,124)"/>
        <ellipse cx="49" cy="124" rx="10" ry="3.5" fill="#16a34a" transform="rotate(18,49,124)"/>`
      default: return ''
    }
  })()

  return `
    <defs>
      <radialGradient id="sk_${uid}" cx="38%" cy="28%" r="70%">
        <stop offset="0%" stop-color="${skinH}"/>
        <stop offset="60%" stop-color="${skin}"/>
        <stop offset="100%" stop-color="${skinS}"/>
      </radialGradient>
      <radialGradient id="ey_${uid}" cx="32%" cy="28%" r="65%">
        <stop offset="0%" stop-color="#8fd3ff"/>
        <stop offset="60%" stop-color="#2f7ed8"/>
        <stop offset="100%" stop-color="#0a2a6a"/>
      </radialGradient>
      <radialGradient id="sh_${uid}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#000" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <!-- Shadow -->
    <ellipse cx="40" cy="128" rx="20" ry="5" fill="url(#sh_${uid})"/>

    <!-- Hair back layer -->
    ${hairBack}

    <!-- Body + limbs -->
    ${bodyBase(
      cfg.outfit === 2 ? skin : // maillot: bras nus
      cfg.outfit === 1 && !isFemale ? '#1a1a1a' : // smoking: bras noirs
      cfg.outfit === 3 ? '#8B0000' : // captain morgan: bras rouge foncé
      oc, // tous les autres: couleur tenue
      cfg.outfit === 2 ? skinS :
      cfg.outfit === 1 && !isFemale ? '#111' :
      cfg.outfit === 3 ? '#5a0000' :
      lighten(oc,-20),
      cfg.outfit === 2 ? (isFemale ? skin : oc) : // maillot: jambes nues ou short
      cfg.outfit === 1 ? (isFemale ? oc : '#1a1a2e') : // smoking: robe ou jean
      cfg.outfit === 3 ? '#3a0000' : // captain: pantalon sombre
      cfg.outfit === 4 ? oc : // pyjama: même couleur
      cfg.outfit === 6 ? oc : // F1: pantalon combinaison
      '#1a1a2e' // jean par défaut
    )}

    <!-- Outfit (over body, under head) -->
    ${outfitSVG}

    <!-- Shoes overlay -->
    ${shoesOverlay}

    <!-- Default shoes (jean outfits) -->
    ${[0,4,5,6].includes(cfg.outfit) ? `
      <ellipse cx="${isFemale?31:31}" cy="${isFemale?118:122}" rx="${isFemale?8:10}" ry="${isFemale?4:5}" fill="#111" transform="rotate(-5,${isFemale?31:31},${isFemale?118:122})"/>
      <ellipse cx="${isFemale?49:49}" cy="${isFemale?118:122}" rx="${isFemale?8:10}" ry="${isFemale?4:5}" fill="#111" transform="rotate(5,${isFemale?49:49},${isFemale?118:122})"/>
      <ellipse cx="${isFemale?28:28}" cy="${isFemale?116:120}" rx="4" ry="2" fill="white" opacity="0.12"/>
      <ellipse cx="${isFemale?46:46}" cy="${isFemale?116:120}" rx="4" ry="2" fill="white" opacity="0.12"/>
    ` : ''}

    <!-- Neck -->
    <defs>
      <linearGradient id="nk_${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${skinS}"/>
        <stop offset="50%" stop-color="${skinH}"/>
        <stop offset="100%" stop-color="${skinS}"/>
      </linearGradient>
    </defs>
    <rect x="35" y="52" width="10" height="10" rx="4" fill="url(#nk_${uid})"/>

    <!-- Head -->
    <circle cx="40" cy="30" r="22" fill="url(#sk_${uid})"/>
    <!-- Ears -->
    <circle cx="18" cy="32" r="5" fill="${skin}"/>
    <circle cx="62" cy="32" r="5" fill="${skin}"/>
    <circle cx="18" cy="32" r="3.5" fill="${skinS}"/>
    <circle cx="62" cy="32" r="3.5" fill="${skinS}"/>

    <!-- Hair front -->
    ${hairFront}

    <!-- Eyes whites -->
    <ellipse cx="31" cy="30" rx="6" ry="7.5" fill="white"/>
    <ellipse cx="49" cy="30" rx="6" ry="7.5" fill="white"/>
    <!-- Iris -->
    <g transform="translate(0,${(1-eyeOpen)*28}) scale(1,${eyeOpen})">
      <circle cx="31" cy="31" r="4" fill="url(#ey_${uid})"/>
      <circle cx="49" cy="31" r="4" fill="url(#ey_${uid})"/>
      <!-- Pupil -->
      <circle cx="31" cy="32" r="2" fill="#050510"/>
      <circle cx="49" cy="32" r="2" fill="#050510"/>
      <!-- Shine -->
      <circle cx="29.5" cy="29" r="1.4" fill="white"/>
      <circle cx="47.5" cy="29" r="1.4" fill="white"/>
      <circle cx="32" cy="33" r="0.5" fill="white" opacity="0.6"/>
      <circle cx="50" cy="33" r="0.5" fill="white" opacity="0.6"/>
    </g>

    <!-- Eyelids when drunk -->
    ${bac > 0.8 ? `<ellipse cx="31" cy="27" rx="6" ry="${Math.min(6,2.5*(bac-0.8))}" fill="${skin}"/>
    <ellipse cx="49" cy="27" rx="6" ry="${Math.min(6,2.5*(bac-0.8))}" fill="${skin}"/>` : ''}

    <!-- Eyebrows -->
    <path d="${bac<0.8 ? 'M23,21 Q31,17 38,21' : 'M23,24 Q31,20 38,24'}"
      stroke="${hair}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="${bac<0.8 ? 'M42,21 Q49,17 57,21' : 'M42,24 Q49,20 57,24'}"
      stroke="${hair}" stroke-width="2.2" fill="none" stroke-linecap="round"/>

    <!-- Nose (Pixar style: small and cute) -->
    <ellipse cx="40" cy="39" rx="2.5" ry="2" fill="${skinS}"/>
    <ellipse cx="38.5" cy="39.5" rx="1" ry="0.8" fill="${skinS}" opacity="0.6"/>

    <!-- Cheeks -->
    ${cheekOp > 0.05 ? `
    <ellipse cx="20" cy="40" rx="6" ry="4" fill="#ff9cb4" opacity="${cheekOp}"/>
    <ellipse cx="60" cy="40" rx="6" ry="4" fill="#ff9cb4" opacity="${cheekOp}"/>` : ''}

    <!-- Smile -->
    <path d="${smile}" stroke="#7a3535" stroke-width="2" fill="${bac>0.4?'#ffaaaa':'none'}" stroke-linecap="round"/>

    <!-- Head highlight (Pixar 3D feel) -->
    <ellipse cx="32" cy="18" rx="9" ry="6" fill="white" opacity="0.14"/>

    <!-- Accessories -->
    ${accessorySVG}

    <!-- Drunk FX -->
    ${bac > 0.8 ? `<ellipse cx="63" cy="18" rx="3" ry="5" fill="#60a5fa" opacity="0.8"/>` : ''}
    ${bac > 1.2 ? `<text x="2" y="14" font-size="11">⭐</text><text x="60" y="12" font-size="9">✨</text>` : ''}
    ${bac > 1.8 ? `<text x="58" y="8" font-size="8" fill="#60a5fa">z</text>
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
        el.style.transform = `rotate(${Math.sin(ts/700)*6}deg)`
      } else if (bac < 0.8) {
        el.style.transform = `rotate(${Math.sin(ts/450)*13}deg) translateX(${Math.sin(ts/550)*4}px)`
      } else if (bac < 1.2) {
        el.style.transform = `rotate(${Math.sin(ts/300)*20}deg) translate(${Math.sin(ts/280)*9}px,${Math.abs(Math.sin(ts/240))*6}px)`
      } else if (bac < 1.8) {
        const s = 1 + Math.sin(ts/280)*0.08
        el.style.transform = `rotate(${Math.sin(ts/200)*28}deg) translate(${Math.sin(ts/170)*13}px,${Math.abs(Math.sin(ts/150))*9}px) scale(${s})`
      } else {
        el.style.transform = `rotate(${(ts/7)%360}deg) scale(${0.8+Math.sin(ts/320)*0.2})`
        el.style.opacity = String(0.5 + Math.sin(ts/550)*0.5)
      }
      frameRef.current = requestAnimationFrame(frame)
    }
    frameRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(frameRef.current)
  }, [bac, animate])

  const svgContent = renderAvatarSVG(config, bac)

  return (
    <div style={{ position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
      {isMe && (
        <div style={{ position:"absolute", inset:-4, borderRadius:"50%", background:`radial-gradient(circle, ${color||"#a855f7"}50, transparent 70%)`, pointerEvents:"none" }}/>
      )}
      <div ref={containerRef} style={{ transformOrigin:"center 80%", willChange:"transform" }}>
        <svg width={size} height={size*1.4} viewBox="0 0 80 130" overflow="visible"
          dangerouslySetInnerHTML={{ __html: svgContent }}/>
      </div>
    </div>
  )
}
