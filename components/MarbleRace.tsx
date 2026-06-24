"use client"
import { useState, useEffect, useRef, useCallback } from "react"

interface Player { id: number; name: string; color: string }
interface Marble {
  id: number; name: string; color: string
  x: number; y: number
  vx: number; vy: number
  progress: number
  finished: boolean; rank: number | null
  stunned: number // frames stunned by obstacle
}

interface Obstacle { x: number; y: number; r: number; type: "cone"|"puddle"|"bump" }

const PLAYER_COLORS = ["#ef4444","#3b82f6","#22c55e","#f59e0b","#a855f7","#ec4899"]

// Full F1-style circuit: array of [x,y] waypoints in world coords (pixels)
// The track is 3000px long, camera follows
const TRACK_W = 3200
const TRACK_H = 1400

// Waypoints forming an oval-ish circuit with chicanes
const WAYPOINTS: [number,number][] = [
  [300,700],[500,700],[700,700],[900,680],[1100,640],[1250,580],[1350,480],[1380,360],
  [1360,240],[1280,160],[1160,120],[1020,110],[880,120],[760,160],[680,240],[660,360],
  [680,460],[740,540],[840,580],[960,600],[1080,600],[1200,600],[1360,600],[1500,600],
  [1640,580],[1760,520],[1840,420],[1860,300],[1820,180],[1720,100],[1580,70],[1420,70],
  [1260,90],[1140,150],[1080,240],[1080,360],[1120,460],[1200,540],[1320,580],
  [1480,600],[1640,620],[1800,640],[1960,660],[2100,680],[2240,720],[2360,780],
  [2440,860],[2480,960],[2460,1060],[2380,1140],[2260,1180],[2120,1180],[1980,1160],
  [1840,1120],[1720,1060],[1640,980],[1600,880],[1580,780],[1560,700],[1520,660],
  [1460,640],[1380,640],[1260,640],[1140,640],[1020,660],[900,700],[780,760],
  [700,840],[660,940],[660,1060],[700,1160],[780,1220],[900,1240],[1040,1230],
  [1160,1200],[1240,1140],[1280,1060],[1260,960],[1200,880],[1100,830],[980,820],
  [860,830],[760,870],[700,940],[680,1040],[700,1140],[760,1200],[860,1230],
  [1000,1220],[1120,1180],[1200,1100],[1220,1000],[1200,900],[1140,820],[1060,780],
  [960,780],[860,800],[780,850],[740,940],[740,1020],[780,1100],[850,1160],
  [940,1180],[1040,1160],[1120,1100],[1160,1020],[1140,940],[1100,880],[1020,860],
  [940,870],[880,910],[860,970],[880,1040],[930,1090],[1000,1100],[1060,1070],
  [1100,1010],[1080,950],[1040,910],[980,910],[940,940],[940,990],[970,1030],
  [1010,1040],[1050,1020],[1060,980],[1040,950],[1010,940],[980,950],[970,980],
  // Back to start
  [800,900],[640,900],[480,860],[360,800],[280,720],[270,700],[280,700],[300,700],
]

const TRACK_WIDTH = 80 // road width in world px

// Precompute cumulative distances
function buildSpline(pts: [number,number][]) {
  const dists = [0]
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i-1][0]
    const dy = pts[i][1] - pts[i-1][1]
    dists.push(dists[i-1] + Math.sqrt(dx*dx + dy*dy))
  }
  return { pts, dists, total: dists[dists.length-1] }
}

function posAtDist(spline: ReturnType<typeof buildSpline>, d: number): [number,number] {
  const t = ((d % spline.total) + spline.total) % spline.total
  for (let i = 1; i < spline.dists.length; i++) {
    if (spline.dists[i] >= t) {
      const seg = spline.dists[i] - spline.dists[i-1]
      const frac = seg > 0 ? (t - spline.dists[i-1]) / seg : 0
      const [ax,ay] = spline.pts[i-1]
      const [bx,by] = spline.pts[i]
      return [ax + (bx-ax)*frac, ay + (by-ay)*frac]
    }
  }
  return spline.pts[spline.pts.length-1]
}

// Generate random obstacles along the track
function genObstacles(spline: ReturnType<typeof buildSpline>): Obstacle[] {
  const obs: Obstacle[] = []
  const types: ("cone"|"puddle"|"bump")[] = ["cone","puddle","bump"]
  for (let d = 400; d < spline.total - 300; d += 180 + Math.random()*120) {
    const [px,py] = posAtDist(spline, d)
    const offset = (Math.random() - 0.5) * TRACK_WIDTH * 0.5
    // Get tangent for perpendicular offset
    const [nx,ny] = posAtDist(spline, d + 5)
    const tx = nx - px, ty = ny - py
    const len = Math.sqrt(tx*tx + ty*ty) || 1
    obs.push({
      x: px + (-ty/len)*offset,
      y: py + (tx/len)*offset,
      r: 12 + Math.random()*8,
      type: types[Math.floor(Math.random()*3)]
    })
  }
  return obs
}

function F1Lights({ phase }: { phase: string }) {
  const lit = ["lights1","lights2","lights3","lights4","lights5","go"].indexOf(phase)
  const isGo = phase === "go"
  return (
    <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:6,
      background:"#111", borderRadius:12, padding:"10px 16px",
      border:"2px solid #333", boxShadow:"0 4px 20px rgba(0,0,0,0.8)" }}>
      <div style={{ display:"flex", gap:10 }}>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{
            width:22, height:22, borderRadius:"50%",
            background: isGo ? "#111" : lit > i ? "#ef4444" : "#1a1a1a",
            boxShadow: isGo ? "none" : lit > i ? "0 0 14px #ef4444, 0 0 28px #ef444440" : "none",
            border:"2px solid #333", transition:"all 0.08s"
          }}/>
        ))}
      </div>
      {isGo && <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, color:"#22c55e",
        letterSpacing:4, textShadow:"0 0 16px #22c55e" }}>GO !</div>}
    </div>
  )
}

interface Props {
  members: any[]
  onClose: () => void
}

export default function MarbleRace({ members, onClose }: Props) {
  const [numPlayers, setNumPlayers] = useState(Math.min(members.length, 4))
  const [phase, setPhase] = useState<"setup"|"countdown"|"racing"|"finished">("setup")
  const [lightPhase, setLightPhase] = useState("waiting")
  const [marbles, setMarbles] = useState<Marble[]>([])
  const [winner, setWinner] = useState<Marble|null>(null)
  const [camera, setCamera] = useState({x:0, y:700}) // world pos at center of view
  const [distributing, setDistributing] = useState(false)
  const [sipTarget, setSipTarget] = useState<number|null>(null)
  const [gorgesLeft, setGorgesLeft] = useState(10)
  const [distribution, setDistribution] = useState<Record<number,number>>({})

  const splineRef = useRef<ReturnType<typeof buildSpline> | null>(null)
  const obstaclesRef = useRef<Obstacle[]>([])
  const animRef = useRef<number>(0)
  const startRef = useRef(0)
  const marblesRef = useRef<Marble[]>([])
  const winnerSetRef = useRef(false)
  const speedsRef = useRef<number[]>([])

  const RACE_DURATION = 18000
  const VIEW_W = 360, VIEW_H = 340

  const players = members.slice(0, numPlayers).map((m, i) => ({
    id: i, name: m.pseudo || `J${i+1}`, color: PLAYER_COLORS[i]
  }))

  useEffect(() => {
    const sp = buildSpline(WAYPOINTS)
    splineRef.current = sp
    obstaclesRef.current = genObstacles(sp)
  }, [])

  const startRace = () => {
    const sp = splineRef.current!
    winnerSetRef.current = false
    // Random speeds, one winner pre-chosen
    const winIdx = Math.floor(Math.random() * numPlayers)
    const speeds = players.map((_, i) => {
      const base = 0.82 + Math.random() * 0.12
      return i === winIdx ? base + 0.18 + Math.random() * 0.08 : base
    })
    speedsRef.current = speeds

    const initMarbles: Marble[] = players.map((p, i) => {
      const offset = (i - (numPlayers-1)/2) * 22
      const [px, py] = posAtDist(sp, offset + 20)
      return { ...p, x: px, y: py + offset, vx:0, vy:0, progress:0, finished:false, rank:null, stunned:0 }
    })
    marblesRef.current = initMarbles
    setMarbles(initMarbles)
    setWinner(null)
    setSipTarget(null)
    setGorgesLeft(10)
    setDistribution({})
    setDistributing(false)
    setCamera({ x: WAYPOINTS[0][0], y: WAYPOINTS[0][1] })
    setPhase("countdown")
    setLightPhase("waiting")

    // Lights sequence
    let step = 0
    const PHASES = ["lights1","lights2","lights3","lights4","lights5"]
    const iv = setInterval(() => {
      if (step < 5) setLightPhase(PHASES[step++])
      else {
        clearInterval(iv)
        setTimeout(() => {
          setLightPhase("go")
          setTimeout(() => {
            setLightPhase("racing")
            setPhase("racing")
            startRef.current = performance.now()
          }, 500 + Math.random() * 500)
        }, 200)
      }
    }, 620)
  }

  // Race loop
  useEffect(() => {
    if (phase !== "racing") return
    const sp = splineRef.current!
    const obs = obstaclesRef.current
    let finishCount = 0

    const tick = (now: number) => {
      const elapsed = now - startRef.current
      const globalT = Math.min(elapsed / RACE_DURATION, 1)

      // Easing: slow start, full speed, slow end
      const eased = globalT < 0.08
        ? globalT * globalT * 80
        : globalT < 0.92
        ? 0.512 + (globalT - 0.08) * 1.07
        : 0.95 + (globalT - 0.92) * 0.625

      const next = marblesRef.current.map((m, i) => {
        if (m.finished) return m
        const spd = speedsRef.current[i]
        const prog = Math.min(eased * spd, 0.999)
        const dist = prog * sp.total
        const [nx, ny] = posAtDist(sp, dist)

        // Check obstacle collisions
        let stunned = Math.max(0, m.stunned - 1)
        if (stunned === 0) {
          for (const ob of obs) {
            const dx = nx - ob.x, dy = ny - ob.y
            if (dx*dx + dy*dy < (ob.r + 8) * (ob.r + 8)) {
              stunned = ob.type === "puddle" ? 40 : ob.type === "bump" ? 20 : 12
              speedsRef.current[i] *= ob.type === "puddle" ? 0.88 : 0.92
              break
            }
          }
        }

        const finished = prog >= 0.995
        if (finished && !m.finished) {
          finishCount++
          if (!winnerSetRef.current) {
            winnerSetRef.current = true
            setWinner({ ...m, x: nx, y: ny, progress: prog, finished: true, rank: 1, stunned })
          }
        }

        return { ...m, x: nx, y: ny, progress: prog, finished, stunned,
          rank: finished ? (m.rank ?? finishCount) : null }
      })

      marblesRef.current = next
      setMarbles([...next])

      // Camera: follow centroid of all marbles
      const cx = next.reduce((s,m)=>s+m.x,0)/next.length
      const cy = next.reduce((s,m)=>s+m.y,0)/next.length
      setCamera({ x: cx, y: cy })

      const allDone = globalT >= 1 || next.every(m => m.finished)
      if (!allDone) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        setPhase("finished")
        setDistributing(true)
      }
    }

    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [phase])

  const addSip = (targetId: number) => {
    if (gorgesLeft <= 0) return
    setDistribution(prev => ({ ...prev, [targetId]: (prev[targetId]||0) + 1 }))
    setGorgesLeft(g => g - 1)
  }
  const removeSip = (targetId: number) => {
    setDistribution(prev => {
      const cur = prev[targetId] || 0
      if (cur <= 0) return prev
      setGorgesLeft(g => g + 1)
      return { ...prev, [targetId]: cur - 1 }
    })
  }

  const BG: any = { position:"fixed", inset:0, background:"#0a0a14", zIndex:400,
    display:"flex", flexDirection:"column", alignItems:"center", overflowY:"auto" }

  // ── SETUP ───────────────────────────────────────────────────────────────
  if (phase === "setup") return (
    <div style={BG}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap')`}</style>
      <div style={{ width:"100%", maxWidth:380, padding:"24px 16px 60px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, letterSpacing:3,
            background:"linear-gradient(135deg,#ef4444,#f59e0b)", WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent", margin:0 }}>🔮 COURSE DE BILLES</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:12 }}>
            Joueurs ({numPlayers})
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            {[2,3,4,5,6].filter(n => n <= members.length).map(n => (
              <button key={n} onClick={() => setNumPlayers(n)}
                style={{ flex:1, padding:"10px", borderRadius:10, border:"none", cursor:"pointer",
                  background: numPlayers===n ? "linear-gradient(135deg,#ef4444,#b91c1c)" : "#1e1e2e",
                  color: numPlayers===n ? "#fff" : "#6b7280", fontWeight:700, fontSize:16 }}>
                {n}
              </button>
            ))}
          </div>
          {players.map(p => (
            <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0",
              borderBottom:"1px solid #1a1a2a" }}>
              <div style={{ width:18, height:18, borderRadius:"50%", background:p.color,
                boxShadow:`0 0 8px ${p.color}80` }}/>
              <span style={{ fontSize:13, color:"#e2e8f0" }}>{p.name}</span>
            </div>
          ))}
        </div>

        <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginBottom:20, fontSize:12, color:"#6b7280", lineHeight:1.6 }}>
          🔮 Les billes partent au feu vert · 🐌 Des obstacles ralentissent · 🏆 Le gagnant distribue 10 gorgées
        </div>

        <button onClick={startRace}
          style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", cursor:"pointer",
            background:"linear-gradient(135deg,#ef4444,#b91c1c)", color:"#fff", fontSize:17, fontWeight:700 }}>
          🚦 LANCER LA COURSE !
        </button>
      </div>
    </div>
  )

  // ── RACE / COUNTDOWN ────────────────────────────────────────────────────
  if (phase === "countdown" || phase === "racing") {
    const sp = splineRef.current
    const obs = obstaclesRef.current

    // Build SVG path for visible portion
    const camX = camera.x - VIEW_W/2
    const camY = camera.y - VIEW_H/2

    // Collect visible track segments
    const visWpts = WAYPOINTS.filter(([x,y]) =>
      x > camX - 200 && x < camX + VIEW_W + 200 &&
      y > camY - 200 && y < camY + VIEW_H + 200
    )

    // Build path
    const toSvg = ([wx,wy]: [number,number]) =>
      `${wx - camX},${wy - camY}`
    const trackPath = WAYPOINTS.map((p,i) => `${i===0?'M':'L'}${toSvg(p)}`).join(' ')

    // Rankings
    const ranked = [...marbles].sort((a,b) => b.progress - a.progress)

    return (
      <div style={BG}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap')`}</style>
        {/* Header */}
        <div style={{ width:"100%", maxWidth:VIEW_W, padding:"12px 16px 8px",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, letterSpacing:3, color:"#ef4444" }}>
            🔮 BILLES
          </div>
          {phase === "countdown" && <F1Lights phase={lightPhase}/>}
          {phase === "racing" && lightPhase === "go" && <F1Lights phase="go"/>}
        </div>

        {/* Track viewport */}
        <div style={{ width:VIEW_W, height:VIEW_H, overflow:"hidden", borderRadius:16,
          border:"1px solid #1e1e2e", background:"#0d1117", position:"relative" }}>
          <svg width={VIEW_W} height={VIEW_H} style={{ display:"block" }}>
            {/* Sky/ground */}
            <rect width={VIEW_W} height={VIEW_H} fill="#0d1117"/>

            {/* Track border (white) */}
            <path d={trackPath} fill="none" stroke="#e2e8f0" strokeWidth={TRACK_WIDTH + 8}
              strokeLinecap="round" strokeLinejoin="round"/>
            {/* Track kerb stripes (red/white) */}
            <path d={trackPath} fill="none" stroke="#ef4444" strokeWidth={TRACK_WIDTH + 8}
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="20,20" opacity="0.6"/>
            {/* Tarmac */}
            <path d={trackPath} fill="none" stroke="#1e2530" strokeWidth={TRACK_WIDTH}
              strokeLinecap="round" strokeLinejoin="round"/>
            {/* Road texture */}
            <path d={trackPath} fill="none" stroke="#252d3a" strokeWidth={TRACK_WIDTH - 4}
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="40,6" opacity="0.4"/>
            {/* Center line */}
            <path d={trackPath} fill="none" stroke="#fbbf24" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray="15,15" opacity="0.5"/>

            {/* Start/finish */}
            {(() => {
              const [sx,sy] = WAYPOINTS[0]
              const svgX = sx - camX, svgY = sy - camY
              if (svgX > -50 && svgX < VIEW_W+50 && svgY > -50 && svgY < VIEW_H+50) return (
                <>
                  <line x1={svgX-30} y1={svgY-8} x2={svgX+30} y2={svgY+8}
                    stroke="white" strokeWidth="6" strokeDasharray="6,6"/>
                  <text x={svgX} y={svgY-20} fill="white" fontSize="11"
                    textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">S/F</text>
                </>
              )
            })()}

            {/* Obstacles */}
            {obs.map((ob, i) => {
              const ox = ob.x - camX, oy = ob.y - camY
              if (ox < -30 || ox > VIEW_W+30 || oy < -30 || oy > VIEW_H+30) return null
              return (
                <g key={i}>
                  {ob.type === "cone" && <>
                    <polygon points={`${ox},${oy-ob.r} ${ox-ob.r*0.7},${oy+ob.r*0.5} ${ox+ob.r*0.7},${oy+ob.r*0.5}`}
                      fill="#f97316" stroke="#fff" strokeWidth="1"/>
                    <line x1={ox-ob.r*0.4} y1={oy+ob.r*0.1} x2={ox+ob.r*0.4} y2={oy+ob.r*0.1}
                      stroke="white" strokeWidth="2"/>
                  </>}
                  {ob.type === "puddle" && <>
                    <ellipse cx={ox} cy={oy} rx={ob.r*1.4} ry={ob.r*0.7}
                      fill="#60a5fa" opacity="0.5"/>
                    <ellipse cx={ox-3} cy={oy-2} rx={ob.r*0.5} ry={ob.r*0.3}
                      fill="white" opacity="0.3"/>
                  </>}
                  {ob.type === "bump" && <>
                    <ellipse cx={ox} cy={oy} rx={ob.r*1.2} ry={ob.r*0.5}
                      fill="#374151"/>
                    <ellipse cx={ox} cy={oy-2} rx={ob.r} ry={ob.r*0.35}
                      fill="#4b5563"/>
                  </>}
                </g>
              )
            })}

            {/* Marbles */}
            {marbles.map(m => {
              const mx = m.x - camX, my = m.y - camY
              if (mx < -20 || mx > VIEW_W+20 || my < -20 || my > VIEW_H+20) return null
              const stunScale = m.stunned > 0 ? 0.85 : 1
              return (
                <g key={m.id} transform={`translate(${mx},${my})`}>
                  {/* Shadow */}
                  <ellipse cx="2" cy="5" rx="9" ry="4" fill="black" opacity="0.3"/>
                  {/* Trail */}
                  {phase === "racing" && !m.finished && (
                    <circle r="7" fill={m.color} opacity="0.1"/>
                  )}
                  {/* Marble body */}
                  <defs>
                    <radialGradient id={`mg${m.id}`} cx="35%" cy="30%" r="65%">
                      <stop offset="0%" stopColor="white" stopOpacity="0.8"/>
                      <stop offset="35%" stopColor={m.color}/>
                      <stop offset="100%" stopColor={`${m.color}66`}/>
                    </radialGradient>
                  </defs>
                  <circle r={9 * stunScale} fill={`url(#mg${m.id})`}
                    stroke={m.stunned > 0 ? "#fff" : "none"} strokeWidth="1"/>
                  {/* Stun flash */}
                  {m.stunned > 0 && m.stunned % 6 < 3 && (
                    <circle r="12" fill="white" opacity="0.2"/>
                  )}
                  {/* Name */}
                  <text y="-14" textAnchor="middle" fontSize="9" fill="white"
                    fontWeight="bold" fontFamily="sans-serif"
                    style={{ textShadow:"0 1px 3px #000" }}>
                    {m.name.slice(0,4)}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Live leaderboard */}
        <div style={{ width:"100%", maxWidth:VIEW_W, padding:"8px 16px",
          display:"flex", gap:6, flexWrap:"wrap" as const, justifyContent:"center" }}>
          {ranked.map((m, rank) => (
            <div key={m.id} style={{ display:"flex", alignItems:"center", gap:5,
              background:"#13131f", borderRadius:8, padding:"4px 8px",
              border:`1px solid ${m.finished ? m.color : "#2a2a3e"}`,
              opacity: m.finished ? 0.7 : 1 }}>
              <span style={{ fontSize:10, color:"#6b7280" }}>{rank+1}.</span>
              <div style={{ width:10, height:10, borderRadius:"50%", background:m.color }}/>
              <span style={{ fontSize:11, color:"#e2e8f0" }}>{m.name}</span>
              <div style={{ width:36, height:3, borderRadius:1, background:"#1e1e2e" }}>
                <div style={{ width:`${m.progress*100}%`, height:"100%", borderRadius:1,
                  background:m.color }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── FINISHED ─────────────────────────────────────────────────────────────
  if (phase === "finished" && winner) {
    const losers = marbles.filter(m => m.id !== winner.id)

    return (
      <div style={BG}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap')`}</style>
        <div style={{ width:"100%", maxWidth:380, padding:"24px 16px 60px" }}>

          {/* Winner banner */}
          <div style={{ background:"linear-gradient(135deg,#1a0800,#0f0400)",
            border:"2px solid #fbbf24", borderRadius:20, padding:"20px",
            textAlign:"center", marginBottom:16 }}>
            <div style={{ fontSize:44, marginBottom:4 }}>🏆</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:30,
              color:"#fbbf24", letterSpacing:2, marginBottom:6 }}>
              {winner.name} GAGNE !
            </div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <div style={{ width:16, height:16, borderRadius:"50%", background:winner.color,
                boxShadow:`0 0 10px ${winner.color}` }}/>
              <span style={{ fontSize:12, color:"#9ca3af" }}>Distribue 10 gorgées à qui il veut</span>
            </div>
          </div>

          {/* Distribute sips */}
          <div style={{ background:"#13131f", borderRadius:14, padding:14,
            border:"1px solid #2a2a3e", marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12, alignItems:"center" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const }}>
                Distribuer les gorgées
              </div>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22,
                color: gorgesLeft > 0 ? "#fbbf24" : "#22c55e" }}>
                {gorgesLeft > 0 ? `${gorgesLeft} restantes` : "✅ Tout distribué !"}
              </div>
            </div>

            {losers.map(p => (
              <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10,
                padding:"10px 0", borderBottom:"1px solid #1a1a2a" }}>
                <div style={{ width:14, height:14, borderRadius:"50%", background:p.color,
                  boxShadow:`0 0 6px ${p.color}80` }}/>
                <span style={{ flex:1, fontSize:13, color:"#e2e8f0", fontWeight:600 }}>{p.name}</span>
                <button onClick={() => removeSip(p.id)} disabled={(distribution[p.id]||0) <= 0}
                  style={{ width:30, height:30, borderRadius:8, border:"1px solid #2a2a3e",
                    background:"#1e1e2e", color:"#9ca3af", fontSize:16, cursor:"pointer",
                    opacity:(distribution[p.id]||0) <= 0 ? 0.3 : 1 }}>−</button>
                <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, color:p.color,
                  width:28, textAlign:"center" as const }}>
                  {distribution[p.id] || 0}
                </div>
                <button onClick={() => addSip(p.id)} disabled={gorgesLeft <= 0}
                  style={{ width:30, height:30, borderRadius:8, border:"none",
                    background: gorgesLeft > 0 ? p.color : "#1e1e2e",
                    color:"#fff", fontSize:16, cursor:"pointer",
                    opacity: gorgesLeft <= 0 ? 0.3 : 1 }}>+</button>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => { setPhase("setup"); setWinner(null) }}
              style={{ flex:1, padding:"13px", borderRadius:13, border:"1px solid #2a2a3e",
                cursor:"pointer", background:"#1e1e2e", color:"#9ca3af", fontSize:13, fontWeight:700 }}>
              🔄 Rejouer
            </button>
            <button onClick={onClose} disabled={gorgesLeft > 0}
              style={{ flex:2, padding:"13px", borderRadius:13, border:"none",
                cursor: gorgesLeft > 0 ? "not-allowed" : "pointer",
                background: gorgesLeft > 0 ? "#2a2a3e" : "linear-gradient(135deg,#22c55e,#16a34a)",
                color: gorgesLeft > 0 ? "#4b5563" : "#fff", fontSize:13, fontWeight:700 }}>
              {gorgesLeft > 0 ? `Distribue encore ${gorgesLeft} gorgées` : "✅ C'est parti !"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
