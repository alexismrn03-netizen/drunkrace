"use client"
import { useState, useEffect, useRef } from "react"

const MARBLE_COLORS = [
  { name: "Rouge",    color: "#ef4444" },
  { name: "Bleu",     color: "#3b82f6" },
  { name: "Vert",     color: "#22c55e" },
  { name: "Orange",   color: "#f59e0b" },
  { name: "Violet",   color: "#a855f7" },
  { name: "Rose",     color: "#ec4899" },
  { name: "Cyan",     color: "#06b6d4" },
  { name: "Lime",     color: "#84cc16" },
  { name: "Blanc",    color: "#f0f0f0" },
  { name: "Or",       color: "#d4af37" },
]

// ── TRACK ─────────────────────────────────────────────────────────────────
// Piste en pente: on simule la gravité avec une accélération progressive
// Forme: virage en épingle + deux lignes droites + chicane
// Le départ est en HAUT, l'arrivée en BAS (gravity effect)
const PATH: [number,number][] = [
  // DÉPART en haut à gauche
  [160, 80],
  [160, 180],
  [160, 300],
  [160, 420],
  // Virage 1 (droite)
  [200, 520],
  [300, 580],
  [420, 600],
  [540, 580],
  [640, 520],
  // Ligne droite descente
  [680, 420],
  [680, 320],
  [680, 220],
  // Virage 2 (gauche, épingle)
  [640, 140],
  [560, 90],
  [460, 70],
  [360, 80],
  [280, 120],
  [240, 180],
  // Descente finale
  [220, 280],
  [200, 400],
  [180, 520],
  [160, 640],
  [160, 760],
  [180, 860],
  // Chicane
  [240, 920],
  [340, 940],
  [440, 920],
  [500, 860],
  // ARRIVÉE en bas
  [500, 780],
  [500, 700],
]

const ROAD_W = 80
const HALF_W = ROAD_W / 2
const VIEW_W = 360
const VIEW_H = 360

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
  const c = Math.min(Math.max(d,0), sp.total)
  for (let i = 1; i < sp.dists.length; i++) {
    if (sp.dists[i] >= c) {
      const seg = sp.dists[i]-sp.dists[i-1]
      const f = seg>0?(c-sp.dists[i-1])/seg:0
      const [ax,ay]=sp.pts[i-1],[bx,by]=sp.pts[i]
      return [ax+(bx-ax)*f, ay+(by-ay)*f]
    }
  }
  return sp.pts[sp.pts.length-1]
}

function normAtD(sp: Spline, d: number): [number,number] {
  const [ax,ay]=posAtD(sp, d)
  const [bx,by]=posAtD(sp, Math.min(d+4, sp.total))
  const len=Math.sqrt((bx-ax)**2+(by-ay)**2)||1
  const tx=(bx-ax)/len, ty=(by-ay)/len
  return [-ty, tx]
}

// Pente simulée: accélération selon la position Y (plus on descend, plus vite)
// Le départ est à y≈80, la fin à y≈700 → gravity factor
function gravityAt(sp: Spline, d: number): number {
  const [,y] = posAtD(sp, d)
  // Normalise y dans [0..1] sur la hauteur de la piste
  const minY = 70, maxY = 940
  const slope = (y - minY) / (maxY - minY) // 0 en haut, 1 en bas
  // Accélération de gravité simulée: plus on est bas, plus on a de vitesse accumulée
  return 1 + slope * 1.4
}

// Obstacles
const OBS: { d: number; off: number; type: "cone"|"puddle"|"bump"; r: number }[] = [
  { d: 0.10, off:  18, type:"cone",   r:9  },
  { d: 0.17, off: -20, type:"puddle", r:13 },
  { d: 0.28, off:  14, type:"bump",   r:11 },
  { d: 0.38, off: -16, type:"cone",   r:9  },
  { d: 0.47, off:  20, type:"puddle", r:13 },
  { d: 0.57, off: -12, type:"bump",   r:11 },
  { d: 0.66, off:  18, type:"cone",   r:9  },
  { d: 0.76, off: -20, type:"puddle", r:13 },
  { d: 0.85, off:  14, type:"bump",   r:11 },
  { d: 0.92, off: -16, type:"cone",   r:9  },
]

const BOOSTS: { d: number; off: number }[] = [
  { d: 0.20, off:  0  },
  { d: 0.45, off:  8  },
  { d: 0.68, off: -8  },
  { d: 0.88, off:  0  },
]

function F1Lights({ phase }: { phase: string }) {
  const n = ["lights1","lights2","lights3","lights4","lights5"].indexOf(phase)+1
  const go = phase==="go"
  return (
    <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:4,
      background:"#111", borderRadius:10, padding:"7px 12px",
      border:"2px solid #333", boxShadow:"0 4px 20px rgba(0,0,0,.8)" }}>
      <div style={{ display:"flex", gap:7 }}>
        {[1,2,3,4,5].map(i=>(
          <div key={i} style={{ width:18,height:18,borderRadius:"50%",
            background:go?"#111":n>=i?"#ef4444":"#1a1a1a",
            boxShadow:go?"none":n>=i?"0 0 10px #ef4444,0 0 20px #ef444440":"none",
            border:"2px solid #333",transition:"all .08s" }}/>
        ))}
      </div>
      {go&&<div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:18,color:"#22c55e",
        letterSpacing:4,textShadow:"0 0 14px #22c55e" }}>GO !</div>}
    </div>
  )
}

interface Player { id:number; name:string; colorIdx:number }
interface Marble {
  id:number; name:string; colorIdx:number
  d:number; lateral:number; vd:number; vl:number
  stun:number; boosting:number; finished:boolean
}

interface Props { members:any[]; onClose:()=>void }

export default function MarbleRace({ members, onClose }: Props) {
  const [numPlayers, setNumPlayers] = useState(Math.min(members.length,4))
  const [colorPicks, setColorPicks] = useState<Record<number,number>>({}) // playerId -> colorIdx
  const [phase, setPhase] = useState<"setup"|"colors"|"countdown"|"racing"|"finished">("setup")
  const [lightPhase, setLightPhase] = useState("waiting")
  const [mbs, setMbs] = useState<Marble[]>([])
  const mbsRef = useRef<Marble[]>([])
  const [cam, setCam] = useState<[number,number]>([160,80])
  const camRef = useRef<[number,number]>([160,80])
  const [winner, setWinner] = useState<Marble|null>(null)
  const winnerRef = useRef<Marble|null>(null)
  const animRef = useRef(0)
  const [gorges, setGorges] = useState<Record<number,number>>({})
  const [gorgesLeft, setGorgesLeft] = useState(10)
  const spRef = useRef(buildSpline(PATH))

  const players: Player[] = members.slice(0,numPlayers).map((m,i)=>({
    id:i, name:m.pseudo||`J${i+1}`, colorIdx: colorPicks[i] ?? i
  }))

  const sp = spRef.current

  // Precompute obstacle/boost world positions
  const obstacles = OBS.map(o=>{
    const d=o.d*sp.total
    const [px,py]=posAtD(sp,d)
    const [nx,ny]=normAtD(sp,d)
    return {...o, d, wx:px+nx*o.off, wy:py+ny*o.off}
  })
  const boosts = BOOSTS.map(b=>{
    const d=b.d*sp.total
    const [px,py]=posAtD(sp,d)
    const [nx,ny]=normAtD(sp,d)
    return {...b, d, wx:px+nx*b.off, wy:py+ny*b.off}
  })

  const BASE_SPD = 2.8

  const startRace = () => {
    const winIdx = Math.floor(Math.random()*numPlayers)
    winnerRef.current=null; setWinner(null); setGorges({}); setGorgesLeft(10)
    const initMbs: Marble[] = players.map((p,i)=>({
      id:p.id, name:p.name, colorIdx:p.colorIdx,
      d:0, lateral:(i-(numPlayers-1)/2)*16,
      vd:BASE_SPD*(0.88+Math.random()*.1)*(i===winIdx?1.22:1),
      vl:(Math.random()-.5)*.6,
      stun:0, boosting:0, finished:false
    }))
    mbsRef.current=initMbs; setMbs(initMbs)
    camRef.current=[160,80]; setCam([160,80])
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
        let {d,lateral,vd,vl,stun,boosting}=m
        let finished:boolean=m.finished

        const stunFactor = stun>0 ? 0.45 : 1
        const boostFactor = boosting>0 ? 1.85 : 1
        stun=Math.max(0,stun-1)
        boosting=Math.max(0,boosting-1)

        // Gravity: acceleration increases as marble goes down the slope
        const gravity = gravityAt(sp, d)

        d += vd * stunFactor * boostFactor * gravity
        vl += (Math.random()-.5)*.25
        vl *= .95
        lateral += vl * stunFactor

        // Wall bounce
        if(Math.abs(lateral) > HALF_W-9) {
          const sign = lateral>0 ? 1 : -1
          lateral = (HALF_W-9)*sign
          vl = -vl * 0.65
          vd *= 0.9
        }

        const [px,py]=posAtD(sp,d)
        const [nx,ny]=normAtD(sp,d)
        const wx=px+nx*lateral, wy=py+ny*lateral

        // Obstacles
        if(stun===0) {
          for(const ob of obstacles) {
            const dx=wx-ob.wx,dy=wy-ob.wy
            if(dx*dx+dy*dy<(ob.r+9)*(ob.r+9)) {
              stun=ob.type==="puddle"?40:ob.type==="bump"?22:14
              vd=Math.max(vd*(ob.type==="puddle"?0.72:0.82), BASE_SPD*0.4)
              vl=(Math.random()-.5)*2.5
              break
            }
          }
        }

        // Boosts
        if(boosting===0) {
          for(const bo of boosts) {
            const dx=wx-bo.wx,dy=wy-bo.wy
            if(dx*dx+dy*dy<22*22) { boosting=70; break }
          }
        }

        // Finish
        if(d>=sp.total-8) {
          finished=true; d=sp.total
          if(!winnerRef.current) {
            const w={...m,d,lateral,vd,vl,stun,boosting,finished}
            winnerRef.current=w; setWinner(w)
            setTimeout(()=>setPhase("finished"),2000)
          }
        }

        return {...m,d,lateral,vd,vl,stun,boosting,finished}
      })

      mbsRef.current=next; setMbs([...next])

      const live=next.filter(m=>!m.finished)
      const src=live.length>0?live:next
      const cx=src.reduce((s,m)=>s+posAtD(sp,m.d)[0]+normAtD(sp,m.d)[0]*m.lateral,0)/src.length
      const cy=src.reduce((s,m)=>s+posAtD(sp,m.d)[1]+normAtD(sp,m.d)[1]*m.lateral,0)/src.length
      const [pcx,pcy]=camRef.current
      const ncx=pcx+(cx-pcx)*.055, ncy=pcy+(cy-pcy)*.055
      camRef.current=[ncx,ncy]; setCam([ncx,ncy])

      if(phase==="racing") animRef.current=requestAnimationFrame(tick)
    }
    animRef.current=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(animRef.current)
  },[phase])

  const addSip=(id:number)=>{ if(gorgesLeft<=0)return; setGorges(g=>({...g,[id]:(g[id]||0)+1})); setGorgesLeft(l=>l-1) }
  const remSip=(id:number)=>setGorges(g=>{ if((g[id]||0)<=0)return g; setGorgesLeft(l=>l+1); return{...g,[id]:(g[id]||1)-1} })

  const BG:any={ position:"fixed",inset:0,background:"#0a0a14",zIndex:400,display:"flex",flexDirection:"column",alignItems:"center" }

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
            Nombre de joueurs
          </div>
          <div style={{ display:"flex",gap:8 }}>
            {[2,3,4,5,6].filter(n=>n<=members.length).map(n=>(
              <button key={n} onClick={()=>setNumPlayers(n)}
                style={{ flex:1,padding:"10px",borderRadius:10,border:"none",cursor:"pointer",
                  background:numPlayers===n?"linear-gradient(135deg,#ef4444,#b91c1c)":"#1e1e2e",
                  color:numPlayers===n?"#fff":"#6b7280",fontWeight:700,fontSize:15 }}>{n}</button>
            ))}
          </div>
        </div>

        <button onClick={()=>setPhase("colors")}
          style={{ width:"100%",padding:"16px",borderRadius:14,border:"none",cursor:"pointer",
            background:"linear-gradient(135deg,#ef4444,#b91c1c)",color:"#fff",fontSize:17,fontWeight:700 }}>
          Choisir les couleurs →
        </button>
      </div>
    </div>
  )

  // ── COLOR PICK ────────────────────────────────────────────────────────────
  if(phase==="colors") {
    const allPicked = players.every(p=>colorPicks[p.id]!==undefined)
    const usedColors = Object.values(colorPicks)
    return (
      <div style={{...BG,overflowY:"auto"}}>
        <div style={{ width:"100%",maxWidth:380,padding:"20px 16px 60px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
            <h2 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:2,color:"#e2e8f0",margin:0 }}>
              🎨 Couleurs des billes
            </h2>
            <button onClick={()=>setPhase("setup")} style={{ background:"none",border:"none",color:"#6b7280",fontSize:18,cursor:"pointer" }}>←</button>
          </div>

          {players.map(p=>(
            <div key={p.id} style={{ background:"#13131f",borderRadius:14,padding:14,
              border:"1px solid #2a2a3e",marginBottom:12 }}>
              <div style={{ fontSize:12,fontWeight:700,color:"#e2e8f0",marginBottom:10 }}>
                {p.name}
                {colorPicks[p.id]!==undefined&&(
                  <span style={{ marginLeft:8,color:MARBLE_COLORS[colorPicks[p.id]].color }}>
                    ● {MARBLE_COLORS[colorPicks[p.id]].name}
                  </span>
                )}
              </div>
              <div style={{ display:"flex",flexWrap:"wrap" as const,gap:8 }}>
                {MARBLE_COLORS.map((c,ci)=>{
                  const taken = usedColors.includes(ci) && colorPicks[p.id]!==ci
                  return (
                    <button key={ci} onClick={()=>!taken&&setColorPicks(prev=>({...prev,[p.id]:ci}))}
                      disabled={taken}
                      style={{ width:32,height:32,borderRadius:"50%",border:"none",cursor:taken?"not-allowed":"pointer",
                        background:c.color,opacity:taken?0.2:1,
                        outline:colorPicks[p.id]===ci?"3px solid white":"3px solid transparent",
                        boxShadow:colorPicks[p.id]===ci?`0 0 10px ${c.color}`:"none" }}/>
                  )
                })}
              </div>
            </div>
          ))}

          <button onClick={startRace} disabled={!allPicked}
            style={{ width:"100%",padding:"16px",borderRadius:14,border:"none",
              cursor:allPicked?"pointer":"not-allowed",
              background:allPicked?"linear-gradient(135deg,#ef4444,#b91c1c)":"#2a2a3e",
              color:allPicked?"#fff":"#4b5563",fontSize:17,fontWeight:700 }}>
            {allPicked?"🚦 LANCER LA COURSE !":"Chaque joueur choisit sa couleur"}
          </button>
        </div>
      </div>
    )
  }

  // ── RACE ─────────────────────────────────────────────────────────────────
  if(phase==="countdown"||phase==="racing") {
    const [camX,camY]=cam
    const offX=camX-VIEW_W/2, offY=camY-VIEW_H/2
    const w=(x:number)=>x-offX, h=(y:number)=>y-offY
    const inView=(x:number,y:number,pad=40)=>x>offX-pad&&x<offX+VIEW_W+pad&&y>offY-pad&&y<offY+VIEW_H+pad

    const trackSvg=PATH.map(([x,y],i)=>`${i===0?"M":"L"}${w(x).toFixed(1)},${h(y).toFixed(1)}`).join(" ")
    const ranked=[...mbs].sort((a,b)=>b.d-a.d)

    // Start/finish positions
    const [sx,sy]=PATH[0]
    const [fx,fy]=PATH[PATH.length-1]
    const [fnx,fny]=normAtD(sp,sp.total-2)

    // Gradient lines to show slope (horizontal stripes, lighter toward bottom)
    const slopeLines = [100,200,300,400,500,600,700,800,900].map(worldY=>({
      worldY, svgY: h(worldY), opacity: 0.03 + (worldY/940)*0.06
    }))

    return (
      <div style={BG}>
        <div style={{ width:"100%",maxWidth:VIEW_W,padding:"10px 16px 6px",
          display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,color:"#ef4444" }}>🔮 BILLES</div>
          <F1Lights phase={lightPhase}/>
          <button onClick={onClose} style={{ background:"none",border:"none",color:"#6b7280",fontSize:18,cursor:"pointer" }}>✕</button>
        </div>

        <div style={{ width:VIEW_W,height:VIEW_H,overflow:"hidden",background:"#080d12",
          flexShrink:0,borderTop:"1px solid #1e1e2e",borderBottom:"1px solid #1e1e2e" }}>
          <svg width={VIEW_W} height={VIEW_H}>
            <defs>
              <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0a1018"/>
                <stop offset="100%" stopColor="#1a2535"/>
              </linearGradient>
            </defs>
            <rect width={VIEW_W} height={VIEW_H} fill="url(#roadGrad)"/>

            {/* Slope shading lines */}
            {slopeLines.map((l,i)=>
              l.svgY>-5&&l.svgY<VIEW_H+5&&(
                <line key={i} x1="0" y1={l.svgY} x2={VIEW_W} y2={l.svgY}
                  stroke="#60a5fa" strokeWidth="1" opacity={l.opacity}/>
              )
            )}

            {/* Kerbs */}
            <path d={trackSvg} fill="none" stroke="#9ca3af" strokeWidth={ROAD_W+16}
              strokeLinecap="round" strokeLinejoin="round"/>
            <path d={trackSvg} fill="none" stroke="#ef4444" strokeWidth={ROAD_W+16}
              strokeLinecap="round" strokeLinejoin="round" strokeDasharray="14,14" opacity=".75"/>
            {/* Tarmac */}
            <path d={trackSvg} fill="none" stroke="#1a2230" strokeWidth={ROAD_W}
              strokeLinecap="round" strokeLinejoin="round"/>
            <path d={trackSvg} fill="none" stroke="#202d40" strokeWidth={ROAD_W-8}
              strokeLinecap="round" strokeLinejoin="round" strokeDasharray="28,6" opacity=".4"/>
            {/* Center dashes */}
            <path d={trackSvg} fill="none" stroke="#fbbf24" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" strokeDasharray="12,14" opacity=".5"/>

            {/* START line */}
            {inView(sx,sy)&&(
              <g>
                <line x1={w(sx-35)} y1={h(sy)} x2={w(sx+35)} y2={h(sy)}
                  stroke="white" strokeWidth="7" strokeDasharray="7,7"/>
                <text x={w(sx)} y={h(sy)-14} fill="#22c55e" fontSize="10"
                  textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">🚦 DÉPART</text>
              </g>
            )}

            {/* FINISH line — perpendicular to track */}
            {inView(fx,fy,60)&&(
              <g>
                <line
                  x1={w(fx - fny*44)} y1={h(fy + fnx*44)}
                  x2={w(fx + fny*44)} y2={h(fy - fnx*44)}
                  stroke="white" strokeWidth="9" strokeDasharray="9,9"/>
                <text x={w(fx+fny*52)} y={h(fy-fnx*52)} fill="#ef4444" fontSize="10"
                  textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">🏁</text>
                <text x={w(fx+fny*52)} y={h(fy-fnx*52)+12} fill="#ef4444" fontSize="9"
                  textAnchor="middle" fontFamily="sans-serif">ARRIVÉE</text>
              </g>
            )}

            {/* Boosts */}
            {boosts.map((b,i)=>{
              if(!inView(b.wx,b.wy)) return null
              const pulse=(Date.now()/500+i)%1
              return (
                <g key={i}>
                  <circle cx={w(b.wx)} cy={h(b.wy)} r={13+pulse*5} fill="none"
                    stroke="#22c55e" strokeWidth="1.5" opacity={1-pulse}/>
                  <circle cx={w(b.wx)} cy={h(b.wy)} r="11" fill="#22c55e" opacity=".2"/>
                  <text x={w(b.wx)} y={h(b.wy)+4} textAnchor="middle" fontSize="12">⚡</text>
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
                    <line x1={vx-ob.r*.5} y1={vy+ob.r*.05} x2={vx+ob.r*.5} y2={vy+ob.r*.05}
                      stroke="white" strokeWidth="2"/>
                  </>}
                  {ob.type==="puddle"&&<>
                    <ellipse cx={vx} cy={vy} rx={ob.r*1.6} ry={ob.r*.7} fill="#3b82f6" opacity=".5"/>
                    <ellipse cx={vx-ob.r*.4} cy={vy-ob.r*.2} rx={ob.r*.5} ry={ob.r*.25} fill="white" opacity=".3"/>
                  </>}
                  {ob.type==="bump"&&<>
                    <ellipse cx={vx} cy={vy} rx={ob.r*1.4} ry={ob.r*.55} fill="#2a3545"/>
                    <ellipse cx={vx} cy={vy-2} rx={ob.r*1.2} ry={ob.r*.4} fill="#374151"/>
                  </>}
                </g>
              )
            })}

            {/* Marbles — NO names, just colored balls */}
            {mbs.map(m=>{
              const [px,py]=posAtD(sp,m.d)
              const [nx,ny]=normAtD(sp,m.d)
              const wx2=px+nx*m.lateral, wy2=py+ny*m.lateral
              if(!inView(wx2,wy2)) return null
              const vx=w(wx2), vy=h(wy2)
              const mc=MARBLE_COLORS[m.colorIdx].color
              const blink=m.stun>0&&m.stun%6<3
              const boosted=m.boosting>0
              return (
                <g key={m.id}>
                  <ellipse cx={vx+2} cy={vy+5} rx="9" ry="4" fill="black" opacity=".3"/>
                  {boosted&&<circle cx={vx} cy={vy} r="16" fill="#22c55e" opacity=".2"/>}
                  {blink&&<circle cx={vx} cy={vy} r="14" fill="white" opacity=".18"/>}
                  <defs>
                    <radialGradient id={`mg${m.id}`} cx="33%" cy="28%" r="65%">
                      <stop offset="0%" stopColor="white" stopOpacity=".8"/>
                      <stop offset="38%" stopColor={mc}/>
                      <stop offset="100%" stopColor={`${mc}44`}/>
                    </radialGradient>
                  </defs>
                  <circle cx={vx} cy={vy} r="10" fill={`url(#mg${m.id})`}
                    stroke={blink?"white":boosted?"#22c55e":"rgba(255,255,255,.15)"}
                    strokeWidth={blink||boosted?"2":"1"}/>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Legend: color → player, no names on track */}
        <div style={{ width:"100%",maxWidth:VIEW_W,padding:"6px 12px 0",
          display:"flex",gap:5,flexWrap:"wrap" as const,justifyContent:"center",flexShrink:0 }}>
          {ranked.map((m,i)=>{
            const mc=MARBLE_COLORS[m.colorIdx].color
            return (
              <div key={m.id} style={{ display:"flex",alignItems:"center",gap:5,
                background:"#13131f",borderRadius:8,padding:"4px 8px",
                border:`1px solid ${m.finished?mc:"#2a2a3e"}` }}>
                <span style={{ fontSize:10,color:"#6b7280" }}>{i+1}.</span>
                <div style={{ width:12,height:12,borderRadius:"50%",background:mc,
                  boxShadow:m.boosting>0?`0 0 6px ${mc}`:undefined }}/>
                <div style={{ width:36,height:3,borderRadius:1,background:"#1e1e2e" }}>
                  <div style={{ width:`${(m.d/sp.total)*100}%`,height:"100%",
                    borderRadius:1,background:mc,transition:"width .1s" }}/>
                </div>
                {m.boosting>0&&<span style={{ fontSize:9 }}>⚡</span>}
                {m.stun>0&&<span style={{ fontSize:9 }}>😵</span>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── FINISHED ──────────────────────────────────────────────────────────────
  if(phase==="finished"&&winner) {
    const wc=MARBLE_COLORS[winner.colorIdx].color
    const losers=mbs.filter(m=>m.id!==winner.id)
    return (
      <div style={{...BG,overflowY:"auto"}}>
        <div style={{ width:"100%",maxWidth:380,padding:"24px 16px 60px" }}>

          <div style={{ background:"linear-gradient(135deg,#1a0800,#0f0400)",
            border:`2px solid ${wc}`,borderRadius:20,padding:"20px",
            textAlign:"center" as const,marginBottom:16 }}>
            <div style={{ width:44,height:44,borderRadius:"50%",background:wc,
              margin:"0 auto 10px",boxShadow:`0 0 24px ${wc}` }}/>
            <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:14,color:"#9ca3af",
              letterSpacing:2,marginBottom:4 }}>
              {MARBLE_COLORS[winner.colorIdx].name}
            </div>
            <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:30,
              color:wc,letterSpacing:2,marginBottom:4,
              textShadow:`0 0 20px ${wc}` }}>
              {winner.name} GAGNE !
            </div>
            <div style={{ fontSize:12,color:"#9ca3af" }}>
              Tu distribues 10 gorgées comme tu veux 🍺
            </div>
          </div>

          <div style={{ background:"#13131f",borderRadius:14,padding:14,
            border:"1px solid #2a2a3e",marginBottom:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",
              marginBottom:12,alignItems:"center" }}>
              <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",
                letterSpacing:1,textTransform:"uppercase" as const }}>
                Distribuer
              </div>
              <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:22,
                color:gorgesLeft>0?"#fbbf24":"#22c55e" }}>
                {gorgesLeft>0?`${gorgesLeft} restantes`:"✅ OK !"}
              </div>
            </div>
            {losers.map(p=>{
              const lc=MARBLE_COLORS[p.colorIdx].color
              return (
                <div key={p.id} style={{ display:"flex",alignItems:"center",gap:10,
                  padding:"10px 0",borderBottom:"1px solid #1a1a2a" }}>
                  <div style={{ width:14,height:14,borderRadius:"50%",background:lc,flexShrink:0 }}/>
                  <span style={{ flex:1,fontSize:13,color:"#e2e8f0",fontWeight:600 }}>{p.name}</span>
                  <button onClick={()=>remSip(p.id)} disabled={(gorges[p.id]||0)<=0}
                    style={{ width:30,height:30,borderRadius:8,border:"1px solid #2a2a3e",
                      background:"#1e1e2e",color:"#9ca3af",fontSize:16,cursor:"pointer",
                      opacity:(gorges[p.id]||0)<=0?0.3:1 }}>−</button>
                  <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:24,
                    color:lc,width:28,textAlign:"center" as const }}>
                    {gorges[p.id]||0}
                  </div>
                  <button onClick={()=>addSip(p.id)} disabled={gorgesLeft<=0}
                    style={{ width:30,height:30,borderRadius:8,border:"none",
                      background:gorgesLeft>0?lc:"#1e1e2e",
                      color:"#fff",fontSize:16,cursor:"pointer",
                      opacity:gorgesLeft<=0?0.3:1 }}>+</button>
                </div>
              )
            })}
          </div>

          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>{ setPhase("colors"); setWinner(null) }}
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
