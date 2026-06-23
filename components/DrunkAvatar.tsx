"use client"
import { useEffect, useRef } from "react"

interface AvatarDesign {
  name: string
  skin: string
  hair: string
  hairStyle: string
  accessory: string
  shirtColor: string
  pantColor: string
}

const AVATAR_DESIGNS: AvatarDesign[] = [
  { name:"Cool",    skin:"#FDBCB4", hair:"#3D2314", hairStyle:"cool",    accessory:"sunglasses", shirtColor:"#6366f1", pantColor:"#1e1e2e" },
  { name:"Fête",    skin:"#F5CBA7", hair:"#E91E63", hairStyle:"long",    accessory:"none",       shirtColor:"#ec4899", pantColor:"#7c3aed" },
  { name:"Nerd",    skin:"#FDBCB4", hair:"#4A3728", hairStyle:"side",    accessory:"glasses",    shirtColor:"#22c55e", pantColor:"#1e40af" },
  { name:"Gros",    skin:"#C68642", hair:"#1a1a1a", hairStyle:"short",   accessory:"none",       shirtColor:"#ef4444", pantColor:"#374151" },
  { name:"Chic",    skin:"#F1C27D", hair:"#B5651D", hairStyle:"bun",     accessory:"none",       shirtColor:"#f59e0b", pantColor:"#78350f" },
  { name:"Punk",    skin:"#FDBCB4", hair:"#a855f7", hairStyle:"mohawk",  accessory:"none",       shirtColor:"#1a1a2e", pantColor:"#1a1a2e" },
  { name:"Sport",   skin:"#8D5524", hair:"#1a1a1a", hairStyle:"short",   accessory:"none",       shirtColor:"#38bdf8", pantColor:"#0c4a6e" },
  { name:"Mystère", skin:"#F5CBA7", hair:"#1a1a1a", hairStyle:"long",    accessory:"none",       shirtColor:"#0f0f1a", pantColor:"#3b1f6a" },
  { name:"Rockeur", skin:"#FDBCB4", hair:"#1a1a1a", hairStyle:"cool",    accessory:"none",       shirtColor:"#1a1a1a", pantColor:"#1a1a1a" },
  { name:"Soleil",  skin:"#F5CBA7", hair:"#f59e0b", hairStyle:"bun",     accessory:"none",       shirtColor:"#fbbf24", pantColor:"#92400e" },
  { name:"Ninja",   skin:"#C68642", hair:"#1a1a1a", hairStyle:"short",   accessory:"none",       shirtColor:"#0f0f1a", pantColor:"#0f0f1a" },
  { name:"DJ",      skin:"#8D5524", hair:"#a855f7", hairStyle:"mohawk",  accessory:"sunglasses", shirtColor:"#ec4899", pantColor:"#1a1a2e" },
]

export const AVATAR_COUNT = AVATAR_DESIGNS.length

function lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#',''), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount))
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount))
  return '#' + ((r<<16)|(g<<8)|b).toString(16).padStart(6,'0')
}

interface Props {
  avatarIndex: number
  bac: number
  size?: number
  animate?: boolean
  isMe?: boolean
  color?: string
}

export default function DrunkAvatar({ avatarIndex, bac, size = 80, animate = true, isMe = false, color }: Props) {
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

  const idx = Math.abs(Math.round(avatarIndex)) % AVATAR_DESIGNS.length
  const d = AVATAR_DESIGNS[idx]
  const eyeOpen = bac < 1.5 ? 1 : Math.max(0.15, 1-(bac-1.5)*0.9)
  const cheekOp = Math.min(0.6, bac*1.2)
  const mouthD = bac < 0.3 ? "M30,70 Q40,76 50,70" : bac < 1.5 ? "M30,68 Q40,80 50,68" : "M30,73 Q40,66 50,73"
  const sweat = bac > 0.8
  const sc = size/130

  return (
    <div style={{ position:"relative", display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
      {isMe && (
        <div style={{ position:"absolute", inset:-4, borderRadius:"50%", background:`radial-gradient(circle, ${color||"#a855f7"}50, transparent 70%)`, pointerEvents:"none" }}/>
      )}
      <div ref={containerRef} style={{ transformOrigin:"center 85%", willChange:"transform" }}>
        <svg width={size} height={size*1.15} viewBox="0 0 100 120" overflow="visible">
          <defs>
            <radialGradient id={`sk${idx}`} cx="45%" cy="35%" r="65%">
              <stop offset="0%" stopColor={lighten(d.skin,25)}/>
              <stop offset="100%" stopColor={d.skin}/>
            </radialGradient>
            <radialGradient id={`ey${idx}`} cx="30%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#6ab0ff"/>
              <stop offset="100%" stopColor="#1a4aaa"/>
            </radialGradient>
          </defs>

          {/* Shadow */}
          <ellipse cx="50" cy="118" rx="22" ry="4" fill="rgba(0,0,0,0.25)"/>

          {/* Legs */}
          <rect x="33" y="88" width="13" height="24" rx="6" fill={d.pantColor}/>
          <rect x="54" y="88" width="13" height="24" rx="6" fill={d.pantColor}/>
          <ellipse cx="39" cy="113" rx="9" ry="4" fill="#111"/>
          <ellipse cx="61" cy="113" rx="9" ry="4" fill="#111"/>

          {/* Body */}
          <rect x="25" y="62" width="50" height="32" rx="13" fill={d.shirtColor}/>
          <polygon points="43,62 50,74 57,62" fill="white" opacity="0.7"/>
          {/* Arms */}
          <ellipse cx="17" cy="76" rx="9" ry="7" fill={d.shirtColor} transform="rotate(18 17 76)"/>
          <ellipse cx="83" cy="76" rx="9" ry="7" fill={d.shirtColor} transform="rotate(-18 83 76)"/>
          <circle cx="11" cy="84" r="6" fill={`url(#sk${idx})`}/>
          <circle cx="89" cy="84" r="6" fill={`url(#sk${idx})`}/>

          {/* Neck */}
          <rect x="43" y="52" width="14" height="13" rx="5" fill={`url(#sk${idx})`}/>

          {/* Head */}
          <ellipse cx="50" cy="34" rx="30" ry="32" fill={`url(#sk${idx})`}/>
          <ellipse cx="20" cy="36" rx="7" ry="9" fill={d.skin}/>
          <ellipse cx="80" cy="36" rx="7" ry="9" fill={d.skin}/>
          <ellipse cx="20" cy="36" rx="4.5" ry="6" fill={lighten(d.skin,-12)}/>
          <ellipse cx="80" cy="36" rx="4.5" ry="6" fill={lighten(d.skin,-12)}/>

          {/* Hair */}
          {d.hairStyle==="cool" && <>
            <ellipse cx="50" cy="9" rx="28" ry="12" fill={d.hair}/>
            <ellipse cx="50" cy="13" rx="30" ry="11" fill={d.hair}/>
            <ellipse cx="22" cy="24" rx="9" ry="16" fill={d.hair}/>
            <ellipse cx="78" cy="24" rx="9" ry="16" fill={d.hair}/>
          </>}
          {d.hairStyle==="short" && <>
            <ellipse cx="50" cy="10" rx="28" ry="11" fill={d.hair}/>
            <rect x="21" y="11" width="58" height="13" fill={d.hair}/>
          </>}
          {d.hairStyle==="long" && <>
            <ellipse cx="50" cy="8" rx="30" ry="13" fill={d.hair}/>
            <rect x="19" y="12" width="11" height="42" rx="5" fill={d.hair}/>
            <rect x="70" y="12" width="11" height="42" rx="5" fill={d.hair}/>
          </>}
          {d.hairStyle==="bun" && <>
            <ellipse cx="50" cy="10" rx="27" ry="11" fill={d.hair}/>
            <circle cx="50" cy="4" r="9" fill={d.hair}/>
          </>}
          {d.hairStyle==="side" && <>
            <ellipse cx="50" cy="10" rx="28" ry="11" fill={d.hair}/>
            <rect x="21" y="11" width="53" height="13" fill={d.hair}/>
            <ellipse cx="25" cy="22" rx="7" ry="11" fill={d.hair}/>
          </>}
          {d.hairStyle==="mohawk" && <>
            <rect x="43" y="0" width="14" height="26" rx="7" fill={d.hair}/>
            <rect x="19" y="12" width="13" height="7" rx="3" fill={d.hair}/>
            <rect x="68" y="12" width="13" height="7" rx="3" fill={d.hair}/>
          </>}

          {/* Eyes */}
          <g transform={`scale(1,${eyeOpen}) translate(0,${(1-eyeOpen)*32})`}>
            <circle cx="36" cy="32" r="8" fill="white"/>
            <circle cx="36" cy="32" r="5.5" fill={`url(#ey${idx})`}/>
            <circle cx="36" cy="32" r="3" fill="#060612"/>
            <circle cx="37.5" cy="30.5" r="1.3" fill="white"/>
            <circle cx="64" cy="32" r="8" fill="white"/>
            <circle cx="64" cy="32" r="5.5" fill={`url(#ey${idx})`}/>
            <circle cx="64" cy="32" r="3" fill="#060612"/>
            <circle cx="65.5" cy="30.5" r="1.3" fill="white"/>
          </g>
          {/* Eyelids drunk */}
          {bac>0.8 && <ellipse cx="36" cy="29" rx="8" ry={3.5*(bac-0.8)} fill={d.skin}/>}
          {bac>0.8 && <ellipse cx="64" cy="29" rx="8" ry={3.5*(bac-0.8)} fill={d.skin}/>}

          {/* Brows */}
          <path d={bac<0.8?"M28,22 Q36,18 44,22":"M28,25 Q36,21 44,25"} stroke={d.hair} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <path d={bac<0.8?"M56,22 Q64,18 72,22":"M56,25 Q64,21 72,25"} stroke={d.hair} strokeWidth="2.5" fill="none" strokeLinecap="round"/>

          {/* Nose */}
          <ellipse cx="50" cy="43" rx="4.5" ry="3.5" fill={lighten(d.skin,-14)}/>

          {/* Cheeks */}
          {cheekOp>0.05 && <>
            <ellipse cx="24" cy="44" rx="8" ry="5.5" fill="#ff6b9d" opacity={cheekOp}/>
            <ellipse cx="76" cy="44" rx="8" ry="5.5" fill="#ff6b9d" opacity={cheekOp}/>
          </>}

          {/* Mouth */}
          <path d={mouthD} stroke="#c0392b" strokeWidth="2" fill={bac>0.5?"#ff8888":"none"} strokeLinecap="round"/>

          {/* Accessories */}
          {d.accessory==="sunglasses" && <>
            <rect x="27" y="27" width="17" height="11" rx="5.5" fill="#1a1a1a" opacity="0.92"/>
            <rect x="56" y="27" width="17" height="11" rx="5.5" fill="#1a1a1a" opacity="0.92"/>
            <line x1="44" y1="32" x2="56" y2="32" stroke="#1a1a1a" strokeWidth="2"/>
            <rect x="28" y="28" width="15" height="9" rx="4.5" fill="#6366f1" opacity="0.65"/>
            <rect x="57" y="28" width="15" height="9" rx="4.5" fill="#6366f1" opacity="0.65"/>
          </>}
          {d.accessory==="glasses" && <>
            <circle cx="36" cy="32" r="9" fill="none" stroke="#92400e" strokeWidth="2"/>
            <circle cx="64" cy="32" r="9" fill="none" stroke="#92400e" strokeWidth="2"/>
            <line x1="45" y1="32" x2="55" y2="32" stroke="#92400e" strokeWidth="2"/>
            <line x1="19" y1="32" x2="27" y2="32" stroke="#92400e" strokeWidth="2"/>
            <line x1="73" y1="32" x2="81" y2="32" stroke="#92400e" strokeWidth="2"/>
          </>}

          {/* Sweat */}
          {sweat && <ellipse cx="76" cy="18" rx="2.5" ry="5" fill="#60a5fa" opacity="0.8"/>}

          {/* Stars */}
          {bac>1.2 && <>
            <text x="4" y="14" fontSize="11">⭐</text>
            <text x="76" y="14" fontSize="9">✨</text>
          </>}
          {/* Zzz */}
          {bac>1.8 && <>
            <text x="70" y="10" fontSize="7" fill="#60a5fa">z</text>
            <text x="76" y="4" fontSize="9" fill="#60a5fa" opacity="0.8">z</text>
            <text x="82" y="-2" fontSize="11" fill="#60a5fa" opacity="0.6">Z</text>
          </>}
        </svg>
      </div>
    </div>
  )
}
