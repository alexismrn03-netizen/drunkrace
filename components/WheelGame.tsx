"use client"
import { useState, useRef, useEffect } from "react"

interface Challenge {
  id: string
  label: string
  emoji: string
  color: string
  type: "drink" | "distance" | "social"
  delta?: number
  needsTarget?: boolean
}

const CHALLENGES: Challenge[] = [
  { id:"shot",       label:"Boire un shot !",              emoji:"🥃", color:"#ef4444", type:"drink" },
  { id:"culsec",     label:"Cul sec !",                    emoji:"🍺", color:"#f97316", type:"drink" },
  { id:"finir",      label:"Finir son verre !",            emoji:"🍷", color:"#ec4899", type:"drink" },
  { id:"distribuer", label:"Distribue 5 gorgées",          emoji:"✋", color:"#a855f7", type:"social", needsTarget:true },
  { id:"designer",   label:"Désigne quelqu'un",            emoji:"👆", color:"#8b5cf6", type:"social", needsTarget:true },
  { id:"toutlemonde",label:"Tout le monde boit !",         emoji:"🎉", color:"#06b6d4", type:"social" },
  { id:"plus10",     label:"+10m sur la piste !",          emoji:"🚀", color:"#4ade80", type:"distance", delta: 10 },
  { id:"moins10",    label:"−10m sur la piste !",          emoji:"💀", color:"#f87171", type:"distance", delta: -10 },
  { id:"moins50",    label:"−50m !!!",                     emoji:"☠️", color:"#7f1d1d", type:"distance", delta: -50, needsTarget:true },
]

// 2x each normal challenge (interleaved so same never adjacent) + 1x -50m
// Interleave: [1,2,3,4,5,6,7,8, 1,2,3,4,5,6,7,8] → shuffle each half then interleave
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
function interleave<T>(arr: T[]): T[] {
  // Split in half, shuffle each, interleave so same index never adjacent
  const half = Math.floor(arr.length / 2)
  const a = shuffleArray(arr.slice(0, half))
  const b = shuffleArray(arr.slice(half))
  const result: T[] = []
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) result.push(a[i])
    if (i < b.length) result.push(b[i])
  }
  return result
}
const BASE = CHALLENGES.slice(0, 8).map(c => ({ ...c }))
const INTERLEAVED = interleave([...BASE, ...BASE.map(c => ({ ...c }))])
// Insert -50m at position ~middle so it's surrounded by different ones
const insertIdx = Math.floor(INTERLEAVED.length / 2)
const WHEEL_ITEMS: Challenge[] = [
  ...INTERLEAVED.slice(0, insertIdx),
  CHALLENGES[8],
  ...INTERLEAVED.slice(insertIdx),
]

interface Props {
  members: any[]
  myUserId: string
  onAwardDistance: (userId: string, delta: number) => void
  onClose: () => void
}

export default function WheelGame({ members, myUserId, onAwardDistance, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const spinRef = useRef<number>(0)
  const angleRef = useRef<number>(0)
  const velRef = useRef<number>(0)
  const frameRef = useRef<number>(0)
  const isSpinningRef = useRef(false)

  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<Challenge | null>(null)
  const [targetPlayer, setTargetPlayer] = useState<any>(null)
  const [showDesignate, setShowDesignate] = useState(false)
  const [spun, setSpun] = useState(false)

  const SIZE = 300
  const cx = SIZE / 2
  const cy = SIZE / 2
  const R = cx - 8
  const N = WHEEL_ITEMS.length
  // Normal segments get 1 unit, -50m gets 1/3 unit
  const WEIGHTS = WHEEL_ITEMS.map(item => item.id === "moins50" ? 1/3 : 1)
  const TOTAL_WEIGHT = WEIGHTS.reduce((s, w) => s + w, 0)
  // Precompute start angles for each segment
  const SEGMENT_ANGLES: number[] = []
  const SEGMENT_SIZES: number[] = []
  let acc = 0
  WHEEL_ITEMS.forEach((_, i) => {
    SEGMENT_ANGLES.push(acc)
    const size = (WEIGHTS[i] / TOTAL_WEIGHT) * 2 * Math.PI
    SEGMENT_SIZES.push(size)
    acc += size
  })
  const slice = (2 * Math.PI) / N // kept for compat

  const drawWheelIcon = (ctx: CanvasRenderingContext2D, id: string, color: string, s: number) => {
    ctx.save()
    ctx.shadowColor = "#fff"
    ctx.shadowBlur = s * 0.3
    switch(id) {
      case "shot": {
        // Simple shot glass silhouette
        ctx.strokeStyle = color; ctx.lineWidth = s*0.15; ctx.lineCap = "round"
        ctx.beginPath()
        ctx.moveTo(-s*0.4, -s*0.6)
        ctx.lineTo(-s*0.5, s*0.5)
        ctx.lineTo(s*0.5, s*0.5)
        ctx.lineTo(s*0.4, -s*0.6)
        ctx.closePath()
        ctx.strokeStyle = color; ctx.stroke()
        ctx.fillStyle = color + "66"; ctx.fill()
        // Liquid
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(-s*0.25, s*0.0)
        ctx.lineTo(-s*0.45, s*0.5)
        ctx.lineTo(s*0.45, s*0.5)
        ctx.lineTo(s*0.25, s*0.0)
        ctx.closePath()
        ctx.fill()
        break
      }
      case "culsec": {
        // Upside down glass + drops
        ctx.strokeStyle = color; ctx.lineWidth = s*0.12
        ctx.beginPath()
        ctx.moveTo(-s*0.4, -s*0.5)
        ctx.lineTo(-s*0.5, s*0.3)
        ctx.lineTo(s*0.5, s*0.3)
        ctx.lineTo(s*0.4, -s*0.5)
        ctx.closePath()
        ctx.stroke()
        ctx.fillStyle = color + "22"; ctx.fill()
        // Arrow down
        ctx.strokeStyle = color; ctx.lineWidth = s*0.18
        ctx.beginPath(); ctx.moveTo(0, s*0.35); ctx.lineTo(0, s*0.75); ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(-s*0.25, s*0.55); ctx.lineTo(0, s*0.78); ctx.lineTo(s*0.25, s*0.55)
        ctx.strokeStyle = color; ctx.lineWidth = s*0.16; ctx.lineJoin = "round"; ctx.stroke()
        break
      }
      case "finir": {
        // Wine glass full
        ctx.strokeStyle = color; ctx.lineWidth = s*0.12
        ctx.beginPath()
        ctx.moveTo(-s*0.45, -s*0.6)
        ctx.bezierCurveTo(-s*0.55, s*0.1, -s*0.28, s*0.3, 0, s*0.3)
        ctx.bezierCurveTo(s*0.28, s*0.3, s*0.55, s*0.1, s*0.45, -s*0.6)
        ctx.closePath()
        ctx.stroke()
        ctx.fillStyle = color + "55"; ctx.fill()
        // Full liquid
        ctx.fillStyle = color + "cc"
        ctx.beginPath()
        ctx.moveTo(-s*0.35, -s*0.15)
        ctx.bezierCurveTo(-s*0.45, s*0.12, -s*0.24, s*0.3, 0, s*0.3)
        ctx.bezierCurveTo(s*0.24, s*0.3, s*0.45, s*0.12, s*0.35, -s*0.15)
        ctx.closePath()
        ctx.fill()
        // Stem
        ctx.beginPath(); ctx.moveTo(0, s*0.3); ctx.lineTo(0, s*0.65)
        ctx.strokeStyle = color; ctx.lineWidth = s*0.1; ctx.stroke()
        // Base
        ctx.beginPath(); ctx.ellipse(0, s*0.65, s*0.35, s*0.1, 0, 0, Math.PI*2)
        ctx.fillStyle = color + "88"; ctx.fill()
        break
      }
      case "distribuer": {
        // Neon hand ✋ style
        const hw = s * 0.18
        // Palm
        ctx.fillStyle = color + "33"
        ctx.strokeStyle = color; ctx.lineWidth = s*0.1; ctx.lineCap = "round"; ctx.lineJoin = "round"
        ctx.beginPath()
        ctx.ellipse(0, s*0.25, s*0.42, s*0.32, 0, 0, Math.PI*2)
        ctx.fill()
        // Neon glow effect on palm
        ctx.shadowColor = color; ctx.shadowBlur = s*0.5
        ctx.strokeStyle = color; ctx.lineWidth = s*0.08
        ctx.beginPath()
        ctx.ellipse(0, s*0.25, s*0.38, s*0.28, 0, 0, Math.PI*2)
        ctx.stroke()
        // 5 fingers as neon lines
        const fingers = [
          [-s*0.35, -s*0.55, s*0.06],
          [-s*0.17, -s*0.68, s*0.06],
          [0, -s*0.72, s*0.06],
          [s*0.17, -s*0.65, s*0.06],
          [s*0.33, -s*0.48, s*0.06],
        ]
        fingers.forEach(([fx, fy, fw]) => {
          ctx.strokeStyle = color; ctx.lineWidth = s*0.12
          ctx.beginPath()
          ctx.moveTo(fx, s*0.05)
          ctx.lineTo(fx, fy)
          ctx.stroke()
          // Fingertip dot
          ctx.fillStyle = color
          ctx.beginPath(); ctx.arc(fx, fy, s*0.07, 0, Math.PI*2); ctx.fill()
        })
        break
      }
      case "designer": {
        // Target + arrow
        ;[s*0.55, s*0.38, s*0.2].forEach((r, i) => {
          ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2)
          ctx.strokeStyle = i===2 ? color : color + (i===0?"44":"88")
          ctx.lineWidth = s*0.09; ctx.stroke()
        })
        ctx.fillStyle = color
        ctx.beginPath(); ctx.arc(0, 0, s*0.12, 0, Math.PI*2); ctx.fill()
        // Arrow from top-left
        ctx.strokeStyle = "#fff"; ctx.lineWidth = s*0.1; ctx.lineCap = "round"
        ctx.beginPath(); ctx.moveTo(-s*0.65, -s*0.65); ctx.lineTo(-s*0.15, -s*0.15); ctx.stroke()
        ctx.fillStyle = "#fff"
        ctx.beginPath()
        ctx.moveTo(-s*0.1, -s*0.1)
        ctx.lineTo(-s*0.45, -s*0.22)
        ctx.lineTo(-s*0.22, -s*0.45)
        ctx.closePath(); ctx.fill()
        break
      }
      case "toutlemonde": {
        // Multiple figures around a central cup
        const poses = [[-s*0.5,-s*0.2],[s*0.5,-s*0.2],[-s*0.3,-s*0.6],[s*0.3,-s*0.6]]
        poses.forEach(([px,py]) => {
          // Head
          ctx.fillStyle = color + "cc"
          ctx.beginPath(); ctx.arc(px, py, s*0.14, 0, Math.PI*2); ctx.fill()
          // Body line
          ctx.strokeStyle = color + "cc"; ctx.lineWidth = s*0.08
          ctx.beginPath(); ctx.moveTo(px, py+s*0.14); ctx.lineTo(px, py+s*0.38); ctx.stroke()
          // Arrow to center
          ctx.strokeStyle = color + "66"; ctx.lineWidth = s*0.06
          const angle = Math.atan2(-py, -px)
          ctx.beginPath()
          ctx.moveTo(px + Math.cos(angle)*s*0.22, py + Math.sin(angle)*s*0.22)
          ctx.lineTo(px + Math.cos(angle)*s*0.48, py + Math.sin(angle)*s*0.48)
          ctx.stroke()
        })
        // Central cup
        ctx.strokeStyle = color; ctx.lineWidth = s*0.1; ctx.fillStyle = color + "44"
        ctx.beginPath()
        ctx.moveTo(-s*0.22, -s*0.28); ctx.lineTo(-s*0.28, s*0.18)
        ctx.lineTo(s*0.28, s*0.18); ctx.lineTo(s*0.22, -s*0.28); ctx.closePath()
        ctx.fill(); ctx.stroke()
        // Foam top
        ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.8
        ctx.beginPath(); ctx.ellipse(0, -s*0.28, s*0.22, s*0.08, 0, 0, Math.PI*2); ctx.fill()
        ctx.globalAlpha = 1
        break
      }
      case "plus10": {
        // Bold up arrow neon
        ctx.shadowColor = color; ctx.shadowBlur = s*0.6
        ctx.fillStyle = color; ctx.strokeStyle = "#fff"; ctx.lineWidth = s*0.05
        // Arrow shape
        ctx.beginPath()
        ctx.moveTo(0, -s*0.8)
        ctx.lineTo(s*0.45, -s*0.15)
        ctx.lineTo(s*0.22, -s*0.15)
        ctx.lineTo(s*0.22, s*0.5)
        ctx.lineTo(-s*0.22, s*0.5)
        ctx.lineTo(-s*0.22, -s*0.15)
        ctx.lineTo(-s*0.45, -s*0.15)
        ctx.closePath()
        ctx.fill(); ctx.stroke()
        // +10 text
        ctx.shadowBlur = 0; ctx.fillStyle = "#0a0a14"
        ctx.font = `bold ${s*0.35}px Arial`; ctx.textAlign = "center"
        ctx.fillText("+10", 0, s*0.35)
        break
      }
      case "moins10": {
        // Down arrow neon
        ctx.shadowColor = color; ctx.shadowBlur = s*0.6
        ctx.fillStyle = color; ctx.strokeStyle = "#fff"; ctx.lineWidth = s*0.05
        ctx.beginPath()
        ctx.moveTo(0, s*0.8)
        ctx.lineTo(s*0.45, s*0.15)
        ctx.lineTo(s*0.22, s*0.15)
        ctx.lineTo(s*0.22, -s*0.5)
        ctx.lineTo(-s*0.22, -s*0.5)
        ctx.lineTo(-s*0.22, s*0.15)
        ctx.lineTo(-s*0.45, s*0.15)
        ctx.closePath()
        ctx.fill(); ctx.stroke()
        ctx.shadowBlur = 0; ctx.fillStyle = "#0a0a14"
        ctx.font = `bold ${s*0.35}px Arial`; ctx.textAlign = "center"
        ctx.fillText("-10", 0, -s*0.2)
        break
      }
      case "moins50": {
        // Skull neon red
        ctx.shadowColor = color; ctx.shadowBlur = s*0.8
        // Dome
        ctx.fillStyle = "#fff"; ctx.strokeStyle = color; ctx.lineWidth = s*0.12
        ctx.beginPath()
        ctx.arc(0, -s*0.15, s*0.48, Math.PI, 0)
        ctx.lineTo(s*0.35, s*0.1)
        ctx.bezierCurveTo(s*0.35, s*0.32, -s*0.35, s*0.32, -s*0.35, s*0.1)
        ctx.closePath(); ctx.fill(); ctx.stroke()
        // Eyes hollow
        ctx.fillStyle = color; ctx.shadowBlur = s*0.4
        ;[-s*0.2, s*0.2].forEach(ex => {
          ctx.beginPath(); ctx.ellipse(ex, -s*0.2, s*0.13, s*0.16, 0, 0, Math.PI*2); ctx.fill()
        })
        // Teeth
        ctx.fillStyle = color; ctx.shadowBlur = 0
        ;[-s*0.24,-s*0.08,s*0.08,s*0.24].forEach(tx => {
          ctx.fillRect(tx-s*0.07, s*0.1, s*0.12, s*0.22)
        })
        // -50 text
        ctx.fillStyle = "#fff"; ctx.shadowColor = color; ctx.shadowBlur = s*0.4
        ctx.font = `bold ${s*0.38}px Arial`; ctx.textAlign = "center"
        ctx.fillText("-50", 0, s*0.78)
        break
      }
    }
    ctx.restore()
  }

  const draw = (angle: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, SIZE, SIZE)

    // Outer glow
    ctx.save()
    ctx.shadowColor = "#a855f7"
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.arc(cx, cy, R + 4, 0, Math.PI * 2)
    ctx.strokeStyle = "#a855f750"
    ctx.lineWidth = 8
    ctx.stroke()
    ctx.restore()

    // Segments — variable sizes
    WHEEL_ITEMS.forEach((item, i) => {
      const start = angle + SEGMENT_ANGLES[i]
      const end = start + SEGMENT_SIZES[i]
      const mid = start + SEGMENT_SIZES[i] / 2

      // Segment fill
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, R, start, end)
      ctx.closePath()
      // Special styling for -50m
      if (item.id === "moins50") {
        ctx.fillStyle = "#7f1d1d"
        ctx.fill()
        ctx.strokeStyle = "#ef4444"
        ctx.lineWidth = 3
        ctx.stroke()
      } else {
        ctx.fillStyle = item.color + "cc"
        ctx.fill()
        ctx.strokeStyle = "#0a0a14"
        ctx.lineWidth = 2
        ctx.stroke()
      }

        // Symbol icon on each segment
      if (SEGMENT_SIZES[i] > 0.15) {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(mid)
        // Position at 65% radius
        const iconR = R * 0.65
        ctx.translate(iconR, 0)
        ctx.rotate(Math.PI / 2)
        // Bigger for normal segments, smaller for -50m
        const iconSize = item.id === "moins50" ? SIZE * 0.065 : SIZE * 0.1
        drawWheelIcon(ctx, item.id, item.color, iconSize)
        ctx.restore()
      }
    })

    // Center circle
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 32)
    grad.addColorStop(0, "#1a0a30")
    grad.addColorStop(1, "#0a0a14")
    ctx.beginPath()
    ctx.arc(cx, cy, 32, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()
    ctx.strokeStyle = "#a855f7"
    ctx.lineWidth = 2.5
    ctx.stroke()

    // Center logo
    ctx.font = "bold 18px Arial"
    ctx.textAlign = "center"
    ctx.fillStyle = "#c084fc"
    ctx.shadowColor = "#a855f7"
    ctx.shadowBlur = 8
    ctx.fillText("🎰", cx, cy + 7)

    // Pointer (top center)
    ctx.save()
    ctx.translate(cx, 8)
    ctx.beginPath()
    ctx.moveTo(-14, 0)
    ctx.lineTo(14, 0)
    ctx.lineTo(0, 28)
    ctx.closePath()
    ctx.fillStyle = "#fff"
    ctx.shadowColor = "#fff"
    ctx.shadowBlur = 10
    ctx.fill()
    ctx.restore()
  }

  useEffect(() => {
    draw(angleRef.current)
  }, [])

  const getResult = (angle: number): Challenge => {
    // Pointer is at top (-π/2). Find which segment is under the pointer.
    const norm = ((-angle - Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
    for (let i = 0; i < N; i++) {
      const start = SEGMENT_ANGLES[i]
      const end = start + SEGMENT_SIZES[i]
      if (norm >= start && norm < end) return WHEEL_ITEMS[i]
    }
    return WHEEL_ITEMS[0]
  }

  // Sound: ticking
  const tickRef = useRef<AudioContext | null>(null)
  const lastTickAngle = useRef(0)

  const playTick = () => {
    try {
      if (!tickRef.current || tickRef.current.state === "closed") {
        tickRef.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = tickRef.current
      if (!ctx) return
      if (ctx.state === "suspended") ctx.resume()
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = "triangle"
      o.frequency.value = 800
      g.gain.setValueAtTime(0.12, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04)
      o.start(); o.stop(ctx.currentTime + 0.04)
    } catch(e) {}
  }

  const playResult = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioCtx()
      ;[0, 0.1, 0.2, 0.3].forEach((d, i) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.type = "sine"
        o.frequency.value = [523, 659, 784, 1047][i]
        g.gain.setValueAtTime(0.15, ctx.currentTime + d)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 0.2)
        o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.22)
      })
    } catch(e) {}
  }

  const spin = () => {
    if (spinning || spun) return
    playTick()
    setSpinning(true)
    setResult(null)

    // Crypto random for spin amount
    const arr = new Uint32Array(2)
    crypto.getRandomValues(arr)
    const extraSpins = 4 + (arr[0] % 4) // 4-7 full rotations ≈ 2-3s
    const extraAngle = (arr[1] % 1000) / 1000 * Math.PI * 2
    const totalAngle = extraSpins * Math.PI * 2 + extraAngle

    const startAngle = angleRef.current
    let elapsed = 0
    const DURATION = 120 + (arr[0] % 40) // 120-160 frames ≈ 2-2.7s

    const animate = () => {
      elapsed++
      const t = elapsed / DURATION
      // Ease out quart — fast start, smooth stop
      const ease = 1 - Math.pow(t, 4)
      const speed = (totalAngle / DURATION) * ease * 4
      angleRef.current += speed

      // Tick sound when crossing a segment boundary
      const norm = ((-angleRef.current) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
      const currentSeg = Math.floor(norm / slice)
      const lastNorm = ((-lastTickAngle.current) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
      const lastSeg = Math.floor(lastNorm / slice)
      if (currentSeg !== lastSeg) playTick()
      lastTickAngle.current = angleRef.current

      draw(angleRef.current)

      if (elapsed < DURATION) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        // Done
        const finalResult = getResult(angleRef.current)
        setSpinning(false)
        setSpun(true)
        setResult(finalResult)
        playResult()

        if (finalResult.needsTarget) {
          setShowDesignate(true)
        }
      }
    }
    frameRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  const applyAndClose = () => {
    if (!result) { onClose(); return }
    if (result.type === "distance" && result.delta) {
      // If needsTarget and target selected, apply to target; else to self
      const targetId = result.needsTarget && targetPlayer ? targetPlayer.user_id : myUserId
      onAwardDistance(targetId, result.delta)
    }
    onClose()
  }

  const BG: any = {
    position: "fixed", inset: 0, background: "#0a0a14", zIndex: 400,
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "24px 16px",
  }

  // ── DESIGNATE PLAYER ──────────────────────────────────────────────────────
  const designateTitle = result?.id === "distribuer" ? "✋ Distribuer à qui ?" :
    result?.id === "moins50" ? "☠️ Qui perd −50m ?" : "👆 Désigner quelqu'un"
  const designateDesc = result?.id === "distribuer" ? "Choisis qui reçoit les 5 gorgées" :
    result?.id === "moins50" ? "Désigne la victime des −50m !" : "Qui doit boire ?"

  if (showDesignate) return (
    <div style={BG}>
      <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:3, color:result?.color||"#c084fc", margin:"0 0 8px" }}>
        {designateTitle}
      </h2>
      <p style={{ color:"#6b7280", fontSize:12, margin:"0 0 24px" }}>{designateDesc}</p>
      <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:10, marginBottom:24 }}>
        {members.filter(m => m.user_id !== myUserId && !m.is_sam).map((m: any) => (
          <button key={m.user_id} onClick={() => { setTargetPlayer(m); setShowDesignate(false) }}
            style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:14, border:"1px solid #2a2a3e", cursor:"pointer", background:"#13131f", transition:"all .15s" }}>
            <span style={{ fontSize:14, fontWeight:600, color:"#e2e8f0", flex:1, textAlign:"left" as const }}>{m.pseudo}</span>
            <span style={{ color:"#6b7280" }}>→</span>
          </button>
        ))}
      </div>
      <button onClick={() => setShowDesignate(false)} style={{ color:"#6b7280", fontSize:12, background:"none", border:"none", cursor:"pointer" }}>
        ← Retour
      </button>
    </div>
  )

  return (
    <div style={BG}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", width:"100%", maxWidth:360, marginBottom:20, alignItems:"center" }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0 }}>
          🎰 ROUE DES DÉFIS
        </h2>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
      </div>

      {/* Wheel */}
      <div style={{ position:"relative", marginBottom:24 }}>
        <canvas ref={canvasRef} width={SIZE} height={SIZE} style={{ borderRadius:"50%", display:"block" }}/>
      </div>

      {/* Result */}
      {result && (
        <div style={{
          background: `linear-gradient(135deg,${result.color}22,${result.color}11)`,
          border: `2px solid ${result.color}`,
          borderRadius: 20, padding: "16px 24px", marginBottom: 20,
          textAlign: "center", width: "100%", maxWidth: 360,
          animation: "popIn 0.4s cubic-bezier(.34,1.4,.64,1)",
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{result.emoji}</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize: 22, color: result.color, letterSpacing: 2, marginBottom: 4, whiteSpace:"pre-line" as const }}>
            {result.label}
          </div>
          {targetPlayer && result.needsTarget && (
            <div style={{ fontSize: 14, color: "#e2e8f0", marginTop: 8, fontWeight: 700 }}>
              👉 {targetPlayer.pseudo}{result.id==="distribuer"?" reçoit les 5 gorgées !":result.id==="moins50"?" perd −50m ☠️":" doit boire !"}
            </div>
          )}
          {result.needsTarget && !targetPlayer && (
            <button onClick={() => setShowDesignate(true)}
              style={{ marginTop: 10, padding: "8px 20px", borderRadius: 10, border: "none", cursor: "pointer", background: result.color, color: "#fff", fontSize: 13, fontWeight: 700 }}>
              👆 Choisir qui
            </button>
          )}
        </div>
      )}

      {/* Spin / Apply button */}
      {!spun ? (
        <button onClick={spin} disabled={spinning}
          style={{ width:"100%", maxWidth:360, padding:"16px", borderRadius:14, border:"none", cursor:spinning?"not-allowed":"pointer", background:spinning?"#2a2a3e":"linear-gradient(135deg,#a855f7,#ec4899)", color:spinning?"#6b7280":"#fff", fontSize:16, fontWeight:700 }}>
          {spinning ? "🎰 La roue tourne…" : "🎰 Faire tourner !"}
        </button>
      ) : (
        <div style={{ display:"flex", gap:10, width:"100%", maxWidth:360 }}>
          <button onClick={() => { setSpun(false); setResult(null); setTargetPlayer(null) }}
            style={{ flex:1, padding:"13px", borderRadius:13, border:"1px solid #2a2a3e", cursor:"pointer", background:"#1e1e2e", color:"#9ca3af", fontSize:14, fontWeight:700 }}>
            🔄 Rejouer
          </button>
          <button onClick={applyAndClose}
            style={{ flex:2, padding:"13px", borderRadius:13, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontSize:14, fontWeight:700 }}>
            ✅ OK, on applique !
          </button>
        </div>
      )}

      <style>{`
        @keyframes popIn {
          0%{transform:scale(0.5);opacity:0}
          70%{transform:scale(1.05)}
          100%{transform:scale(1);opacity:1}
        }
      `}</style>
    </div>
  )
}
