"use client"
import { useState, useRef, useEffect } from "react"

interface Challenge {
  id: string
  label: string
  emoji: string
  color: string
  type: "drink" | "distance" | "social"
  delta?: number // for distance challenges
}

const CHALLENGES: Challenge[] = [
  { id:"shot",      label:"Boire un shot !",           emoji:"🥃", color:"#ef4444", type:"drink" },
  { id:"culsec",    label:"Cul sec !",                 emoji:"🍺", color:"#f97316", type:"drink" },
  { id:"finir",     label:"Finir son verre !",         emoji:"🍷", color:"#ec4899", type:"drink" },
  { id:"distribuer",label:"Distribuer 5 gorgées",      emoji:"🫵", color:"#a855f7", type:"social" },
  { id:"designer",  label:"Désigner quelqu'un",        emoji:"👆", color:"#8b5cf6", type:"social" },
  { id:"toutlemonde",label:"Tout le monde boit\nsauf toi !", emoji:"🎉", color:"#06b6d4", type:"social" },
  { id:"plus10",    label:"+10m sur la piste !",       emoji:"🚀", color:"#4ade80", type:"distance", delta: 10 },
  { id:"moins10",   label:"−10m sur la piste !",       emoji:"💀", color:"#f87171", type:"distance", delta: -10 },
]

// Duplicate challenges for visual richness (wheel needs many segments)
const WHEEL_ITEMS = [...CHALLENGES, ...CHALLENGES, ...CHALLENGES].slice(0, 16)

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
  const slice = (2 * Math.PI) / N

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

    // Segments
    WHEEL_ITEMS.forEach((item, i) => {
      const start = angle + i * slice
      const end = start + slice

      // Segment fill
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, R, start, end)
      ctx.closePath()
      ctx.fillStyle = item.color + "cc"
      ctx.fill()
      ctx.strokeStyle = "#0a0a14"
      ctx.lineWidth = 2
      ctx.stroke()

      // Emoji text
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + slice / 2)
      ctx.textAlign = "right"
      ctx.font = `${SIZE * 0.06}px Arial`
      ctx.fillStyle = "#fff"
      ctx.shadowColor = "rgba(0,0,0,0.7)"
      ctx.shadowBlur = 4
      ctx.fillText(item.emoji, R - 10, 5)
      ctx.restore()
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
    // Pointer is at top (−π/2). Normalize angle.
    const norm = ((-angle - Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
    const idx = Math.floor(norm / slice) % N
    return WHEEL_ITEMS[idx]
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
    const arr = new Uint32Array(1)
    crypto.getRandomValues(arr)
    const extraSpins = 5 + (arr[0] % 8) // 5-12 full rotations
    const extraAngle = (arr[0] % 1000) / 1000 * Math.PI * 2
    const totalAngle = extraSpins * Math.PI * 2 + extraAngle

    velRef.current = totalAngle / 200 // initial velocity (spread over ~200 frames)
    const startAngle = angleRef.current
    let elapsed = 0
    const DURATION = 200 + (arr[0] % 80) // variable duration

    const animate = () => {
      elapsed++
      // Ease out — slow down progressively
      const t = elapsed / DURATION
      const ease = 1 - Math.pow(t, 3)
      const speed = (totalAngle / DURATION) * ease * 3
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

        if (finalResult.id === "designer") {
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
      onAwardDistance(myUserId, result.delta)
    }
    onClose()
  }

  const BG: any = {
    position: "fixed", inset: 0, background: "#0a0a14", zIndex: 400,
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "24px 16px",
  }

  // ── DESIGNATE PLAYER ──────────────────────────────────────────────────────
  if (showDesignate) return (
    <div style={BG}>
      <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:3, color:"#c084fc", margin:"0 0 8px" }}>
        👆 Désigner quelqu'un
      </h2>
      <p style={{ color:"#6b7280", fontSize:12, margin:"0 0 24px" }}>Qui doit boire ?</p>
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
          {targetPlayer && result.id === "designer" && (
            <div style={{ fontSize: 14, color: "#e2e8f0", marginTop: 8, fontWeight: 700 }}>
              👉 {targetPlayer.pseudo} doit boire !
            </div>
          )}
          {result.id === "designer" && !targetPlayer && (
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
