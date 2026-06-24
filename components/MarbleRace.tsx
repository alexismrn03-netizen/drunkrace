"use client"
import { useState, useEffect, useRef } from "react"

const COLORS = ["#ef4444","#3b82f6","#22c55e","#f59e0b","#a855f7","#ec4899"]

// ── TRACK DEFINITION ─────────────────────────────────────────────────────
// Simple track: start at bottom, 2 turns, finish at top-right
// Track is a corridor — billes bounce off walls

// Track center path (world coords)
const PATH: [number,number][] = [
  [200, 900],  // START
  [200, 600],  // straight up
  [200, 350],  // approaching turn 1
  [300, 220],  // turn 1 apex
  [500, 160],  // exit turn 1
  [700, 160],  // straight
  [900, 160],  // approaching turn 2
  [1000, 260], // turn 2 apex
  [1000, 450], // exit turn 2
  [1000, 600], // straight down-right
  [1100, 700], // chicane
  [1200, 680], // chicane exit
  [1300, 600], // approaching finish
  [1400, 500], // FINISH
]

const ROAD_W = 90   // corridor full width
const HALF_W = ROAD_W / 2
const VIEW_W = 360
const VIEW_H = 340

// ── SPLINE HELPERS ────────────────────────────────────────────────────────
function buildSpline(pts: [number,number][]) {
  const dists = [0]
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0]-pts[i-1][0], dy = pts[i][1]-pts[i-1][1]
    dists.push(dists[i-1]+Math.sqrt(dx*dx+dy*dy))
  }
  return { pts, dists, total: dists[dists.length-1] }
}

type Spline = ReturnType<typeof buildSpline>

function posAtD(sp: Spline, d: number): [number,number] {
  const clamped = Math.min(Math.max(d, 0), sp.total)
  for (let i = 1; i < sp.dists.length; i++) {
    if (sp.dists[i] >= clamped) {
      const seg = sp.dists[i]-sp.dists[i-1]
      const f = seg>0?(clamped-sp.dists[i-1])/seg:0
      const [ax,ay]=sp.pts[i-1],[bx,by]=sp.pts[i]
      return [ax+(bx-ax)*f, ay+(by-ay)*f]
    }
  }
  return sp.pts[sp.pts.length-1]
}

// Get tangent (unit vector) at distance d
function tanAtD(sp: Spline, d: number): [number,number] {
  const [ax,ay] = posAtD(sp, d)
  const [bx,by] = posAtD(sp, Math.min(d+5, sp.total))
  const len = Math.sqrt((bx-ax)**2+(by-ay)**2)||1
  return [(bx-ax)/len, (by-ay)/len]
}

// Normal (perpendicular to tangent)
function normAtD(sp: Spline, d: number): [number,number] {
  const [tx,ty] = tanAtD(sp,d)
  return [-ty, tx]
}

// ── OBSTACLES ────────────────────────────────────────────────────────────
// Obstacles = cones/bumps placed at specific distances, offset from center
const OBS_DEF = [
  { d: 0.12, off: 20,  type: "cone",   r: 10 },
  { d: 0.18, off: -22, type: "puddle", r: 14 },
  { d: 0.30, off: 15,  type: "cone",   r: 10 },
  { d: 0.45, off: -18, type: "bump",   r: 12 },
  { d: 0.55, off: 20,  type: "puddle", r: 14 },
  { d: 0.65, off: -15, type: "cone",   r: 10 },
  { d: 0.78, off: 18,  type: "bump",   r: 12 },
  { d: 0.88, off: -20, type: "cone",   r: 10 },
]

const BOOST_DEF = [
  { d: 0.22, off: 0  },
  { d: 0.50, off: 10 },
  { d: 0.70, off: -10},
]

// ── MARBLE STATE ──────────────────────────────────────────────────────────
interface Marble {
  id: number; name: string; color: string
  d: number        // distance along track center (0..total)
  lateral: number  // offset from center (-HALF_W..+HALF_W)
  vd: number       // velocity along track
  vl: number       // lateral velocity
  stun: number     // frames stunned
  boosting: number // frames of boost
  finished: boolean
}

function F1Lights({ phase }: { phase: string }) {
  const n = ["lights1","lights2","lights3","lights4","lights5"].indexOf(phase)+1
  const go = phase==="go"
  return (
    <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:4,
      background:"#111", borderRadius:10, padding:"8px 14px",
      border:"2px solid #333", boxShadow:"0 4px 20px rgba(0,0,0,.8)" }}>
      <div style={{ display:"flex", gap:8 }}>
        {[1,2,3,4,5].map(i=>(
          <div key={i} style={{ width:18, height:18, borderRadius:"50%",
            background:go?"#111":n>=i?"#ef4444":"#1a1a1a",
            boxShadow:go?"none":n>=i?"0 0 12px #ef4444,0 0 24px #ef444440":"none",
            border:"2px solid #333", transition:"all .08s" }}/>
        ))}
      </div>
      {go&&<div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:18, color:"#22c55e",
        letterSpacing:4, textShadow:"0 0 14px #22c55e" }}>GO !</div>}
    </div>
  )
}

interface Props { members: any[]; onClose: () => void }

export default function MarbleRace({ members, onClose }: Props) {
  const [numPlayers, setNumPlayers] = useState(Math.min(members.length,4))
  const [phase, setPhase] = useState<"setup"|"countdown"|"racing"|"finished">("setup")
  const [lightPhase, setLightPhase] = useState("waiting")
  const [mbs, setMbs] = useState<Marble[]>([])
  const mbsRef = useRef<Marble[]>([])
  const [cam, setCam] = useState<[number,number]>([200,700])
  const camRef = useRef<[number,number]>([200,700])
  const [winner, setWinner] = useState<Marble|null>(null)
  const winnerRef = useRef<Marble|null>(null)
  const animRef = useRef(0)
  const [gorges, setGorges] = useState<Record<number,number>>({})
  const [gorgesLeft, setGorgesLeft] = useState(10)
  const spRef = useRef(buildSpline(PATH))

  const players = members.slice(0,numPlayers).map((m,i)=>({ id:i, name:m.pseudo||`J${i+1}`, color:COLORS[i] }))

  // Precompute obstacle/boost world positions
  const sp = spRef.current
  const obstacles = OBS_DEF.map(o=>{
    const [nx,ny]=normAtD(sp,o.d*sp.total)
    const [px,py]=posAtD(sp,o.d*sp.total)
    return { ...o, wx:px+nx*o.off, wy:py+ny*o.off }
  })
  const boosts = BOOST_DEF.map(b=>{
    const [nx,ny]=normAtD(sp,b.d*sp.total)
    const [px,py]=posAtD(sp,b.d*sp.total)
    return { ...b, wx:px+nx*b.off, wy:py+ny*b.off }
  })

  const BASE_SPD = 3.2 // px/frame along track at base speed

  const startRace = () => {
    const winIdx = Math.floor(Math.random()*numPlayers)
    winnerRef.current = null; setWinner(null); setGorges({}); setGorgesLeft(10)

    const initMbs: Marble[] = players.map((p,i)=>({
      ...p,
      d: 0,
      lateral: (i-(numPlayers-1)/2)*16, // spread across lane
      vd: BASE_SPD*(0.9+Math.random()*.1)*(i===winIdx?1.18:1),
      vl: (Math.random()-.5)*0.8,
      stun: 0, boosting: 0, finished: false
    }))
    mbsRef.current = initMbs; setMbs(initMbs)
    camRef.current=[200,700]; setCam([200,700])

    setPhase("countdown"); setLightPhase("waiting")
    let step=0
    const PHASES=["lights1","lights2","lights3","lights4","lights5"]
    const iv=setInterval(()=>{
      if(step<5) setLightPhase(PHASES[step++])
      else {
        clearInterval(iv)
        setTimeout(()=>{
          setLightPhase("go")
          setTimeout(()=>{ setLightPhase("racing"); setPhase("racing") }, 400+Math.random()*500)
        },200)
      }
    },620)
  }

  useEffect(()=>{
    if(phase!=="racing") return
    const sp=spRef.current

    const tick=()=>{
      const next=mbsRef.current.map(m=>{
        if(m.finished) return m

        let { d,lateral,vd,vl,stun,boosting }=m
        let finished: boolean=m.finished

        // Stun: slow down a lot
        const stunFactor = stun>0 ? 0.2 : 1
        const boostFactor = boosting>0 ? 1.6 : 1
        stun=Math.max(0,stun-1)
        boosting=Math.max(0,boosting-1)

        // Advance along track
        d+=vd*stunFactor*boostFactor
        // Lateral drift with small random noise
        vl+=(Math.random()-.5)*.3
        vl*=.96 // damping
        lateral+=vl*stunFactor

        // Get world position
        const [px,py]=posAtD(sp,d)
        const [nx,ny]=normAtD(sp,d)
        const wx=px+nx*lateral
        const wy=py+ny*lateral

        // ── WALL BOUNCE ───────────────────────────────────────────
        if(Math.abs(lateral)>HALF_W-8) {
          const sign=lateral>0?-1:1
          lateral=(HALF_W-9)*(-sign<0?-1:1)
          vl=Math.abs(vl)*sign*0.7 // bounce with damping
          vd*=0.88 // slow down on wall hit
        }

        // ── OBSTACLE COLLISION ────────────────────────────────────
        if(stun===0) {
          for(const ob of obstacles) {
            const dx=wx-ob.wx, dy=wy-ob.wy
            if(dx*dx+dy*dy<(ob.r+8)*(ob.r+8)) {
              stun=ob.type==="puddle"?50:ob.type==="bump"?30:20
              vd*=ob.type==="puddle"?0.7:0.8
              vl=(Math.random()-.5)*3 // knock sideways
              break
            }
          }
        }

        // ── BOOST PICKUP ──────────────────────────────────────────
        if(boosting===0) {
          for(const bo of boosts) {
            const dx=wx-bo.wx, dy=wy-bo.wy
            if(dx*dx+dy*dy<20*20) {
              boosting=25
              break
            }
          }
        }

        // ── FINISH ────────────────────────────────────────────────
        if(d>=sp.total-10) {
          finished=true
          d=sp.total
          if(!winnerRef.current) {
            winnerRef.current={...m,d,lateral,vd,vl,stun,boosting,finished}
            setWinner({...m,d,lateral,vd,vl,stun,boosting,finished})
            setTimeout(()=>setPhase("finished"),2500)
          }
        }

        return {...m,d,lateral,vd,vl,stun,boosting,finished}
      })

      mbsRef.current=next
      setMbs([...next])

      // Smooth camera follow centroid
      const liveM=next.filter(m=>!m.finished)
      const src=liveM.length>0?liveM:next
      const cx=src.reduce((s,m)=>s+posAtD(sp,m.d)[0]+normAtD(sp,m.d)[0]*m.lateral,0)/src.length
      const cy=src.reduce((s,m)=>s+posAtD(sp,m.d)[1]+normAtD(sp,m.d)[1]*m.lateral,0)/src.length
      const [pcx,pcy]=camRef.current
      const ncx=pcx+(cx-pcx)*.05
      const ncy=pcy+(cy-pcy)*.05
      camRef.current=[ncx,ncy]
      setCam([ncx,ncy])

      if(phase==="racing") animRef.current=requestAnimationFrame(tick)
    }
    animRef.current=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(animRef.current)
  },[phase])

  const addSip=(id:number)=>{ if(gorgesLeft<=0)return; setGorges(g=>({...g,[id]:(g[id]||0)+1})); setGorgesLeft(l=>l-1) }
  const remSip=(id:number)=>{ setGorges(g=>{ if((g[id]||0)<=0)return g; setGorgesLeft(l=>l+1); return{...g,[id]:(g[id]||1)-1} }) }

  const BG: any={ position:"fixed",inset:0,background:"#0a0a14",zIndex:400,display:"flex",flexDirection:"column",alignItems:"center" }

  // ── SETUP ─────────────────────────────────────────────────────────────────
  if(phase==="setup") return (
    <div style={{...BG,overflowY:"auto"}}>
      <div style={{ width:"100%",maxWidth:380,padding:"24px 16px 60px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <h2 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:3,
            background:"linear-gradient(135deg,#ef4444,#f59e0b)",WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent",margin:0 }}>🔮 COURSE DE BILLES</h2>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#6b7280",fontSize:22,cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ background:"#13131f",borderRadius:14,padding:14,border:"1px solid #2a2a3e",marginBottom:14 }}>
          <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:10 }}>
            Joueurs ({numPlayers})
          </div>
          <div style={{ display:"flex",gap:8,marginBottom:12 }}>
            {[2,3,4,5,6].filter(n=>n<=members.length).map(n=>(
              <button key={n} onClick={()=>setNumPlayers(n)}
                style={{ flex:1,padding:"9px",borderRadius:10,border:"none",cursor:"pointer",
                  background:numPlayers===n?"linear-gradient(135deg,#ef4444,#b91c1c)":"#1e1e2e",
                  color:numPlayers===n?"#fff":"#6b7280",fontWeight:700,fontSize:15 }}>{n}</button>
            ))}
          </div>
          {players.map(p=>(
            <div key={p.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:"1px solid #1a1a2a" }}>
              <div style={{ width:16,height:16,borderRadius:"50%",background:p.color,boxShadow:`0 0 8px ${p.color}80` }}/>
              <span style={{ fontSize:13,color:"#e2e8f0" }}>{p.name}</span>
            </div>
          ))}
        </div>
        <div style={{ background:"#13131f",borderRadius:14,padding:12,border:"1px solid #2a2a3e",marginBottom:18,fontSize:12,color:"#6b7280",lineHeight:1.7 }}>
          🚦 Feux F1 · 🔵 Boosts de vitesse · 🟠 Cônes · 💧 Flaques · ⬛ Dos d'âne · 🏁 Ligne d'arrivée
        </div>
        <button onClick={startRace}
          style={{ width:"100%",padding:"16px",borderRadius:14,border:"none",cursor:"pointer",
            background:"linear-gradient(135deg,#ef4444,#b91c1c)",color:"#fff",fontSize:17,fontWeight:700 }}>
          🚦 LANCER LA COURSE !
        </button>
      </div>
    </div>
  )

  // ── RACE VIEW ────────────────────────────────────────────────────────────
  if(phase==="countdown"||phase==="racing") {
    const [camX,camY]=cam
    const offX=camX-VIEW_W/2, offY=camY-VIEW_H/2
    const w=(x:number)=>x-offX, h=(y:number)=>y-offY
    const inView=(x:number,y:number,pad=30)=>x>offX-pad&&x<offX+VIEW_W+pad&&y>offY-pad&&y<offY+VIEW_H+pad

    // Build SVG track path
    const trackSvg=PATH.map(([x,y],i)=>`${i===0?"M":"L"}${w(x).toFixed(1)},${h(y).toFixed(1)}`).join(" ")
    const ranked=[...mbs].sort((a,b)=>b.d-a.d)

    // Finish line world position
    const [fx,fy]=PATH[PATH.length-1]
    const [fnx,fny]=normAtD(sp,sp.total-2)

    return (
      <div style={BG}>
        {/* Header */}
        <div style={{ width:"100%",maxWidth:VIEW_W,padding:"10px 16px 6px",
          display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,color:"#ef4444" }}>🔮 BILLES</div>
          <F1Lights phase={lightPhase}/>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#6b7280",fontSize:18,cursor:"pointer" }}>✕</button>
        </div>

        {/* Track */}
        <div style={{ width:VIEW_W,height:VIEW_H,overflow:"hidden",background:"#080d12",
          flexShrink:0,borderTop:"1px solid #1e1e2e",borderBottom:"1px solid #1e1e2e" }}>
          <svg width={VIEW_W} height={VIEW_H}>
            <rect width={VIEW_W} height={VIEW_H} fill="#0a1018"/>

            {/* Kerbs (outer border - red/white) */}
            <path d={trackSvg} fill="none" stroke="#888" strokeWidth={ROAD_W+14}
              strokeLinecap="round" strokeLinejoin="round"/>
            <path d={trackSvg} fill="none" stroke="#ef4444" strokeWidth={ROAD_W+14}
              strokeLinecap="round" strokeLinejoin="round" strokeDasharray="16,16" opacity=".7"/>
            {/* Tarmac */}
            <path d={trackSvg} fill="none" stroke="#1c2230" strokeWidth={ROAD_W}
              strokeLinecap="round" strokeLinejoin="round"/>
            {/* Grain */}
            <path d={trackSvg} fill="none" stroke="#232e40" strokeWidth={ROAD_W-8}
              strokeLinecap="round" strokeLinejoin="round" strokeDasharray="30,6" opacity=".4"/>
            {/* Center line */}
            <path d={trackSvg} fill="none" stroke="#fbbf24" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" strokeDasharray="12,12" opacity=".45"/>

            {/* START line */}
            {inView(200,900)&&(
              <>
                <line x1={w(170)} y1={h(910)} x2={w(230)} y2={h(890)}
                  stroke="white" strokeWidth="7" strokeDasharray="7,7"/>
                <text x={w(200)} y={h(930)} fill="#22c55e" fontSize="11"
                  textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">🚦 DÉPART</text>
              </>
            )}

            {/* FINISH line */}
            {inView(fx,fy)&&(
              <>
                <line
                  x1={w(fx-fny*45)} y1={h(fy+fnx*45)}
                  x2={w(fx+fny*45)} y2={h(fy-fnx*45)}
                  stroke="white" strokeWidth="8" strokeDasharray="8,8"/>
                <text x={w(fx)} y={h(fy-20)} fill="#ef4444" fontSize="11"
                  textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">🏁 ARRIVÉE</text>
              </>
            )}

            {/* Boosts */}
            {boosts.map((b,i)=>{
              if(!inView(b.wx,b.wy)) return null
              const t=(Date.now()/400+i)%1
              return (
                <g key={i}>
                  <circle cx={w(b.wx)} cy={h(b.wy)} r="14" fill="#22c55e" opacity=".15"/>
                  <circle cx={w(b.wx)} cy={h(b.wy)} r={10+t*4} fill="none" stroke="#22c55e" strokeWidth="1.5" opacity={1-t}/>
                  <text x={w(b.wx)} y={h(b.wy)+4} textAnchor="middle" fontSize="13">⚡</text>
                </g>
              )
            })}

            {/* Obstacles */}
            {obstacles.map((ob,i)=>{
              if(!inView(ob.wx,ob.wy)) return null
              const vx=w(ob.wx),vy=h(ob.wy)
              return (
                <g key={i}>
                  {ob.type==="cone"&&<>
                    <polygon points={`${vx},${vy-ob.r} ${vx-ob.r*.8},${vy+ob.r*.6} ${vx+ob.r*.8},${vy+ob.r*.6}`}
                      fill="#f97316" stroke="white" strokeWidth="1.5"/>
                    <line x1={vx-ob.r*.5} y1={vy+ob.r*.1} x2={vx+ob.r*.5} y2={vy+ob.r*.1} stroke="white" strokeWidth="2"/>
                  </>}
                  {ob.type==="puddle"&&<>
                    <ellipse cx={vx} cy={vy} rx={ob.r*1.5} ry={ob.r*.7} fill="#3b82f6" opacity=".55"/>
                    <ellipse cx={vx-ob.r*.4} cy={vy-ob.r*.2} rx={ob.r*.5} ry={ob.r*.25} fill="white" opacity=".35"/>
                  </>}
                  {ob.type==="bump"&&<>
                    <ellipse cx={vx} cy={vy} rx={ob.r*1.3} ry={ob.r*.55} fill="#2a3545"/>
                    <ellipse cx={vx} cy={vy-2} rx={ob.r*1.1} ry={ob.r*.4} fill="#374151"/>
                  </>}
                </g>
              )
            })}

            {/* Marbles */}
            {mbs.map(m=>{
              const [px,py]=posAtD(sp,m.d)
              const [nx,ny]=normAtD(sp,m.d)
              const wx2=px+nx*m.lateral, wy2=py+ny*m.lateral
              if(!inView(wx2,wy2)) return null
              const vx=w(wx2),vy=h(wy2)
              const blink=m.stun>0&&m.stun%6<3
              const boosted=m.boosting>0
              return (
                <g key={m.id}>
                  <ellipse cx={vx+2} cy={vy+5} rx="9" ry="4" fill="black" opacity=".3"/>
                  {boosted&&<circle cx={vx} cy={vy} r="15" fill="#22c55e" opacity=".25"/>}
                  {blink&&<circle cx={vx} cy={vy} r="14" fill="white" opacity=".2"/>}
                  <defs>
                    <radialGradient id={`g${m.id}`} cx="35%" cy="30%" r="65%">
                      <stop offset="0%" stopColor="white" stopOpacity=".75"/>
                      <stop offset="40%" stopColor={m.color}/>
                      <stop offset="100%" stopColor={`${m.color}55`}/>
                    </radialGradient>
                  </defs>
                  <circle cx={vx} cy={vy} r="10"
                    fill={`url(#g${m.id})`}
                    stroke={blink?"white":boosted?"#22c55e":"none"}
                    strokeWidth={blink||boosted?"2":"0"}/>
                  <text x={vx} y={vy-14} textAnchor="middle" fontSize="9" fill="white"
                    fontWeight="bold" fontFamily="sans-serif"
                    style={{paintOrder:"stroke" as any,stroke:"#000",strokeWidth:"2px"}}>
                    {m.name.slice(0,5)}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Ranking */}
        <div style={{ width:"100%",maxWidth:VIEW_W,padding:"8px 12px",display:"flex",gap:6,flexWrap:"wrap" as const,justifyContent:"center",flexShrink:0 }}>
          {ranked.map((m,i)=>(
            <div key={m.id} style={{ display:"flex",alignItems:"center",gap:5,
              background:"#13131f",borderRadius:8,padding:"4px 8px",
              border:`1px solid ${m.finished?m.color:"#2a2a3e"}` }}>
              <span style={{ fontSize:10,color:"#6b7280" }}>{i+1}.</span>
              <div style={{ width:9,height:9,borderRadius:"50%",background:m.color }}/>
              <span style={{ fontSize:11,color:"#e2e8f0" }}>{m.name}</span>
              <div style={{ width:38,height:3,borderRadius:1,background:"#1e1e2e" }}>
                <div style={{ width:`${(m.d/sp.total)*100}%`,height:"100%",borderRadius:1,background:m.color,transition:"width .1s" }}/>
              </div>
              {m.boosting>0&&<span style={{ fontSize:10 }}>⚡</span>}
              {m.stun>0&&<span style={{ fontSize:10 }}>😵</span>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── FINISHED ─────────────────────────────────────────────────────────────
  if(phase==="finished"&&winner) {
    const losers=mbs.filter(m=>m.id!==winner.id)
    return (
      <div style={{...BG,overflowY:"auto"}}>
        <div style={{ width:"100%",maxWidth:380,padding:"24px 16px 60px" }}>
          <div style={{ background:"linear-gradient(135deg,#1a0800,#0f0400)",
            border:"2px solid #fbbf24",borderRadius:20,padding:"18px",
            textAlign:"center" as const,marginBottom:14 }}>
            <div style={{ fontSize:42,marginBottom:4 }}>🏆</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:28,color:"#fbbf24",letterSpacing:2,marginBottom:4 }}>
              {winner.name} GAGNE !
            </div>
            <div style={{ fontSize:12,color:"#9ca3af" }}>Distribue 10 gorgées comme tu veux</div>
          </div>

          <div style={{ background:"#13131f",borderRadius:14,padding:14,border:"1px solid #2a2a3e",marginBottom:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10,alignItems:"center" }}>
              <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const }}>
                Gorgées
              </div>
              <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:20,
                color:gorgesLeft>0?"#fbbf24":"#22c55e" }}>
                {gorgesLeft>0?`${gorgesLeft} restantes`:"✅ OK !"}
              </div>
            </div>
            {losers.map(p=>(
              <div key={p.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #1a1a2a" }}>
                <div style={{ width:12,height:12,borderRadius:"50%",background:p.color }}/>
                <span style={{ flex:1,fontSize:13,color:"#e2e8f0",fontWeight:600 }}>{p.name}</span>
                <button onClick={()=>remSip(p.id)} disabled={(gorges[p.id]||0)<=0}
                  style={{ width:28,height:28,borderRadius:7,border:"1px solid #2a2a3e",
                    background:"#1e1e2e",color:"#9ca3af",fontSize:15,cursor:"pointer",
                    opacity:(gorges[p.id]||0)<=0?0.3:1 }}>−</button>
                <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:22,color:p.color,
                  width:26,textAlign:"center" as const }}>{gorges[p.id]||0}</div>
                <button onClick={()=>addSip(p.id)} disabled={gorgesLeft<=0}
                  style={{ width:28,height:28,borderRadius:7,border:"none",
                    background:gorgesLeft>0?p.color:"#1e1e2e",
                    color:"#fff",fontSize:15,cursor:"pointer",opacity:gorgesLeft<=0?0.3:1 }}>+</button>
              </div>
            ))}
          </div>

          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>{setPhase("setup");setWinner(null)}}
              style={{ flex:1,padding:"12px",borderRadius:12,border:"1px solid #2a2a3e",
                cursor:"pointer",background:"#1e1e2e",color:"#9ca3af",fontSize:13,fontWeight:700 }}>
              🔄 Rejouer
            </button>
            <button onClick={onClose} disabled={gorgesLeft>0}
              style={{ flex:2,padding:"12px",borderRadius:12,border:"none",
                cursor:gorgesLeft>0?"not-allowed":"pointer",
                background:gorgesLeft>0?"#2a2a3e":"linear-gradient(135deg,#22c55e,#16a34a)",
                color:gorgesLeft>0?"#4b5563":"#fff",fontSize:13,fontWeight:700 }}>
              {gorgesLeft>0?`Encore ${gorgesLeft}…`:"✅ C'est parti !"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
