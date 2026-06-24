"use client"
import { useEffect, useRef } from "react"

export interface AvatarConfig {
  sex: "M" | "F"
  skinTone: number
  hairColor: number
  hairStyle: number
  outfit: number
  accessory: number
  outfitColor: number
}

export const DEFAULT_AVATAR: AvatarConfig = {
  sex: "M", skinTone: 1, hairColor: 0, hairStyle: 0,
  outfit: 0, accessory: 0, outfitColor: 0
}

export const SKIN_TONES   = ["#fde8d0","#f5cba7","#e8a87c","#c68642","#8d5524","#4a2912"]
export const HAIR_COLORS  = ["#1a0a00","#3d2314","#6b3a2a","#b5651d","#d4a017","#e8c547","#ec4899","#a855f7"]
export const OUTFIT_COLORS = ["#6366f1","#ec4899","#22c55e","#ef4444","#f59e0b","#0ea5e9"]
export const AVATAR_COUNT = 7

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#',''),16)
  const r = Math.min(255,Math.max(0,(n>>16)+amt))
  const g = Math.min(255,Math.max(0,((n>>8)&0xff)+amt))
  const b = Math.min(255,Math.max(0,(n&0xff)+amt))
  return '#'+(r<<16|g<<8|b).toString(16).padStart(6,'0')
}

// ── Coordinate system: viewBox 0 0 100 160 ────────────────────────────────
// Head center: (50, 36), r=22
// Neck: y 57-66
// Torso: y 66-105, centered at 50
// Arms: left ~x18, right ~x82, y 68-108
// Legs: y 105-148, left cx=38, right cx=62
// Feet: y ~148-156

export function renderAvatarSVG(cfg: AvatarConfig, bac = 0): string {
  const sk  = SKIN_TONES[cfg.skinTone]  || SKIN_TONES[1]
  const skD = lighten(sk, -22)
  const skH = lighten(sk, 28)
  const hr  = HAIR_COLORS[cfg.hairColor]|| HAIR_COLORS[0]
  const hrD = lighten(hr, -28)
  const hrH = lighten(hr, 22)
  const oc  = OUTFIT_COLORS[cfg.outfitColor] || OUTFIT_COLORS[0]
  const ocD = lighten(oc, -30)
  const ocH = lighten(oc, 22)
  const F   = cfg.sex === "F"
  const uid = `a${cfg.skinTone}${cfg.hairColor}${cfg.sex}${cfg.outfit}${cfg.outfitColor}${cfg.hairStyle}`

  const eyeY  = bac < 1.5 ? 1 : Math.max(0.15, 1-(bac-1.5)*0.85)
  const cheek = Math.min(0.65, bac*1.2)
  const mouthPath = bac < 0.3 ? "M43,48 Q50,52 57,48"
    : bac < 1.5 ? "M41,46 Q50,55 59,46"
    : "M43,50 Q50,45 57,50"

  // ── HAIR BEHIND HEAD ─────────────────────────────────────────────────────
  const hairBehind = (() => {
    switch(cfg.hairStyle) {
      case 1: // Long — strands behind
        return `<rect x="19" y="18" width="11" height="58" rx="5.5" fill="${hr}"/>
                <rect x="70" y="18" width="11" height="58" rx="5.5" fill="${hr}"/>`
      case 2: // Afro — big puff behind
        return `<ellipse cx="50" cy="16" rx="32" ry="26" fill="${hr}"/>
                <ellipse cx="22" cy="28" rx="14" ry="20" fill="${hr}"/>
                <ellipse cx="78" cy="28" rx="14" ry="20" fill="${hr}"/>`
      case 4: // Ponytail
        return `<rect x="66" y="24" width="12" height="38" rx="6" fill="${hr}"/>
                <ellipse cx="72" cy="62" rx="9" ry="11" fill="${hrD}"/>`
      case 5: // Bun
        return `<circle cx="50" cy="8" r="14" fill="${hr}"/>
                <circle cx="50" cy="7" r="10" fill="${hrD}"/>`
      default: return ''
    }
  })()

  // ── HAIR FRONT ───────────────────────────────────────────────────────────
  const hairFront = (() => {
    const base = `<path d="M29,36 Q28,10 50,6 Q72,10 71,36 Q64,20 55,18 Q50,22 45,18 Q36,20 29,36Z" fill="${hr}"/>
      <ellipse cx="38" cy="11" rx="8" ry="5" fill="${hrH}" opacity="0.35"/>
      ${F ? `<path d="M29,36 Q26,40 27,46 Q29,40 29,36Z" fill="${hr}"/>
             <path d="M71,36 Q74,40 73,46 Q71,40 71,36Z" fill="${hr}"/>` : ''}`
    switch(cfg.hairStyle) {
      case 0: return base // Court
      case 1: return base // Long (sides handled in behind)
      case 2: return `` // Afro — all behind
      case 3: // Mohawk
        return `<rect x="44" y="-4" width="12" height="34" rx="6" fill="${hr}"/>
          <ellipse cx="50" cy="-4" rx="6" ry="4" fill="${hrH}" opacity="0.4"/>
          <path d="M29,36 Q28,20 34,16 Q38,28 50,24 Q62,28 66,16 Q72,20 71,36 Q64,24 50,20 Q36,24 29,36Z" fill="${hrD}" opacity="0.4"/>`
      case 4: // Queue de cheval
        return `<path d="M29,36 Q28,10 50,6 Q72,10 71,36 Q64,20 55,18 Q50,22 45,18 Q36,20 29,36Z" fill="${hr}"/>
          <ellipse cx="38" cy="11" rx="8" ry="5" fill="${hrH}" opacity="0.3"/>`
      case 5: // Chignon (bun handled behind)
        return `<path d="M29,36 Q28,10 50,6 Q72,10 71,36 Q64,20 55,18 Q50,22 45,18 Q36,20 29,36Z" fill="${hr}"/>
          ${F ? `<path d="M29,36 Q26,42 27,48 Q29,42 29,36Z" fill="${hr}"/>
                 <path d="M71,36 Q74,42 73,48 Q71,42 71,36Z" fill="${hr}"/>` : ''}`
      case 6: // Chauve
        return `<ellipse cx="38" cy="20" rx="10" ry="6" fill="white" opacity="0.18"/>
                <ellipse cx="34" cy="26" rx="5" ry="3" fill="white" opacity="0.1"/>`
      default: return base
    }
  })()

  // ── ARMS color ────────────────────────────────────────────────────────────
  const armFill = cfg.outfit === 2 ? sk  // maillot = bras nus
    : cfg.outfit === 1 && !F ? '#111'     // smoking = noir
    : cfg.outfit === 3 ? '#6b0000'        // captain = bordeaux
    : oc
  const armFillD = cfg.outfit === 2 ? skD : cfg.outfit === 1 && !F ? '#000' : cfg.outfit === 3 ? '#3a0000' : ocD

  // ── LEGS color ────────────────────────────────────────────────────────────
  const legFill = cfg.outfit === 2 ? (F ? oc : sk) // maillot F=bikini bas, H=jambes nues
    : cfg.outfit === 1 ? (F ? oc : '#1a1a2e')       // smoking F=robe, H=pantalon noir
    : cfg.outfit === 3 ? '#2a0000'                    // captain = pantalon bordeaux foncé
    : cfg.outfit === 4 ? oc                           // pyjama = même couleur
    : cfg.outfit === 6 ? ocD                          // F1 = combinaison
    : '#1e293b'                                       // jean

  const legFillD = lighten(legFill, -15)

  // ── BODY SVG ──────────────────────────────────────────────────────────────
  const bodySVG = F ? `
    <defs>
      <linearGradient id="armF${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${armFillD}"/>
        <stop offset="45%" stop-color="${armFill}"/>
        <stop offset="100%" stop-color="${armFillD}"/>
      </linearGradient>
      <linearGradient id="legF${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${legFillD}"/>
        <stop offset="45%" stop-color="${legFill}"/>
        <stop offset="100%" stop-color="${legFillD}"/>
      </linearGradient>
      <linearGradient id="skF${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${skD}"/>
        <stop offset="45%" stop-color="${sk}"/>
        <stop offset="100%" stop-color="${skD}"/>
      </linearGradient>
    </defs>
    <!-- Bras G -->
    <path d="M33,68 Q24,82 25,102 Q25,107 30,107 Q35,107 35,102 Q34,84 37,70Z" fill="url(#armF${uid})"/>
    <!-- Bras D -->
    <path d="M67,68 Q76,82 75,102 Q75,107 70,107 Q65,107 65,102 Q66,84 63,70Z" fill="url(#armF${uid})"/>
    <!-- Mains -->
    <circle cx="29" cy="107" r="6" fill="${cfg.outfit===2?sk:armFill}"/>
    <circle cx="71" cy="107" r="6" fill="${cfg.outfit===2?sk:armFill}"/>
    <!-- Jambe G -->
    <path d="M37,105 Q34,122 33,134 Q33,139 37,139 Q42,139 42,134 Q41,122 43,105Z" fill="url(#legF${uid})"/>
    <!-- Jambe D -->
    <path d="M63,105 Q66,122 67,134 Q67,139 63,139 Q58,139 58,134 Q59,122 57,105Z" fill="url(#legF${uid})"/>
    <!-- Pieds -->
    <ellipse cx="37" cy="138" rx="10" ry="5" fill="${skD}" transform="rotate(-8,37,138)"/>
    <ellipse cx="63" cy="138" rx="10" ry="5" fill="${skD}" transform="rotate(8,63,138)"/>
  ` : `
    <defs>
      <linearGradient id="armM${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${armFillD}"/>
        <stop offset="40%" stop-color="${armFill}"/>
        <stop offset="100%" stop-color="${armFillD}"/>
      </linearGradient>
      <linearGradient id="legM${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${legFillD}"/>
        <stop offset="40%" stop-color="${legFill}"/>
        <stop offset="100%" stop-color="${legFillD}"/>
      </linearGradient>
      <linearGradient id="skM${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${skD}"/>
        <stop offset="40%" stop-color="${sk}"/>
        <stop offset="100%" stop-color="${skD}"/>
      </linearGradient>
    </defs>
    <!-- Bras G -->
    <path d="M30,68 Q20,84 20,106 Q20,112 26,112 Q32,112 32,106 Q31,86 35,70Z" fill="url(#armM${uid})"/>
    <!-- Bras D -->
    <path d="M70,68 Q80,84 80,106 Q80,112 74,112 Q68,112 68,106 Q69,86 65,70Z" fill="url(#armM${uid})"/>
    <!-- Mains -->
    <circle cx="25" cy="111" r="7" fill="${cfg.outfit===2?sk:armFill}"/>
    <circle cx="75" cy="111" r="7" fill="${cfg.outfit===2?sk:armFill}"/>
    <!-- Jambe G -->
    <path d="M36,105 Q33,123 32,137 Q32,142 37,142 Q42,142 42,137 Q41,123 44,105Z" fill="url(#legM${uid})"/>
    <!-- Jambe D -->
    <path d="M64,105 Q67,123 68,137 Q68,142 63,142 Q58,142 58,137 Q59,123 56,105Z" fill="url(#legM${uid})"/>
    <!-- Pieds / chaussures -->
    ${cfg.outfit === 2 ? `
      <!-- Tongs -->
      <ellipse cx="37" cy="142" rx="13" ry="5.5" fill="#374151" transform="rotate(-6,37,142)"/>
      <ellipse cx="63" cy="142" rx="13" ry="5.5" fill="#374151" transform="rotate(6,63,142)"/>
      <path d="M35,140 L39,133" stroke="${oc}" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M38,140 Q40,135 45,134" stroke="${oc}" stroke-width="2" stroke-linecap="round" fill="none"/>
    ` : cfg.outfit === 3 ? `
      <!-- Bottes -->
      <path d="M30,136 Q28,142 32,145 Q38,148 40,143 Q42,138 41,136Z" fill="#1a0500"/>
      <path d="M60,136 Q58,142 62,145 Q68,148 70,143 Q72,138 69,136Z" fill="#1a0500"/>
      <ellipse cx="36" cy="145" rx="11" ry="4" fill="#0e0200"/>
      <ellipse cx="64" cy="145" rx="11" ry="4" fill="#0e0200"/>
    ` : `
      <!-- Chaussures -->
      <ellipse cx="37" cy="141" rx="12" ry="5.5" fill="#111" transform="rotate(-5,37,141)"/>
      <ellipse cx="63" cy="141" rx="12" ry="5.5" fill="#111" transform="rotate(5,63,141)"/>
      <ellipse cx="34" cy="139" rx="6" ry="2.5" fill="white" opacity="0.1"/>
      <ellipse cx="60" cy="139" rx="6" ry="2.5" fill="white" opacity="0.1"/>
    `}
  `

  // ── OUTFIT ────────────────────────────────────────────────────────────────
  const outfitSVG = (() => {
    // Helper: torso shape
    const torsoM = (fill: string, extra='') => `
      <path d="M28,66 Q24,78 26,90 Q28,102 33,106 L67,106 Q72,102 74,90 Q76,78 72,66 Q61,60 50,60 Q39,60 28,66Z" fill="${fill}"/>
      ${extra}`
    const torsoF = (fill: string, extra='') => `
      <path d="M32,66 Q28,76 30,86 Q32,96 36,104 L64,104 Q68,96 70,86 Q72,76 68,66 Q59,61 50,61 Q41,61 32,66Z" fill="${fill}"/>
      ${extra}`
    const torso = F ? torsoF : torsoM

    // Shoulder discs to join arms seamlessly
    const shoulderM = `<circle cx="28" cy="70" r="10" fill="${armFill}"/><circle cx="72" cy="70" r="10" fill="${armFill}"/>`
    const shoulderF = `<circle cx="32" cy="70" r="9" fill="${armFill}"/><circle cx="68" cy="70" r="9" fill="${armFill}"/>`
    const shoulders = F ? shoulderF : shoulderM

    switch(cfg.outfit) {
      case 0: // Casual hoodie
        return `${shoulders}
          ${torso(oc, `
            <!-- Capuche bord -->
            <path d="M${F?'32,66 Q41,58':'28,66 Q39,57'} 50,${F?'57':'55'} Q${F?'59,58 68,66':'61,57 72,66'}"
              fill="none" stroke="${ocD}" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Poche kangourou -->
            <path d="M${F?'38,88 Q50,92 62,88 L61,100 Q50,103 39,100Z':'36,88 Q50,93 64,88 L63,102 Q50,105 37,102Z'}"
              fill="${ocD}" opacity="0.5"/>
            <!-- Shine -->
            <ellipse cx="${F?'40':'39'}" cy="${F?'72':'70'}" rx="7" ry="5" fill="white" opacity="0.1"/>
          `)}`

      case 1: // Smoking (H) / Robe de soirée (F)
        return F ? `
          <circle cx="32" cy="70" r="9" fill="${oc}"/>
          <circle cx="68" cy="70" r="9" fill="${oc}"/>
          <!-- Robe évasée -->
          <path d="M32,66 Q27,78 24,100 Q22,120 26,140 L74,140 Q78,120 76,100 Q73,78 68,66 Q59,61 50,61 Q41,61 32,66Z" fill="${oc}"/>
          <!-- Décolleté -->
          <path d="M32,66 Q41,74 50,70 Q59,74 68,66 Q59,61 50,61 Q41,61 32,66Z" fill="${ocH}" opacity="0.5"/>
          <!-- Ceinture -->
          <rect x="30" y="90" width="40" height="6" rx="3" fill="${ocD}"/>
          <!-- Reflet -->
          <ellipse cx="40" cy="75" rx="7" ry="5" fill="white" opacity="0.12"/>
        ` : `
          ${`<circle cx="28" cy="70" r="10" fill="#111"/><circle cx="72" cy="70" r="10" fill="#111"/>`}
          ${torsoM('#111', `
            <!-- Plastron blanc -->
            <rect x="44" y="64" width="12" height="34" rx="3" fill="white" opacity="0.92"/>
            <!-- Revers G -->
            <path d="M44,64 Q50,76 38,72Z" fill="#1a1a1a"/>
            <!-- Revers D -->
            <path d="M56,64 Q50,76 62,72Z" fill="#1a1a1a"/>
            <!-- Nœud papillon -->
            <path d="M46,67 L50,71 L54,67 L50,64Z" fill="${oc}"/>
            <!-- Boutons -->
            <circle cx="50" cy="82" r="1.5" fill="#555"/>
            <circle cx="50" cy="88" r="1.5" fill="#555"/>
            <circle cx="50" cy="94" r="1.5" fill="#555"/>
          `)}
          <!-- Manchettes -->
          <rect x="15" y="104" width="13" height="6" rx="3" fill="white"/>
          <rect x="72" y="104" width="13" height="6" rx="3" fill="white"/>
        `

      case 2: // Maillot de bain
        return F ? `
          <circle cx="32" cy="70" r="9" fill="${sk}"/>
          <circle cx="68" cy="70" r="9" fill="${sk}"/>
          <!-- Torse nu femme -->
          ${torsoF(sk, `
            <!-- Bikini haut -->
            <path d="M34,68 Q40,60 50,64 Q60,60 66,68 Q60,77 50,73 Q40,77 34,68Z" fill="${oc}"/>
            <!-- Nœuds -->
            <ellipse cx="34" cy="68" rx="3.5" ry="3" fill="${ocH}"/>
            <ellipse cx="66" cy="68" rx="3.5" ry="3" fill="${ocH}"/>
          `)}
          <!-- Bikini bas -->
          <path d="M36,100 Q33,108 35,116 Q40,122 50,120 Q60,122 65,116 Q67,108 64,100 Q57,96 50,96 Q43,96 36,100Z" fill="${oc}"/>
          <path d="M36,100 Q50,96 64,100" fill="none" stroke="${ocH}" stroke-width="2"/>
          <ellipse cx="40" cy="103" rx="4" ry="2.5" fill="white" opacity="0.2"/>
        ` : `
          <circle cx="28" cy="70" r="10" fill="${sk}"/>
          <circle cx="72" cy="70" r="10" fill="${sk}"/>
          <!-- Torse nu homme -->
          ${torsoM(sk, `
            <!-- Tétons -->
            <circle cx="42" cy="78" r="2.5" fill="${skD}" opacity="0.45"/>
            <circle cx="58" cy="78" r="2.5" fill="${skD}" opacity="0.45"/>
          `)}
          <!-- Short de bain -->
          <path d="M32,98 Q28,106 28,118 L72,118 Q72,106 68,98Z" fill="${oc}"/>
          <rect x="32" y="98" width="36" height="5" rx="2" fill="${ocH}" opacity="0.7"/>
          <!-- Lignes short -->
          <line x1="38" y1="103" x2="36" y2="118" stroke="${ocH}" stroke-width="1.5" opacity="0.4"/>
          <line x1="44" y1="103" x2="43" y2="118" stroke="${ocH}" stroke-width="1.5" opacity="0.4"/>
          <line x1="56" y1="103" x2="57" y2="118" stroke="${ocH}" stroke-width="1.5" opacity="0.4"/>
          <line x1="62" y1="103" x2="64" y2="118" stroke="${ocH}" stroke-width="1.5" opacity="0.4"/>
          <!-- Cordon -->
          <path d="M45,100 L50,97 L55,100 L54,105 L46,105Z" fill="${ocD}"/>
        `

      case 3: // Captain Morgan
        return `${shoulders}
          ${torso('#7a0000', `
            <!-- Broderie or haut -->
            <path d="M${F?'32,66 Q50,60 68,66':'28,66 Q50,60 72,66'}" fill="none" stroke="#D4AF37" stroke-width="2.5"/>
            <!-- Broderie or bas -->
            <path d="M${F?'36,100 Q50,96 64,100':'33,102 Q50,98 67,102'}" fill="none" stroke="#D4AF37" stroke-width="2.5"/>
            <!-- Croix centrale -->
            <rect x="46" y="${F?'70':'68'}" width="8" height="26" rx="3" fill="#D4AF37" opacity="0.75"/>
            <rect x="35" y="${F?'79':'78'}" width="30" height="8" rx="3" fill="#D4AF37" opacity="0.75"/>
            <!-- Ceinture -->
            <rect x="${F?'30':'28'}" y="${F?'92':'94'}" width="${F?'40':'44'}" height="8" rx="4" fill="#1a0000"/>
            <rect x="44" y="${F?'92':'94'}" width="12" height="8" rx="3" fill="#D4AF37"/>
          `)}
        `

      case 4: // Pyjama
        return `${shoulders}
          ${torso(oc, `
            <!-- Rayures horizontales -->
            ${[0,1,2,3,4].map(i=>`<path d="M${F?`32,${70+i*8} Q50,${67+i*8} 68,${70+i*8}`:`28,${68+i*8} Q50,${65+i*8} 72,${68+i*8}`}" fill="none" stroke="${ocD}" stroke-width="2" opacity="0.5"/>`).join('')}
            <!-- Col rond -->
            <ellipse cx="50" cy="${F?'65':'63'}" rx="10" ry="5" fill="${ocD}" opacity="0.45"/>
            <!-- Déco -->
            <text x="${F?'41':'39'}" y="${F?'82':'82'}" font-size="12">⭐</text>
            <text x="${F?'42':'40'}" y="${F?'95':'96'}" font-size="10">🌙</text>
          `)}
        `

      case 5: // Sportif
        return `${shoulders}
          ${torso(oc, `
            <!-- Bandes latérales -->
            <rect x="${F?'32':'28'}" y="${F?'66':'66'}" width="8" height="${F?'38':'40'}" rx="4" fill="white" opacity="0.22"/>
            <rect x="${F?'60':'64'}" y="${F?'66':'66'}" width="8" height="${F?'38':'40'}" rx="4" fill="white" opacity="0.22"/>
            <!-- Col V -->
            <path d="M${F?'40,66 Q50,78 60,66':'38,66 Q50,78 62,66'}" fill="none" stroke="white" stroke-width="2.5" opacity="0.5"/>
            <!-- Logo -->
            <circle cx="50" cy="${F?'84':'86'}" r="9" fill="white" opacity="0.15"/>
            <text x="45" y="${F?'88':'90'}" font-size="11" fill="white">⚡</text>
          `)}
        `

      case 6: // F1
        return `${shoulders}
          ${torso(oc, `
            <!-- Bandes F1 haut/bas -->
            <path d="M${F?'32,66 Q50,60 68,66':'28,66 Q50,60 72,66'}" fill="none" stroke="${ocH}" stroke-width="3"/>
            <path d="M${F?'36,100 Q50,96 64,100':'33,102 Q50,98 67,102'}" fill="none" stroke="${ocH}" stroke-width="3"/>
            <!-- Sponsors -->
            <rect x="32" y="${F?'72':'70'}" width="14" height="7" rx="2.5" fill="white" opacity="0.9"/>
            <rect x="54" y="${F?'72':'70'}" width="14" height="7" rx="2.5" fill="#fbbf24" opacity="0.95"/>
            <!-- Numéro -->
            <text x="${F?'43':'41'}" y="${F?'91':'92'}" font-size="13" font-weight="bold" fill="white" opacity="0.92">F1</text>
          `)}
        `
      default: return ''
    }
  })()

  // ── ACCESSORY ─────────────────────────────────────────────────────────────
  const accessorySVG = (() => {
    switch(cfg.accessory) {
      case 1: return `
        <rect x="28" y="40" width="18" height="11" rx="5.5" fill="#0a0a0a" opacity="0.95"/>
        <rect x="54" y="40" width="18" height="11" rx="5.5" fill="#0a0a0a" opacity="0.95"/>
        <line x1="46" y1="45" x2="54" y2="45" stroke="#333" stroke-width="1.5"/>
        <line x1="18" y1="45" x2="28" y2="45" stroke="#333" stroke-width="1.5"/>
        <line x1="72" y1="45" x2="82" y2="45" stroke="#333" stroke-width="1.5"/>
        <rect x="29" y="41" width="16" height="9" rx="4.5" fill="${oc}" opacity="0.55"/>`
      case 2: return `
        <circle cx="36" cy="44" r="9" fill="none" stroke="#92400e" stroke-width="2.2"/>
        <circle cx="64" cy="44" r="9" fill="none" stroke="#92400e" stroke-width="2.2"/>
        <line x1="45" y1="44" x2="55" y2="44" stroke="#92400e" stroke-width="1.8"/>
        <line x1="18" y1="44" x2="27" y2="44" stroke="#92400e" stroke-width="1.8"/>
        <line x1="73" y1="44" x2="82" y2="44" stroke="#92400e" stroke-width="1.8"/>
        <circle cx="36" cy="44" r="7.5" fill="#bfdbfe" opacity="0.22"/>
        <circle cx="64" cy="44" r="7.5" fill="#bfdbfe" opacity="0.22"/>`
      case 3: return `
        <!-- Bande chapeau sur les cheveux -->
        <rect x="22" y="18" width="56" height="9" rx="4" fill="${ocD}"/>
        <!-- Cône -->
        <polygon points="50,-6 26,20 74,20" fill="${oc}"/>
        <polygon points="50,-6 36,8 64,8" fill="${ocH}" opacity="0.4"/>
        <!-- Pompon -->
        <circle cx="50" cy="-8" r="5" fill="#fbbf24"/>
        <circle cx="50" cy="-8" r="3" fill="#fde68a"/>
        <!-- Confettis -->
        <circle cx="38" cy="4" r="2.5" fill="#ef4444"/>
        <circle cx="62" cy="8" r="2.5" fill="#22c55e"/>
        <circle cx="50" cy="2" r="2" fill="#60a5fa"/>
        <circle cx="34" cy="12" r="2" fill="#fbbf24"/>`
      case 4: return `
        <!-- Couronne -->
        <rect x="26" y="14" width="48" height="8" rx="3" fill="#D4AF37"/>
        <polygon points="28,14 28,2 36,12 50,-2 64,12 72,2 72,14" fill="#fbbf24"/>
        <ellipse cx="50" cy="18" rx="24" ry="5" fill="#D4AF37" opacity="0.6"/>
        <circle cx="37" cy="8" r="3.5" fill="#ef4444"/>
        <circle cx="50" cy="4" r="3.5" fill="#60a5fa"/>
        <circle cx="63" cy="8" r="3.5" fill="#22c55e"/>
        <circle cx="43" cy="1" r="2.5" fill="#fbbf24" opacity="0.7"/>
        <circle cx="57" cy="1" r="2.5" fill="#fbbf24" opacity="0.7"/>`
      case 5: return `
        <!-- Chapeau pirate -->
        <ellipse cx="50" cy="20" rx="34" ry="9" fill="#111"/>
        <rect x="26" y="-4" width="48" height="26" rx="8" fill="#111"/>
        <rect x="26" y="14" width="48" height="7" rx="3" fill="#dc2626"/>
        <circle cx="50" cy="17" r="4" fill="#fbbf24"/>
        <!-- Tête de mort -->
        <circle cx="50" cy="7" r="9" fill="white"/>
        <circle cx="45" cy="5" r="3" fill="#111"/>
        <circle cx="55" cy="5" r="3" fill="#111"/>
        <path d="M44,11 Q50,16 56,11" stroke="#111" stroke-width="2" fill="none"/>
        <rect x="46" y="11" width="3" height="5" fill="#111"/>
        <rect x="51" y="11" width="3" height="5" fill="#111"/>`
      case 6: return `
        <!-- Casque F1 complet -->
        <ellipse cx="50" cy="36" rx="34" ry="36" fill="${oc}"/>
        <ellipse cx="50" cy="34" rx="32" ry="34" fill="${ocH}"/>
        <!-- Cache-oreilles -->
        <ellipse cx="17" cy="44" rx="8" ry="12" fill="${oc}"/>
        <ellipse cx="83" cy="44" rx="8" ry="12" fill="${oc}"/>
        <!-- Visière noire -->
        <path d="M18,32 Q50,24 82,32 L80,58 Q50,68 20,58Z" fill="#080808" opacity="0.97"/>
        <!-- Reflet visière -->
        <path d="M22,34 Q50,28 78,34 L76,44 Q50,38 24,44Z" fill="white" opacity="0.08"/>
        <!-- Séparation casque/visière -->
        <path d="M18,32 Q50,24 82,32" fill="none" stroke="${ocD}" stroke-width="3"/>
        <!-- Bande centrale -->
        <rect x="46" y="2" width="8" height="34" rx="4" fill="${ocD}" opacity="0.75"/>
        <!-- Boulons -->
        <circle cx="22" cy="28" r="4" fill="${ocD}"/>
        <circle cx="78" cy="28" r="4" fill="${ocD}"/>
        <!-- Reflet casque -->
        <ellipse cx="36" cy="14" rx="13" ry="8" fill="white" opacity="0.2"/>
        <!-- HANS -->
        <rect x="26" y="62" width="10" height="7" rx="3" fill="${ocD}"/>
        <rect x="64" y="62" width="10" height="7" rx="3" fill="${ocD}"/>`
      case 7: return `
        <!-- Palmes sur les pieds -->
        <ellipse cx="37" cy="${F?'140':'143'}" rx="17" ry="6" fill="#22c55e" transform="rotate(-20,37,${F?140:143})"/>
        <ellipse cx="63" cy="${F?'140':'143'}" rx="17" ry="6" fill="#22c55e" transform="rotate(20,63,${F?140:143})"/>
        <ellipse cx="37" cy="${F?'140':'143'}" rx="12" ry="4" fill="#16a34a" transform="rotate(-20,37,${F?140:143})"/>
        <ellipse cx="63" cy="${F?'140':'143'}" rx="12" ry="4" fill="#16a34a" transform="rotate(20,63,${F?140:143})"/>`
      default: return ''
    }
  })()

  return `
    <defs>
      <radialGradient id="sk${uid}" cx="38%" cy="28%" r="72%">
        <stop offset="0%" stop-color="${skH}"/>
        <stop offset="55%" stop-color="${sk}"/>
        <stop offset="100%" stop-color="${skD}"/>
      </radialGradient>
      <radialGradient id="ey${uid}" cx="32%" cy="28%" r="68%">
        <stop offset="0%" stop-color="#8fd3ff"/>
        <stop offset="55%" stop-color="#2f7ed8"/>
        <stop offset="100%" stop-color="#0a2a6a"/>
      </radialGradient>
      <radialGradient id="shadow${uid}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#000" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
    </defs>

    <!-- Ground shadow -->
    <ellipse cx="50" cy="${F?'147':'152'}" rx="26" ry="6" fill="url(#shadow${uid})"/>

    <!-- Hair behind head -->
    ${hairBehind}

    <!-- Body (arms + legs) -->
    ${bodySVG}

    <!-- Outfit (torso) -->
    ${outfitSVG}

    <!-- Palmes (behind feet) -->
    ${cfg.accessory === 7 ? accessorySVG : ''}

    <!-- Neck -->
    <defs>
      <linearGradient id="nk${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${skD}"/><stop offset="50%" stop-color="${skH}"/><stop offset="100%" stop-color="${skD}"/>
      </linearGradient>
    </defs>
    <rect x="43" y="57" width="14" height="11" rx="6" fill="url(#nk${uid})"/>

    <!-- Head -->
    <circle cx="50" cy="36" r="22" fill="url(#sk${uid})"/>

    <!-- Ears -->
    <circle cx="28" cy="38" r="6" fill="${sk}"/>
    <circle cx="72" cy="38" r="6" fill="${sk}"/>
    <circle cx="28" cy="38" r="4" fill="${skD}"/>
    <circle cx="72" cy="38" r="4" fill="${skD}"/>

    <!-- Hair front -->
    ${hairFront}

    <!-- Eye whites -->
    <ellipse cx="40" cy="36" rx="7.5" ry="9" fill="white"/>
    <ellipse cx="60" cy="36" rx="7.5" ry="9" fill="white"/>
    <!-- Eyelid shadow -->
    <ellipse cx="40" cy="30" rx="7" ry="4" fill="${sk}" opacity="0.25"/>
    <ellipse cx="60" cy="30" rx="7" ry="4" fill="${sk}" opacity="0.25"/>

    <!-- Iris + pupil + shine -->
    <g transform="translate(0,${(1-eyeY)*28}) scale(1,${eyeY})">
      <circle cx="40" cy="37" r="5" fill="url(#ey${uid})"/>
      <circle cx="60" cy="37" r="5" fill="url(#ey${uid})"/>
      <circle cx="40" cy="38" r="2.5" fill="#050510"/>
      <circle cx="60" cy="38" r="2.5" fill="#050510"/>
      <circle cx="38" cy="35" r="1.8" fill="white"/>
      <circle cx="58" cy="35" r="1.8" fill="white"/>
      <circle cx="41" cy="39" r="0.6" fill="white" opacity="0.5"/>
      <circle cx="61" cy="39" r="0.6" fill="white" opacity="0.5"/>
    </g>
    <!-- Drunk eyelids -->
    ${bac > 0.8 ? `<ellipse cx="40" cy="32" rx="7" ry="${Math.min(7,2.8*(bac-0.8))}" fill="${sk}"/>
    <ellipse cx="60" cy="32" rx="7" ry="${Math.min(7,2.8*(bac-0.8))}" fill="${sk}"/>` : ''}

    <!-- Eyebrows -->
    <path d="${bac<0.8?'M31,24 Q40,20 48,24':'M31,27 Q40,23 48,27'}"
      stroke="${hr}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="${bac<0.8?'M52,24 Q60,20 69,24':'M52,27 Q60,23 69,27'}"
      stroke="${hr}" stroke-width="2.5" fill="none" stroke-linecap="round"/>

    <!-- Nose -->
    <ellipse cx="50" cy="44" rx="3.5" ry="2.8" fill="${skD}"/>
    <ellipse cx="48" cy="44.5" rx="1.2" ry="1" fill="${skD}" opacity="0.55"/>

    <!-- Cheeks -->
    ${cheek > 0.05 ? `
    <ellipse cx="27" cy="44" rx="7" ry="5" fill="#ff9cb4" opacity="${cheek}"/>
    <ellipse cx="73" cy="44" rx="7" ry="5" fill="#ff9cb4" opacity="${cheek}"/>` : ''}

    <!-- Mouth -->
    <path d="${mouthPath}" stroke="#7a3535" stroke-width="2.2"
      fill="${bac>0.4?'#ffaaaa':'none'}" stroke-linecap="round"/>
    ${F && bac < 0.3 ? `<path d="${mouthPath}" stroke="${lighten(oc,20)}" stroke-width="1" fill="none" opacity="0.3"/>` : ''}

    <!-- Head highlight (3D Pixar feel) -->
    <ellipse cx="40" cy="22" rx="11" ry="7" fill="white" opacity="0.14"/>

    <!-- Accessories (face/head level) -->
    ${cfg.accessory !== 7 ? accessorySVG : ''}

    <!-- Drunk FX -->
    ${bac > 0.8 ? `<ellipse cx="76" cy="22" rx="3.5" ry="6" fill="#60a5fa" opacity="0.8"/>` : ''}
    ${bac > 1.2 ? `<text x="4" y="18" font-size="13">⭐</text><text x="74" y="16" font-size="11">✨</text>` : ''}
    ${bac > 1.8 ? `<text x="72" y="10" font-size="10" fill="#60a5fa">z</text>
    <text x="80" y="4" font-size="12" fill="#60a5fa" opacity="0.7">z</text>` : ''}
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

  return (
    <div style={{ position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
      {isMe && <div style={{ position:"absolute", inset:-4, borderRadius:"50%", background:`radial-gradient(circle, ${color||"#a855f7"}50, transparent 70%)`, pointerEvents:"none" }}/>}
      <div ref={containerRef} style={{ transformOrigin:"center 78%", willChange:"transform" }}>
        <svg width={size} height={size*1.65} viewBox="0 0 100 160" overflow="visible"
          dangerouslySetInnerHTML={{ __html: renderAvatarSVG(config, bac) }}/>
      </div>
    </div>
  )
}
