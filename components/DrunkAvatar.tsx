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

export const SKIN_TONES    = ["#fde8d0","#f5cba7","#e8a87c","#c68642","#8d5524","#4a2912"]
export const HAIR_COLORS   = ["#1a0a00","#3d2314","#6b3a2a","#b5651d","#d4a017","#e8c547","#ec4899","#a855f7"]
export const OUTFIT_COLORS = ["#6366f1","#ec4899","#22c55e","#ef4444","#f59e0b","#0ea5e9"]
export const AVATAR_COUNT  = 7

function buildUrl(cfg: AvatarConfig): string {
  const params = new URLSearchParams({
    sex: cfg.sex,
    skin: String(cfg.skinTone),
    hair: String(cfg.hairStyle),
    color: String(cfg.outfitColor),
    acc: String(cfg.accessory),
  })
  return `/api/avatar?${params.toString()}`
}

export function renderAvatarSVG(_cfg: AvatarConfig, _bac = 0): string {
  return `<text x="40" y="60" font-size="40">🧑</text>`
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

  const cheekOp = Math.min(0.7, (bac - 0.3) * 0.8)

  return (
    <div style={{ position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
      {isMe && <div style={{ position:"absolute", inset:-4, borderRadius:"50%", background:`radial-gradient(circle, ${color||"#a855f7"}50, transparent 70%)`, pointerEvents:"none" }}/>}
      <div ref={containerRef} style={{ transformOrigin:"center 75%", willChange:"transform", position:"relative" }}>
        <img
          src={buildUrl(config)}
          width={size}
          height={size}
          style={{ display:"block", objectFit:"contain" }}
          alt="avatar"
        />
        {/* BAC overlays */}
        {bac > 0.3 && (
          <svg width={size} height={size} viewBox="0 0 200 200"
            style={{ position:"absolute", top:0, left:0, pointerEvents:"none" }}>
            {cheekOp > 0.05 && <>
              <ellipse cx="55" cy="120" rx="22" ry="14" fill="#ff9cb4" opacity={cheekOp}/>
              <ellipse cx="145" cy="120" rx="22" ry="14" fill="#ff9cb4" opacity={cheekOp}/>
            </>}
            {bac > 0.8 && <ellipse cx="168" cy="50" rx="7" ry="12" fill="#60a5fa" opacity="0.8"/>}
            {bac > 1.2 && <>
              <text x="5" y="35" fontSize="22">⭐</text>
              <text x="155" y="30" fontSize="16">✨</text>
            </>}
            {bac > 1.8 && <>
              <text x="158" y="18" fontSize="14" fill="#60a5fa">z</text>
              <text x="172" y="6" fontSize="18" fill="#60a5fa" opacity="0.7">z</text>
            </>}
          </svg>
        )}
      </div>
    </div>
  )
}
