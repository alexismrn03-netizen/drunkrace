"use client"
import { useEffect, useRef, useState } from "react"

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

export const SKIN_TONES    = ["#fde8d0","#f5cba7","#e8a87c","#c68642","#8d5524","#4a2912"]
export const HAIR_COLORS   = ["#1a0a00","#3d2314","#6b3a2a","#b5651d","#d4a017","#e8c547","#ec4899","#a855f7"]
export const OUTFIT_COLORS = ["#6366f1","#ec4899","#22c55e","#ef4444","#f59e0b","#0ea5e9"]
export const AVATAR_COUNT  = 7

// Map our config to DiceBear Avataaars params
const SKIN_MAP    = ["light","light","tanned","yellow","brown","dark"]
const HAIR_MAP    = ["Black","Brown","Blonde","Auburn","Blonde","Blonde","PastelPink","Blue"]
const HAIR_STYLE_M = ["ShortHairShortFlat","LongHairStraight","ShortHairDreads01","ShortHairFrizzle","LongHairPonyTail","LongHairBun","ShortHairShortWaved"]
const HAIR_STYLE_F = ["LongHairStraight","LongHairCurvy","LongHairFro","ShortHairFrizzle","LongHairPonyTail","LongHairBun","ShortHairShortWaved"]
const OUTFIT_MAP_M = ["Hoodie","BlazerShirt","ShirtCrewNeck","BlazerAndSweater","GraphicShirt","ShirtVNeck","BlazerAndSweater"]
const OUTFIT_MAP_F = ["Hoodie","Overall","ShirtCrewNeck","BlazerAndSweater","GraphicShirt","ShirtVNeck","BlazerAndSweater"]
const OUTFIT_COLORS_MAP = ["Blue","PastelPink","Heather","PastelRed","ShirtGraphic","Pastel01","Pastel02"]
const ACCESSORY_MAP = ["Blank","Sunglasses","Prescription02","Blank","Blank","Eyepatch","Round","Blank"]
const FACEHAIR_MAP_M = ["Blank","Blank","Blank","Blank","Blank","Blank","Blank"]

function buildUrl(cfg: AvatarConfig, seed: string = "DrunkRace"): string {
  const F = cfg.sex === "F"
  const params = new URLSearchParams({
    seed,
    skinColor: SKIN_MAP[cfg.skinTone] || "light",
    hairColor: HAIR_MAP[cfg.hairColor] || "Black",
    top: (F ? HAIR_STYLE_F : HAIR_STYLE_M)[cfg.hairStyle] || "ShortHairShortFlat",
    clothesType: (F ? OUTFIT_MAP_F : OUTFIT_MAP_M)[cfg.outfit] || "Hoodie",
    clothesColor: OUTFIT_COLORS_MAP[cfg.outfitColor] || "Blue",
    accessories: ACCESSORY_MAP[cfg.accessory] || "Blank",
    facialHair: "Blank",
    eyes: "Default",
    eyebrow: "Default",
    mouth: "Smile",
    backgroundColor: "transparent",
  })
  return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`
}

// BAC visual overlay as SVG
function BacOverlay({ bac, size }: { bac: number, size: number }) {
  if (bac < 0.3) return null
  const cheekOp = Math.min(0.7, (bac - 0.3) * 0.8)
  const sweat = bac > 0.8
  const stars = bac > 1.2
  const zzz = bac > 1.8

  return (
    <svg
      width={size} height={size}
      viewBox="0 0 264 280"
      style={{ position:"absolute", top:0, left:0, pointerEvents:"none" }}
    >
      {/* Cheeks */}
      {cheekOp > 0.05 && <>
        <ellipse cx="68" cy="160" rx="28" ry="18" fill="#ff9cb4" opacity={cheekOp}/>
        <ellipse cx="196" cy="160" rx="28" ry="18" fill="#ff9cb4" opacity={cheekOp}/>
      </>}
      {/* Sweat drop */}
      {sweat && <ellipse cx="218" cy="90" rx="8" ry="14" fill="#60a5fa" opacity="0.8"/>}
      {/* Stars */}
      {stars && <>
        <text x="10" y="60" fontSize="26">⭐</text>
        <text x="210" y="50" fontSize="20">✨</text>
      </>}
      {/* ZZZ */}
      {zzz && <>
        <text x="205" y="30" fontSize="18" fill="#60a5fa">z</text>
        <text x="218" y="16" fontSize="22" fill="#60a5fa" opacity="0.7">z</text>
      </>}
    </svg>
  )
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
  // Use config values as seed for deterministic avatar
  const seed = `${config.sex}${config.skinTone}${config.hairColor}${config.hairStyle}${config.outfit}${config.outfitColor}${config.accessory}`
  const url = buildUrl(config, seed)

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
      <div ref={containerRef} style={{ transformOrigin:"center 75%", willChange:"transform", position:"relative", width:size, height:size }}>
        <img
          src={url}
          width={size}
          height={size}
          style={{ display:"block", objectFit:"contain" }}
          alt="avatar"
          // Fallback si l'image charge pas
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <BacOverlay bac={bac} size={size}/>
      </div>
    </div>
  )
}

// Export pour renderAvatarSVG compat (utilisé ailleurs)
export function renderAvatarSVG(cfg: AvatarConfig, bac = 0): string {
  return `<image href="${buildUrl(cfg)}" width="100" height="100"/>`
}
