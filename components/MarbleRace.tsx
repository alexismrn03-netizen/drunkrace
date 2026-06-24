"use client"
import { useState, useEffect, useRef } from "react"

const COLORS = ["#ef4444","#3b82f6","#22c55e","#f59e0b","#a855f7","#ec4899"]

// ── TRACK ─────────────────────────────────────────────────────────────────
// Simple oval circuit with chicanes — waypoints in world coords
// We'll render only a viewport around the camera
const TRACK_PTS: [number,number][] = [
  // Start straight
  [400,700],[500,700],[600,700],[700,700],[800,700],[900,700],[1000,700],[1100,700],[1200,700],
  // Turn 1 (right)
  [1300,680],[1380,640],[1430,580],[1450,500],[1440,420],[1400,360],[1340,310],[1270,290],[1200,290],
  // Chicane
  [1130,300],[1060,330],[1010,380],[990,440],[1010,500],[1060,540],[1120,550],[1180,540],
  [1240,510],[1280,460],[1280,400],[1250,350],[1200,320],
  // Back straight
  [1100,310],[1000,310],[900,310],[800,310],[700,310],[600,310],[500,310],
  // Turn 2 (left hairpin)
  [420,320],[350,360],[310,420],[310,490],[340,560],[400,610],[470,640],[550,660],
  // Inner loop
  [620,670],[680,660],[730,630],[760,580],[760,520],[730,470],[680,440],[620,430],
  [560,440],[510,470],[490,520],[500,570],[530,610],[570,640],
  // Return to start
  [620,660],[680,680],[750,690],[820,695],[900,698],[1000,699],[1100,700],
]

const TRACK_LEN = TRACK_PTS.length
const ROAD_W = 70  // road width in world px
const VIEW_W = 360
const VIEW_H = 320

// Precompute cumulative arc lengths for smooth interpolation
function buildTrack() {
  const segs: number[] = [0]
  for (let i = 1; i < TRACK_PTS.length; i++) {
    const dx = TRACK_PTS[i][0] - TRACK_PTS[i-1][0]
    const dy = TRACK_PTS[i][1] - TRACK_PTS[i-1][1]
    segs.push(segs[i-1] + Math.sqrt(dx*dx + dy*dy))
  }
  return { segs, total: segs[segs.length-1] }
}

function posAtT(track: ReturnType<typeof buildTrack>, t: number): [number,number] {
  // t is 0..1, mapped to arc length
  const d = ((t % 1) + 1) % 1 * track.total
  for (let i = 1; i < track.segs.length; i++) {
    if (track.segs[i] >= d) {
      const prev = track.segs[i-1]
      const seg = track.segs[i] - prev
      const f = seg > 0 ? (d - prev) / seg : 0
      const [ax,ay] = TRACK_PTS[i-1]
      const [bx,by] = TRACK_PTS[i]
      return [ax+(bx-ax)*f, ay+(by-ay)*f]
    }
  }
  return TRACK_PTS[TRACK_PTS.length-1]
}

// Obstacle positions (static, placed along track offset from center)
const OBSTACLES = [
  { d: 0.08, off: 18,  r: 10, type: "cone"   },
  { d: 0.15, off: -20, r: 14, type: "puddle"  },
  { d: 0.23, off: 12,  r: 11, type: "bump"    },
  { d: 0.31, off: -15, r: 10, type: "cone"    },
  { d: 0.40, off: 20,  r: 13, type: "puddle"  },
  { d: 0.48, off: -10, r: 12, type: "bump"    },
  { d: 0.56, off: 18,  r: 10, type: "cone"    },
  { d: 0.64, off: -22, r: 14, type: "puddle"  },
  { d: 0.72, off: 10,  r: 11, type: "bump"    },
  { d: 0.80, off: -18, r: 10, type: "cone"    },
  { d: 0.88, off: 16,  r: 13, type: "puddle"  },
  { d: 0.93, off: -12, r: 12, type: "bump"    },
]

// World position of obstacle
function obsPos(track: ReturnType<typeof buildTrack>, d: number, off: number): [number,number] {
  const [px,py] = posAtT(track, d)
  const d2 = d + 0.001
  const [nx,ny] = posAtT(track, d2)
  const tx = nx-px, ty = ny-py
  const len = Math.sqrt(tx*tx+ty*ty) || 1
  return [px + (-ty/len)*off, py + (tx/len)*off]
}

function F1Lights({ phase }: { phase: string }) {
  const n = phase==="lights1"?1:phase==="lights2"?2:phase==="lights3"?3:phase==="lights4"?4:phase==="lights5"||phase==="go"?5:0
  const go = phase === "go"
  return (
    <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:4,
      background:"#111", borderRadius:12, padding:"8px 14px",
      border:"2px solid #333", boxShadow:"0 4px 20px rgba(0,0,0,0.8)" }}>
      <div style={{ display:"flex", gap:8 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            width:20, height:20, borderRadius:"50%",
            background: go ? "#111" : n>=i ? "#ef4444" : "#1a1a1a",
            boxShadow: go ? "none" : n>=i ? "0 0 12px #ef4444,0 0 24px #ef444440" : "none",
            border:"2px solid #333", transition:"all 0.08s"
          }}/>
        ))}
      </div>
      {go && <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, color:"#22c55e",
        letterSpacing:4, textShadow:"0 0 14px #22c55e" }}>GO !</div>}
    </div>
  )
}

interface Props { members: any[]; onClose: () => void }

export default function MarbleRace({ members, onClose }: Props) {
  const [numPlayers, setNumPlayers] = useState(Math.min(members.length, 4))
  const [phase, setPhase] = useState<"setup"|"countdown"|"racing"|"finished">("setup")
  const [lightPhase, setLightPhase] = useState("waiting")

  // Marble state: t=progress 0..1, speed multiplier, stun frames
  type MB = { id:number; name:string; color:string; t:number; spd:number; stun:number; wx:number; wy:number; laneOff:number }
  const [mbs, setMbs] = useState<MB[]>([])
  const mbsRef = useRef<MB[]>([])

  // Camera in world coords (smooth lerp)
  const [cam, setCam] = useState<[number,number]>([600,700])
  const camRef = useRef<[number,number]>([600,700])

  const trackRef = useRef(buildTrack())
  const animRef = useRef(0)
  const winnerRef = useRef<MB|null>(null)
  const [winner, setWinner] = useState<MB|null>(null)
  const [gorges, setGorges] = useState<Record<number,number>>({})
  const [gorgesLeft, setGorgesLeft] = useState(10)

  const RACE_DUR = 20 // seconds
  const BASE_SPEED = 1 / (RACE_DUR * 60) // progress per frame at 60fps

  const players = members.slice(0, numPlayers).map((m,i) => ({
    id: i, name: m.pseudo||`J${i+1}`, color: COLORS[i]
  }))

  const startRace = () => {
    const track = trackRef.current
    winnerRef.current = null
    setWinner(null)
    setGorges({})
    setGorgesLeft(10)

    // Pick winner (gets +20% speed)
    const winIdx = Math.floor(Math.random() * numPlayers)

    const initMbs: MB[] = players.map((p,i) => {
      const laneOff = (i - (numPlayers-1)/2) * 14 // spread across lane
      const [wx,wy] = posAtT(track, 0)
      return {
        ...p,
        t: 0,
        spd: (0.88 + Math.random()*0.08) * (i===winIdx ? 1.22 : 1),
        stun: 0,
        wx, wy,
        laneOff,
      }
    })
    mbsRef.current = initMbs
    setMbs(initMbs)
    camRef.current = [initMbs[0].wx, initMbs[0].wy]
    setCam([initMbs[0].wx, initMbs[0].wy])

    setPhase("countdown")
    setLightPhase("waiting")

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
          }, 400 + Math.random()*500)
        }, 200)
      }
    }, 620)
  }

  // ── RACE LOOP ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "racing") return
    const track = trackRef.current

    // Precompute obstacle world positions
    const obsPts = OBSTACLES.map(ob => ({
      ...ob,
      pos: obsPos(track, ob.d, ob.off)
    }))

    let frame = 0

    const tick = () => {
      frame++

      const next = mbsRef.current.map(m => {
        if (m.t >= 1) return m

        // Speed: BASE_SPEED * personal multiplier, slowed if stunned
        const stun = Math.max(0, m.stun - 1)
        const speedFactor = stun > 0 ? 0.25 : 1
        const newT = Math.min(m.t + BASE_SPEED * m.spd * speedFactor, 1)

        // World position along track center + lane offset
        const [cx,cy] = posAtT(track, newT)
        // Perpendicular offset for lane
        const ahead = posAtT(track, newT + 0.002)
        const tx = ahead[0]-cx, ty = ahead[1]-cy
        const len = Math.sqrt(tx*tx+ty*ty)||1
        const wx = cx + (-ty/len) * m.laneOff
        const wy = cy + (tx/len)  * m.laneOff

        // Check obstacles
        let newStun = stun
        let newSpd = m.spd
        if (stun === 0) {
          for (const ob of obsPts) {
            const dx = wx - ob.pos[0], dy = wy - ob.pos[1]
            if (dx*dx + dy*dy < (ob.r+7)*(ob.r+7)) {
              newStun = ob.type==="puddle" ? 45 : ob.type==="bump" ? 25 : 15
              newSpd = m.spd * (ob.type==="puddle" ? 0.93 : 0.97)
              break
            }
          }
        }

        return { ...m, t: newT, wx, wy, stun: newStun, spd: newSpd }
      })

      // Check winner
      if (!winnerRef.current) {
        const w = next.find(m => m.t >= 1)
        if (w) {
          winnerRef.current = w
          setWinner(w)
          // Let race finish naturally for 3 more secs then end
          setTimeout(() => setPhase("finished"), 3000)
        }
      }

      mbsRef.current = next
      setMbs([...next])

      // Smooth camera: lerp toward centroid of all marbles
      const cx = next.reduce((s,m)=>s+m.wx,0)/next.length
      const cy = next.reduce((s,m)=>s+m.wy,0)/next.length
      const [pcx,pcy] = camRef.current
      const ncx = pcx + (cx-pcx)*0.04 // smooth follow
      const ncy = pcy + (cy-pcy)*0.04
      camRef.current = [ncx, ncy]
      if (frame % 2 === 0) setCam([ncx, ncy]) // update every 2 frames for perf

      if (phase === "racing") animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [phase])

  const addSip = (id: number) => {
    if (gorgesLeft <= 0) return
    setGorges(g => ({...g, [id]:(g[id]||0)+1}))
    setGorgesLeft(l => l-1)
  }
  const remSip = (id: number) => {
    setGorges(g => {
      if ((g[id]||0) <= 0) return g
      setGorgesLeft(l => l+1)
      return {...g, [id]:(g[id]||1)-1}
    })
  }

  const BG: any = { position:"fixed", inset:0, background:"#0a0a14", zIndex:400,
    display:"flex", flexDirection:"column", alignItems:"center" }

  // ── SETUP ────────────────────────────────────────────────────────────────
  if (phase === "setup") return (
    <div style={{...BG, overflowY:"auto"}}>
      <div style={{ width:"100%", maxWidth:380, padding:"24px 16px 60px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:3,
            background:"linear-gradient(135deg,#ef4444,#f59e0b)", WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent", margin:0 }}>🔮 COURSE DE BILLES</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:10 }}>
            Joueurs ({numPlayers})
          </div>
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            {[2,3,4,5,6].filter(n=>n<=members.length).map(n=>(
              <button key={n} onClick={()=>setNumPlayers(n)}
                style={{ flex:1, padding:"9px", borderRadius:10, border:"none", cursor:"pointer",
                  background:numPlayers===n?"linear-gradient(135deg,#ef4444,#b91c1c)":"#1e1e2e",
                  color:numPlayers===n?"#fff":"#6b7280", fontWeight:700, fontSize:15 }}>
                {n}
              </button>
            ))}
          </div>
          {players.map(p=>(
            <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:"1px solid #1a1a2a" }}>
              <div style={{ width:16, height:16, borderRadius:"50%", background:p.color, boxShadow:`0 0 8px ${p.color}80` }}/>
              <span style={{ fontSize:13, color:"#e2e8f0" }}>{p.name}</span>
            </div>
          ))}
        </div>

        <div style={{ background:"#13131f", borderRadius:14, padding:12, border:"1px solid #2a2a3e", marginBottom:18, fontSize:12, color:"#6b7280", lineHeight:1.6 }}>
          🚦 Feux F1 · 🐌 Obstacles (cônes, flaques, dos d'âne) · 🏆 Gagnant distribue 10 gorgées
        </div>

        <button onClick={startRace}
          style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", cursor:"pointer",
            background:"linear-gradient(135deg,#ef4444,#b91c1c)", color:"#fff", fontSize:17, fontWeight:700 }}>
          🚦 LANCER LA COURSE !
        </button>
      </div>
    </div>
  )

  // ── RACE ─────────────────────────────────────────────────────────────────
  if (phase === "countdown" || phase === "racing") {
    const track = trackRef.current
    const [camX, camY] = cam
    const offX = camX - VIEW_W/2
    const offY = camY - VIEW_H/2

    // Build SVG path for the track (all points transformed to viewport)
    const trackSvg = TRACK_PTS.map((p,i)=>`${i===0?'M':'L'}${(p[0]-offX).toFixed(1)},${(p[1]-offY).toFixed(1)}`).join(' ')

    // Obstacle world positions
    const obsPts = OBSTACLES.map(ob=>({ ...ob, pos: obsPos(track, ob.d, ob.off) }))

    const ranked = [...mbs].sort((a,b)=>b.t-a.t)

    return (
      <div style={BG}>
        {/* Header */}
        <div style={{ width:"100%", maxWidth:VIEW_W, padding:"10px 16px 6px",
          display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:3, color:"#ef4444" }}>
            🔮 BILLES
          </div>
          <F1Lights phase={lightPhase}/>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:18, cursor:"pointer" }}>✕</button>
        </div>

        {/* Track viewport */}
        <div style={{ width:VIEW_W, height:VIEW_H, overflow:"hidden", background:"#080d12",
          flexShrink:0, borderTop:"1px solid #1e1e2e", borderBottom:"1px solid #1e1e2e" }}>
          <svg width={VIEW_W} height={VIEW_H}>
            <rect width={VIEW_W} height={VIEW_H} fill="#0a1018"/>

            {/* Tarmac outer (kerb) */}
            <path d={trackSvg} fill="none" stroke="#c0c0c0" strokeWidth={ROAD_W+10}
              strokeLinecap="round" strokeLinejoin="round" strokeDasharray="18,18"/>
            {/* Tarmac surface */}
            <path d={trackSvg} fill="none" stroke="#1c2230" strokeWidth={ROAD_W}
              strokeLinecap="round" strokeLinejoin="round"/>
            {/* Road grain */}
            <path d={trackSvg} fill="none" stroke="#222d3c" strokeWidth={ROAD_W-6}
              strokeLinecap="round" strokeLinejoin="round" strokeDasharray="35,5" opacity="0.5"/>
            {/* Center dashes */}
            <path d={trackSvg} fill="none" stroke="#fbbf24" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" strokeDasharray="14,14" opacity="0.45"/>

            {/* Start/finish line */}
            {(() => {
              const [sx,sy] = TRACK_PTS[0]
              const vx = sx-offX, vy = sy-offY
              if (vx>-60&&vx<VIEW_W+60&&vy>-60&&vy<VIEW_H+60) return (
                <g>
                  <line x1={vx-32} y1={vy-5} x2={vx+32} y2={vy+5}
                    stroke="white" strokeWidth="8" strokeDasharray="8,8"/>
                  <text x={vx} y={vy-16} fill="white" fontSize="10"
                    textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">
                    🏁 S/F
                  </text>
                </g>
              )
            })()}

            {/* Obstacles */}
            {obsPts.map((ob,i)=>{
              const vx = ob.pos[0]-offX, vy = ob.pos[1]-offY
              if (vx<-30||vx>VIEW_W+30||vy<-30||vy>VIEW_H+30) return null
              return (
                <g key={i}>
                  {ob.type==="cone"&&<>
                    <polygon points={`${vx},${vy-ob.r} ${vx-ob.r*.8},${vy+ob.r*.6} ${vx+ob.r*.8},${vy+ob.r*.6}`}
                      fill="#f97316" stroke="white" strokeWidth="1.5"/>
                    <line x1={vx-ob.r*.5} y1={vy} x2={vx+ob.r*.5} y2={vy} stroke="white" strokeWidth="2"/>
                  </>}
                  {ob.type==="puddle"&&<>
                    <ellipse cx={vx} cy={vy} rx={ob.r*1.5} ry={ob.r*.7} fill="#3b82f6" opacity="0.55"/>
                    <ellipse cx={vx-ob.r*.4} cy={vy-ob.r*.2} rx={ob.r*.5} ry={ob.r*.25} fill="white" opacity="0.35"/>
                  </>}
                  {ob.type==="bump"&&<>
                    <ellipse cx={vx} cy={vy} rx={ob.r*1.3} ry={ob.r*.55} fill="#2a3545"/>
                    <ellipse cx={vx} cy={vy-2} rx={ob.r*1.1} ry={ob.r*.4} fill="#374151"/>
                    <ellipse cx={vx-ob.r*.3} cy={vy-3} rx={ob.r*.4} ry={ob.r*.15} fill="#4b5563" opacity="0.6"/>
                  </>}
                </g>
              )
            })}

            {/* Marbles */}
            {mbs.map(m=>{
              const vx = m.wx-offX, vy = m.wy-offY
              if (vx<-20||vx>VIEW_W+20||vy<-20||vy>VIEW_H+20) return null
              const blink = m.stun>0 && m.stun%6<3
              return (
                <g key={m.id}>
                  <ellipse cx={vx+2} cy={vy+4} rx="9" ry="4" fill="black" opacity="0.3"/>
                  <defs>
                    <radialGradient id={`g${m.id}`} cx="35%" cy="30%" r="65%">
                      <stop offset="0%" stopColor="white" stopOpacity="0.75"/>
                      <stop offset="40%" stopColor={m.color}/>
                      <stop offset="100%" stopColor={`${m.color}55`}/>
                    </radialGradient>
                  </defs>
                  {blink && <circle cx={vx} cy={vy} r="14" fill="white" opacity="0.2"/>}
                  <circle cx={vx} cy={vy} r="9" fill={`url(#g${m.id})`}
                    stroke={blink?"white":"none"} strokeWidth="1.5"/>
                  <text x={vx} y={vy-13} textAnchor="middle" fontSize="9"
                    fill="white" fontWeight="bold" fontFamily="sans-serif"
                    style={{paintOrder:"stroke" as any, stroke:"#000", strokeWidth:"2px"}}>
                    {m.name.slice(0,5)}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Live ranking */}
        <div style={{ width:"100%", maxWidth:VIEW_W, padding:"8px 12px",
          display:"flex", gap:6, flexWrap:"wrap" as const, justifyContent:"center", flexShrink:0 }}>
          {ranked.map((m,i)=>(
            <div key={m.id} style={{ display:"flex", alignItems:"center", gap:5,
              background:"#13131f", borderRadius:8, padding:"4px 8px",
              border:`1px solid ${m.t>=1?m.color:"#2a2a3e"}` }}>
              <span style={{ fontSize:10, color:"#6b7280" }}>{i+1}.</span>
              <div style={{ width:9, height:9, borderRadius:"50%", background:m.color }}/>
              <span style={{ fontSize:11, color:"#e2e8f0" }}>{m.name}</span>
              <div style={{ width:40, height:3, borderRadius:1, background:"#1e1e2e" }}>
                <div style={{ width:`${m.t*100}%`, height:"100%", borderRadius:1, background:m.color, transition:"width 0.1s" }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── FINISHED ─────────────────────────────────────────────────────────────
  if (phase === "finished" && winner) {
    const losers = mbs.filter(m=>m.id!==winner.id)
    return (
      <div style={{...BG, overflowY:"auto"}}>
        <div style={{ width:"100%", maxWidth:380, padding:"24px 16px 60px" }}>
          <div style={{ background:"linear-gradient(135deg,#1a0800,#0f0400)",
            border:"2px solid #fbbf24", borderRadius:20, padding:"18px",
            textAlign:"center" as const, marginBottom:14 }}>
            <div style={{ fontSize:42, marginBottom:4 }}>🏆</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28,
              color:"#fbbf24", letterSpacing:2, marginBottom:4 }}>
              {winner.name} GAGNE !
            </div>
            <div style={{ fontSize:12, color:"#9ca3af" }}>Distribue 10 gorgées comme tu veux</div>
          </div>

          <div style={{ background:"#13131f", borderRadius:14, padding:14,
            border:"1px solid #2a2a3e", marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10, alignItems:"center" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const }}>
                Gorgées à distribuer
              </div>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20,
                color: gorgesLeft>0 ? "#fbbf24" : "#22c55e" }}>
                {gorgesLeft>0 ? `${gorgesLeft} restantes` : "✅ OK !"}
              </div>
            </div>
            {losers.map(p=>(
              <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10,
                padding:"10px 0", borderBottom:"1px solid #1a1a2a" }}>
                <div style={{ width:12, height:12, borderRadius:"50%", background:p.color }}/>
                <span style={{ flex:1, fontSize:13, color:"#e2e8f0", fontWeight:600 }}>{p.name}</span>
                <button onClick={()=>remSip(p.id)} disabled={(gorges[p.id]||0)<=0}
                  style={{ width:28, height:28, borderRadius:7, border:"1px solid #2a2a3e",
                    background:"#1e1e2e", color:"#9ca3af", fontSize:15, cursor:"pointer",
                    opacity:(gorges[p.id]||0)<=0?0.3:1 }}>−</button>
                <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, color:p.color,
                  width:26, textAlign:"center" as const }}>
                  {gorges[p.id]||0}
                </div>
                <button onClick={()=>addSip(p.id)} disabled={gorgesLeft<=0}
                  style={{ width:28, height:28, borderRadius:7, border:"none",
                    background:gorgesLeft>0?p.color:"#1e1e2e",
                    color:"#fff", fontSize:15, cursor:"pointer", opacity:gorgesLeft<=0?0.3:1 }}>+</button>
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>{setPhase("setup");setWinner(null)}}
              style={{ flex:1, padding:"12px", borderRadius:12, border:"1px solid #2a2a3e",
                cursor:"pointer", background:"#1e1e2e", color:"#9ca3af", fontSize:13, fontWeight:700 }}>
              🔄 Rejouer
            </button>
            <button onClick={onClose} disabled={gorgesLeft>0}
              style={{ flex:2, padding:"12px", borderRadius:12, border:"none",
                cursor:gorgesLeft>0?"not-allowed":"pointer",
                background:gorgesLeft>0?"#2a2a3e":"linear-gradient(135deg,#22c55e,#16a34a)",
                color:gorgesLeft>0?"#4b5563":"#fff", fontSize:13, fontWeight:700 }}>
              {gorgesLeft>0?`Encore ${gorgesLeft} gorgées…`:"✅ C'est parti !"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
