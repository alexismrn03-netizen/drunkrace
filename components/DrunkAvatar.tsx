"use client"
import { useEffect, useRef } from "react"

// SVG avatars top-down view
const AVATAR_DESIGNS = [
  // Wolf 🐺
  (color: string) => `
    <circle cx="50" cy="50" r="38" fill="${color}22" stroke="${color}" stroke-width="2"/>
    <ellipse cx="50" cy="42" rx="22" ry="20" fill="${color}"/>
    <ellipse cx="36" cy="28" rx="9" ry="12" fill="${color}" transform="rotate(-15 36 28)"/>
    <ellipse cx="64" cy="28" rx="9" ry="12" fill="${color}" transform="rotate(15 64 28)"/>
    <ellipse cx="36" cy="27" rx="5" ry="7" fill="#ec4899" transform="rotate(-15 36 27)"/>
    <ellipse cx="64" cy="27" rx="5" ry="7" fill="#ec4899" transform="rotate(15 64 27)"/>
    <circle cx="43" cy="40" r="4" fill="#1a1a2e"/>
    <circle cx="57" cy="40" r="4" fill="#1a1a2e"/>
    <circle cx="44" cy="39" r="1.5" fill="white"/>
    <circle cx="58" cy="39" r="1.5" fill="white"/>
    <ellipse cx="50" cy="47" rx="7" ry="5" fill="${color}dd"/>
    <circle cx="50" cy="48" r="3" fill="#1a1a2e88"/>
    <ellipse cx="50" cy="68" rx="12" ry="8" fill="${color}"/>
    <ellipse cx="32" cy="62" rx="8" ry="5" fill="${color}" transform="rotate(20 32 62)"/>
    <ellipse cx="68" cy="62" rx="8" ry="5" fill="${color}" transform="rotate(-20 68 62)"/>
  `,
  // Fox 🦊  
  (color: string) => `
    <circle cx="50" cy="50" r="38" fill="${color}22" stroke="${color}" stroke-width="2"/>
    <ellipse cx="50" cy="44" rx="20" ry="18" fill="${color}"/>
    <polygon points="38,18 30,38 46,32" fill="${color}"/>
    <polygon points="62,18 70,38 54,32" fill="${color}"/>
    <polygon points="40,20 33,36 47,32" fill="#fbbf24"/>
    <polygon points="60,20 67,36 53,32" fill="#fbbf24"/>
    <ellipse cx="50" cy="48" rx="14" ry="12" fill="#fef3c7"/>
    <circle cx="44" cy="41" r="4" fill="#1a1a2e"/>
    <circle cx="56" cy="41" r="4" fill="#1a1a2e"/>
    <circle cx="45" cy="40" r="1.5" fill="white"/>
    <circle cx="57" cy="40" r="1.5" fill="white"/>
    <ellipse cx="50" cy="48" rx="5" ry="4" fill="#f87171"/>
    <ellipse cx="50" cy="68" rx="10" ry="7" fill="${color}"/>
    <ellipse cx="33" cy="63" rx="7" ry="4" fill="${color}" transform="rotate(25 33 63)"/>
    <ellipse cx="67" cy="63" rx="7" ry="4" fill="${color}" transform="rotate(-25 67 63)"/>
  `,
  // Cat 🐱
  (color: string) => `
    <circle cx="50" cy="50" r="38" fill="${color}22" stroke="${color}" stroke-width="2"/>
    <ellipse cx="50" cy="46" rx="20" ry="19" fill="${color}"/>
    <polygon points="33,22 27,40 42,35" fill="${color}"/>
    <polygon points="67,22 73,40 58,35" fill="${color}"/>
    <ellipse cx="44" cy="41" rx="5" ry="6" fill="#1a1a2e"/>
    <ellipse cx="56" cy="41" rx="5" ry="6" fill="#1a1a2e"/>
    <ellipse cx="44" cy="41" rx="2" ry="5" fill="#f59e0b"/>
    <ellipse cx="56" cy="41" rx="2" ry="5" fill="#f59e0b"/>
    <circle cx="44" cy="41" r="1" fill="#1a1a2e"/>
    <circle cx="56" cy="41" r="1" fill="#1a1a2e"/>
    <ellipse cx="50" cy="50" rx="6" ry="4" fill="#fda4af"/>
    <line x1="35" y1="48" x2="25" y2="45" stroke="${color}88" stroke-width="1.5"/>
    <line x1="35" y1="50" x2="24" y2="50" stroke="${color}88" stroke-width="1.5"/>
    <line x1="65" y1="48" x2="75" y2="45" stroke="${color}88" stroke-width="1.5"/>
    <line x1="65" y1="50" x2="76" y2="50" stroke="${color}88" stroke-width="1.5"/>
    <ellipse cx="50" cy="67" rx="9" ry="6" fill="${color}"/>
    <ellipse cx="34" cy="62" rx="6" ry="4" fill="${color}" transform="rotate(20 34 62)"/>
    <ellipse cx="66" cy="62" rx="6" ry="4" fill="${color}" transform="rotate(-20 66 62)"/>
  `,
  // Bear 🐻
  (color: string) => `
    <circle cx="50" cy="50" r="38" fill="${color}22" stroke="${color}" stroke-width="2"/>
    <ellipse cx="50" cy="47" rx="24" ry="22" fill="${color}"/>
    <circle cx="35" cy="27" r="10" fill="${color}"/>
    <circle cx="65" cy="27" r="10" fill="${color}"/>
    <circle cx="35" cy="27" r="6" fill="${color}cc"/>
    <circle cx="65" cy="27" r="6" fill="${color}cc"/>
    <circle cx="43" cy="42" r="5" fill="#1a1a2e"/>
    <circle cx="57" cy="42" r="5" fill="#1a1a2e"/>
    <circle cx="44" cy="41" r="2" fill="white"/>
    <circle cx="58" cy="41" r="2" fill="white"/>
    <ellipse cx="50" cy="53" rx="10" ry="8" fill="${color}bb"/>
    <circle cx="50" cy="52" r="4" fill="#1a1a2e88"/>
    <ellipse cx="50" cy="69" rx="14" ry="9" fill="${color}"/>
    <ellipse cx="31" cy="63" rx="9" ry="6" fill="${color}" transform="rotate(15 31 63)"/>
    <ellipse cx="69" cy="63" rx="9" ry="6" fill="${color}" transform="rotate(-15 69 63)"/>
  `,
  // Panda 🐼
  (color: string) => `
    <circle cx="50" cy="50" r="38" fill="white" stroke="#e2e8f0" stroke-width="2"/>
    <ellipse cx="50" cy="46" rx="22" ry="21" fill="white"/>
    <circle cx="36" cy="26" r="10" fill="#1a1a2e"/>
    <circle cx="64" cy="26" r="10" fill="#1a1a2e"/>
    <ellipse cx="41" cy="41" rx="7" ry="6" fill="#1a1a2e"/>
    <ellipse cx="59" cy="41" rx="7" ry="6" fill="#1a1a2e"/>
    <circle cx="43" cy="41" r="3" fill="white"/>
    <circle cx="61" cy="41" r="3" fill="white"/>
    <circle cx="43" cy="41" r="1.5" fill="#1a1a2e"/>
    <circle cx="61" cy="41" r="1.5" fill="#1a1a2e"/>
    <ellipse cx="50" cy="51" rx="7" ry="5" fill="#f8f8f8"/>
    <circle cx="50" cy="52" r="3" fill="#1a1a2e55"/>
    <ellipse cx="50" cy="68" rx="13" ry="8" fill="#1a1a2e"/>
    <ellipse cx="32" cy="62" rx="8" ry="5" fill="#1a1a2e" transform="rotate(15 32 62)"/>
    <ellipse cx="68" cy="62" rx="8" ry="5" fill="#1a1a2e" transform="rotate(-15 68 62)"/>
  `,
  // Lion 🦁
  (color: string) => `
    <circle cx="50" cy="50" r="38" fill="${color}22" stroke="${color}" stroke-width="2"/>
    <circle cx="50" cy="46" r="26" fill="#d97706" opacity="0.4"/>
    <circle cx="50" cy="46" r="22" fill="#d97706" opacity="0.3"/>
    <ellipse cx="50" cy="46" rx="18" ry="17" fill="${color}"/>
    <circle cx="43" cy="41" r="4.5" fill="#1a1a2e"/>
    <circle cx="57" cy="41" r="4.5" fill="#1a1a2e"/>
    <circle cx="44" cy="40" r="1.5" fill="white"/>
    <circle cx="58" cy="40" r="1.5" fill="white"/>
    <ellipse cx="50" cy="50" rx="9" ry="7" fill="${color}bb"/>
    <circle cx="50" cy="50" r="4" fill="#1a1a2e55"/>
    <line x1="36" y1="49" x2="25" y2="46" stroke="#92400e88" stroke-width="1.5"/>
    <line x1="36" y1="51" x2="24" y2="51" stroke="#92400e88" stroke-width="1.5"/>
    <line x1="64" y1="49" x2="75" y2="46" stroke="#92400e88" stroke-width="1.5"/>
    <line x1="64" y1="51" x2="76" y2="51" stroke="#92400e88" stroke-width="1.5"/>
    <ellipse cx="50" cy="67" rx="12" ry="8" fill="${color}"/>
    <ellipse cx="33" cy="62" rx="8" ry="5" fill="${color}" transform="rotate(18 33 62)"/>
    <ellipse cx="67" cy="62" rx="8" ry="5" fill="${color}" transform="rotate(-18 67 62)"/>
  `,
  // Tiger 🐯
  (color: string) => `
    <circle cx="50" cy="50" r="38" fill="${color}22" stroke="${color}" stroke-width="2"/>
    <ellipse cx="50" cy="45" rx="22" ry="20" fill="${color}"/>
    <ellipse cx="36" cy="27" rx="9" ry="12" fill="${color}" transform="rotate(-10 36 27)"/>
    <ellipse cx="64" cy="27" rx="9" ry="12" fill="${color}" transform="rotate(10 64 27)"/>
    <line x1="38" y1="35" x2="32" y2="30" stroke="#92400e" stroke-width="2"/>
    <line x1="50" y1="33" x2="50" y2="26" stroke="#92400e" stroke-width="2"/>
    <line x1="62" y1="35" x2="68" y2="30" stroke="#92400e" stroke-width="2"/>
    <line x1="40" y1="55" x2="34" y2="52" stroke="#92400e" stroke-width="1.5"/>
    <line x1="40" y1="58" x2="33" y2="58" stroke="#92400e" stroke-width="1.5"/>
    <line x1="60" y1="55" x2="66" y2="52" stroke="#92400e" stroke-width="1.5"/>
    <line x1="60" y1="58" x2="67" y2="58" stroke="#92400e" stroke-width="1.5"/>
    <circle cx="43" cy="41" r="4.5" fill="#1a1a2e"/>
    <circle cx="57" cy="41" r="4.5" fill="#1a1a2e"/>
    <circle cx="44" cy="40" r="1.5" fill="white"/>
    <circle cx="58" cy="40" r="1.5" fill="white"/>
    <ellipse cx="50" cy="49" rx="8" ry="6" fill="#fef3c7"/>
    <ellipse cx="50" cy="67" rx="11" ry="7" fill="${color}"/>
    <ellipse cx="33" cy="62" rx="8" ry="5" fill="${color}" transform="rotate(20 33 62)"/>
    <ellipse cx="67" cy="62" rx="8" ry="5" fill="${color}" transform="rotate(-20 67 62)"/>
  `,
  // Butterfly 🦋
  (color: string) => `
    <circle cx="50" cy="50" r="38" fill="${color}22" stroke="${color}" stroke-width="2"/>
    <ellipse cx="50" cy="50" rx="4" ry="18" fill="#1a1a2e"/>
    <ellipse cx="34" cy="38" rx="16" ry="12" fill="${color}" transform="rotate(-20 34 38)"/>
    <ellipse cx="66" cy="38" rx="16" ry="12" fill="${color}" transform="rotate(20 66 38)"/>
    <ellipse cx="32" cy="60" rx="13" ry="10" fill="${color}cc" transform="rotate(15 32 60)"/>
    <ellipse cx="68" cy="60" rx="13" ry="10" fill="${color}cc" transform="rotate(-15 68 60)"/>
    <ellipse cx="34" cy="38" rx="8" ry="6" fill="white" opacity="0.3" transform="rotate(-20 34 38)"/>
    <ellipse cx="66" cy="38" rx="8" ry="6" fill="white" opacity="0.3" transform="rotate(20 66 38)"/>
    <circle cx="50" cy="36" r="4" fill="#1a1a2e"/>
    <line x1="50" y1="32" x2="45" y2="24" stroke="#1a1a2e" stroke-width="1.5"/>
    <line x1="50" y1="32" x2="55" y2="24" stroke="#1a1a2e" stroke-width="1.5"/>
  `,
  // Frog 🐸
  (color: string) => `
    <circle cx="50" cy="50" r="38" fill="${color}22" stroke="${color}" stroke-width="2"/>
    <ellipse cx="50" cy="52" rx="22" ry="20" fill="${color}"/>
    <circle cx="36" cy="32" r="12" fill="${color}"/>
    <circle cx="64" cy="32" r="12" fill="${color}"/>
    <circle cx="36" cy="30" r="7" fill="white"/>
    <circle cx="64" cy="30" r="7" fill="white"/>
    <circle cx="36" cy="30" r="4" fill="#1a1a2e"/>
    <circle cx="64" cy="30" r="4" fill="#1a1a2e"/>
    <circle cx="37" cy="29" r="1.5" fill="white"/>
    <circle cx="65" cy="29" r="1.5" fill="white"/>
    <ellipse cx="50" cy="57" rx="14" ry="10" fill="${color}bb"/>
    <path d="M 40 58 Q 50 65 60 58" stroke="#1a1a2e" stroke-width="2" fill="none"/>
    <ellipse cx="28" cy="68" rx="10" ry="6" fill="${color}" transform="rotate(10 28 68)"/>
    <ellipse cx="72" cy="68" rx="10" ry="6" fill="${color}" transform="rotate(-10 72 68)"/>
  `,
  // Koala 🐨
  (color: string) => `
    <circle cx="50" cy="50" r="38" fill="${color}22" stroke="${color}" stroke-width="2"/>
    <ellipse cx="50" cy="47" rx="22" ry="20" fill="${color}"/>
    <circle cx="30" cy="28" r="13" fill="${color}"/>
    <circle cx="70" cy="28" r="13" fill="${color}"/>
    <circle cx="30" cy="28" r="8" fill="${color}88"/>
    <circle cx="70" cy="28" r="8" fill="${color}88"/>
    <ellipse cx="50" cy="52" rx="14" ry="12" fill="${color}cc"/>
    <ellipse cx="50" cy="53" rx="9" ry="7" fill="#a3a3a3"/>
    <circle cx="43" cy="42" r="4.5" fill="#1a1a2e"/>
    <circle cx="57" cy="42" r="4.5" fill="#1a1a2e"/>
    <circle cx="44" cy="41" r="1.5" fill="white"/>
    <circle cx="58" cy="41" r="1.5" fill="white"/>
    <ellipse cx="50" cy="68" rx="13" ry="8" fill="${color}"/>
    <ellipse cx="32" cy="63" rx="8" ry="5" fill="${color}" transform="rotate(15 32 63)"/>
    <ellipse cx="68" cy="63" rx="8" ry="5" fill="${color}" transform="rotate(-15 68 63)"/>
  `,
  // Eagle 🦅
  (color: string) => `
    <circle cx="50" cy="50" r="38" fill="${color}22" stroke="${color}" stroke-width="2"/>
    <ellipse cx="50" cy="48" rx="16" ry="14" fill="#92400e"/>
    <ellipse cx="50" cy="38" rx="10" ry="9" fill="white"/>
    <circle cx="44" cy="36" r="4" fill="#1a1a2e"/>
    <circle cx="56" cy="36" r="4" fill="#1a1a2e"/>
    <circle cx="45" cy="35" r="1.5" fill="white"/>
    <circle cx="57" cy="35" r="1.5" fill="white"/>
    <polygon points="50,43 46,47 54,47" fill="#f59e0b"/>
    <ellipse cx="22" cy="52" rx="20" ry="8" fill="${color}" transform="rotate(-15 22 52)"/>
    <ellipse cx="78" cy="52" rx="20" ry="8" fill="${color}" transform="rotate(15 78 52)"/>
    <ellipse cx="50" cy="66" rx="10" ry="6" fill="#92400e"/>
    <polygon points="44,72 50,80 56,72" fill="#f59e0b"/>
  `,
  // Dolphin 🐬
  (color: string) => `
    <circle cx="50" cy="50" r="38" fill="${color}22" stroke="${color}" stroke-width="2"/>
    <ellipse cx="50" cy="50" rx="26" ry="16" fill="${color}"/>
    <ellipse cx="50" cy="44" rx="10" ry="8" fill="${color}dd"/>
    <ellipse cx="72" cy="50" rx="10" ry="6" fill="${color}"/>
    <ellipse cx="30" cy="50" rx="6" ry="4" fill="${color}dd"/>
    <circle cx="43" cy="43" r="3.5" fill="#1a1a2e"/>
    <circle cx="44" cy="42" r="1" fill="white"/>
    <ellipse cx="50" cy="58" rx="18" ry="6" fill="${color}cc"/>
    <ellipse cx="38" cy="65" rx="10" ry="5" fill="${color}" transform="rotate(-20 38 65)"/>
    <ellipse cx="62" cy="65" rx="10" ry="5" fill="${color}" transform="rotate(20 62 65)"/>
    <ellipse cx="50" cy="48" rx="16" ry="6" fill="white" opacity="0.25"/>
  `,
]

export const AVATAR_COUNT = AVATAR_DESIGNS.length

interface DrunkAvatarProps {
  avatarIndex: number
  color: string
  bac: number
  size?: number
  isMe?: boolean
}

export default function DrunkAvatar({ avatarIndex, color, bac, size = 60, isMe = false }: DrunkAvatarProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const frameRef = useRef<number>(0)
  const timeRef = useRef(0)

  useEffect(() => {
    if (!svgRef.current) return
    const svg = svgRef.current

    const animate = (ts: number) => {
      timeRef.current = ts
      if (!svgRef.current) return

      if (bac < 0.2) {
        // Sober: subtle breathing
        const s = 1 + Math.sin(ts / 1200) * 0.02
        svg.style.transform = `scale(${s})`
      } else if (bac < 0.5) {
        // Slightly drunk: slow sway
        const r = Math.sin(ts / 800) * 5
        svg.style.transform = `rotate(${r}deg)`
      } else if (bac < 0.8) {
        // Drunk: sway + slight wobble
        const r = Math.sin(ts / 600) * 10 + Math.sin(ts / 250) * 3
        const tx = Math.sin(ts / 700) * 3
        svg.style.transform = `rotate(${r}deg) translateX(${tx}px)`
      } else if (bac < 1.2) {
        // Very drunk: erratic movement
        const r = Math.sin(ts / 400) * 18 + Math.sin(ts / 150) * 6
        const tx = Math.sin(ts / 300) * 6
        const ty = Math.cos(ts / 350) * 4
        svg.style.transform = `rotate(${r}deg) translate(${tx}px, ${ty}px)`
      } else if (bac < 1.8) {
        // Wasted: chaotic spinning + stumbling
        const r = Math.sin(ts / 250) * 28 + Math.sin(ts / 90) * 10
        const tx = Math.sin(ts / 200) * 10
        const ty = Math.cos(ts / 180) * 8
        const s = 1 + Math.sin(ts / 300) * 0.08
        svg.style.transform = `rotate(${r}deg) translate(${tx}px, ${ty}px) scale(${s})`
      } else {
        // In the pipes: almost spinning, collapsing
        const r = (ts / 8) % 360
        const s = 0.85 + Math.sin(ts / 200) * 0.15
        svg.style.transform = `rotate(${r}deg) scale(${s})`
        svg.style.opacity = String(0.6 + Math.sin(ts / 400) * 0.4)
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [bac])

  const idx = Math.abs(avatarIndex) % AVATAR_DESIGNS.length
  const svgContent = AVATAR_DESIGNS[idx](color)

  // Drunk overlay effects
  const showStars = bac >= 1.2
  const showZzz = bac >= 1.8

  return (
    <div style={{
      position: "relative",
      width: size,
      height: size,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Glow for current user */}
      {isMe && (
        <div style={{
          position: "absolute", inset: -4,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color}40, transparent 70%)`,
          animation: "pulse 2s infinite",
        }}/>
      )}
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox="0 0 100 100"
        style={{
          transformOrigin: "center",
          transition: "opacity 0.3s",
          willChange: "transform",
        }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
      {/* Star effects when very drunk */}
      {showStars && (
        <div style={{ position:"absolute", top:-8, right:-8, fontSize:12, animation:"spin 1s linear infinite" }}>⭐</div>
      )}
      {showZzz && (
        <div style={{ position:"absolute", top:-12, left:-4, fontSize:10, animation:"float 1.5s ease-in-out infinite" }}>💤</div>
      )}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
      `}</style>
    </div>
  )
}
