"use client"

function playWin() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext
    const ctx = new AC()
    ;[523,659,784,1047].forEach((f,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain()
      o.type='sine'; o.frequency.value=f
      g.gain.setValueAtTime(0,ctx.currentTime+i*0.12)
      g.gain.linearRampToValueAtTime(0.3,ctx.currentTime+i*0.12+0.02)
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.12+0.28)
      o.connect(g);g.connect(ctx.destination)
      o.start(ctx.currentTime+i*0.12);o.stop(ctx.currentTime+i*0.12+0.3)
    })
    setTimeout(()=>ctx.close(),1200)
  } catch {}
}

function playLose() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext
    const ctx = new AC()
    ;[350,280,210].forEach((f,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain()
      o.type='sawtooth'; o.frequency.value=f
      g.gain.setValueAtTime(0.2,ctx.currentTime+i*0.18)
      g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.18+0.22)
      o.connect(g);g.connect(ctx.destination)
      o.start(ctx.currentTime+i*0.18);o.stop(ctx.currentTime+i*0.18+0.25)
    })
    setTimeout(()=>ctx.close(),1000)
  } catch {}
}

import { useState, useEffect, useRef } from "react"

const MARBLE_COLORS = [
  { name:"Rouge",  color:"#ef4444" }, { name:"Bleu",   color:"#3b82f6" },
  { name:"Vert",   color:"#22c55e" }, { name:"Orange", color:"#f59e0b" },
  { name:"Violet", color:"#a855f7" }, { name:"Rose",   color:"#ec4899" },
  { name:"Cyan",   color:"#06b6d4" }, { name:"Lime",   color:"#84cc16" },
  { name:"Blanc",  color:"#f0f0f0" }, { name:"Or",     color:"#d4af37" },
]

// ── TRACK ─────────────────────────────────────────────────────────────────
// Piste simple : départ en HAUT, descend vers le bas avec 2 virages
// Sensation de pente = le path va globalement vers le bas
const PATH: [number,number][] = [
  [200,  60], // DÉPART (haut)
  [200, 180],
  [200, 320],
  [200, 460], // virage 1
  [260, 560],
  [380, 620],
  [500, 620],
  [600, 560],
  [640, 460], // ligne droite droite
  [640, 340],
  [640, 200],
  [640, 100], // virage 2 (épingle)
  [600,  40],
  [520,  20],
  [440,  20],
  [360,  40],
  [300,  80],
  [260, 140],
  [240, 220],
  [240, 340],
  [240, 460],
  [240, 580],
  [240, 700], // longue descente finale
  [240, 820],
  [260, 900],
  [320, 940],
  [400, 960], // ARRIVÉE (bas)
]

const ROAD_W = 72
const HALF  = ROAD_W / 2
const VIEW_W = 360
const VIEW_H = 380

// ── SPLINE ────────────────────────────────────────────────────────────────
function buildSpline(pts: [number,number][]) {
  const d = [0]
  for (let i=1;i<pts.length;i++) {
    const dx=pts[i][0]-pts[i-1][0],dy=pts[i][1]-pts[i-1][1]
    d.push(d[i-1]+Math.sqrt(dx*dx+dy*dy))
  }
  return { pts, d, total: d[d.length-1] }
}
type Sp = ReturnType<typeof buildSpline>

function posAt(sp:Sp, dist:number):[number,number] {
  const c = Math.min(Math.max(dist,0),sp.total)
  for (let i=1;i<sp.d.length;i++) {
    if (sp.d[i]>=c) {
      const seg=sp.d[i]-sp.d[i-1], f=seg>0?(c-sp.d[i-1])/seg:0
      const [ax,ay]=sp.pts[i-1],[bx,by]=sp.pts[i]
      return [ax+(bx-ax)*f, ay+(by-ay)*f]
    }
  }
  return sp.pts[sp.pts.length-1]
}

function normAt(sp:Sp, dist:number):[number,number] {
  const [ax,ay]=posAt(sp,dist)
  const [bx,by]=posAt(sp,Math.min(dist+3,sp.total))
  const len=Math.sqrt((bx-ax)**2+(by-ay)**2)||1
  return [-(by-ay)/len,(bx-ax)/len]
}

// Gravity: bille accélère selon descente dans le PATH (y global)
// Le départ est à y=60, l'arrivée à y=960 → pente réelle
function gravAt(sp:Sp, dist:number):number {
  const [,y]=posAt(sp,dist)
  // La piste monte et descend, on compare avec la position de départ
  // On calcule la pente locale (dy/ds)
  const [,y2]=posAt(sp,Math.min(dist+10,sp.total))
  const slope = (y2-y)/10  // positif = descente
  // Gravité: booste si descente, ralentit légèrement si montée
  return 1 + slope*0.025
}

// ── OBSTACLES ─────────────────────────────────────────────────────────────
const OBS_DEF = [
  {t:0.08,off: 16,type:"cone"  as const,r:9 },
  {t:0.15,off:-18,type:"puddle"as const,r:13},
  {t:0.25,off: 12,type:"bump"  as const,r:11},
  {t:0.35,off:-14,type:"cone"  as const,r:9 },
  {t:0.44,off: 18,type:"puddle"as const,r:13},
  {t:0.52,off:-10,type:"bump"  as const,r:11},
  {t:0.61,off: 16,type:"cone"  as const,r:9 },
  {t:0.70,off:-18,type:"puddle"as const,r:13},
  {t:0.79,off: 12,type:"bump"  as const,r:11},
  {t:0.88,off:-14,type:"cone"  as const,r:9 },
]
const BST_DEF = [
  {t:0.18,off: 0},{t:0.42,off: 8},{t:0.65,off:-8},{t:0.85,off:0},
]

function F1Lights({phase}:{phase:string}) {
  const n=["lights1","lights2","lights3","lights4","lights5"].indexOf(phase)+1
  const go=phase==="go"
  return (
    <div style={{display:"flex",flexDirection:"column"as const,alignItems:"center",gap:3,
      background:"#111",borderRadius:10,padding:"7px 12px",
      border:"2px solid #333",boxShadow:"0 4px 20px rgba(0,0,0,.8)"}}>
      <div style={{display:"flex",gap:7}}>
        {[1,2,3,4,5].map(i=>(
          <div key={i} style={{width:17,height:17,borderRadius:"50%",
            background:go?"#111":n>=i?"#ef4444":"#1a1a1a",
            boxShadow:go?"none":n>=i?"0 0 10px #ef4444,0 0 20px #ef444440":"none",
            border:"2px solid #333",transition:"all .08s"}}/>
        ))}
      </div>
      {go&&<div style={{fontFamily:"'Bebas Neue',cursive",fontSize:17,color:"#22c55e",
        letterSpacing:4,textShadow:"0 0 14px #22c55e"}}>GO !</div>}
    </div>
  )
}

interface Marble {
  id:number;name:string;colorIdx:number
  d:number;lat:number;vd:number;vl:number
  wx:number;wy:number // smoothed world pos for rendering
  stun:number;boost:number;finished:boolean
}

interface Props {members:any[];onClose:()=>void}

export default function MarbleRace({members,onClose}:Props) {
  const activePlayers = members.filter((m:any) => !m.is_sam)
  const [selectedIds,setSelectedIds]=useState<string[]>(activePlayers.slice(0,Math.min(activePlayers.length,4)).map((m:any)=>m.user_id))
  const [picks,setPicks]=useState<Record<number,number>>({})
  const [phase,setPhase]=useState<"setup"|"colors"|"countdown"|"racing"|"finished">("setup")
  const [lp,setLp]=useState("waiting") // light phase
  const [mbs,setMbs]=useState<Marble[]>([])
  const mbRef=useRef<Marble[]>([])
  const [cam,setCam]=useState<[number,number]>([200,60])
  const camRef=useRef<[number,number]>([200,60])
  const [winner,setWinner]=useState<Marble|null>(null)
  const winRef=useRef<Marble|null>(null)
  const animRef=useRef(0)
  const [gorges,setGorges]=useState<Record<number,number>>({})
  const [left,setLeft]=useState(10)
  const sp=useRef(buildSpline(PATH)).current

  // precompute obstacle/boost world positions
  const obs=OBS_DEF.map(o=>{
    const d=o.t*sp.total,[px,py]=posAt(sp,d),[nx,ny]=normAt(sp,d)
    return{...o,d,wx:px+nx*o.off,wy:py+ny*o.off}
  })
  const bst=BST_DEF.map(b=>{
    const d=b.t*sp.total,[px,py]=posAt(sp,d),[nx,ny]=normAt(sp,d)
    return{...b,d,wx:px+nx*b.off,wy:py+ny*b.off}
  })

  const players=selectedIds.map((uid,i)=>{
    const m=members.find((x:any)=>x.user_id===uid)||({}as any)
    return{id:i,name:m.pseudo||`J${i+1}`,colorIdx:picks[i]??i}
  })

  const BASE=7.5 // px/frame base speed

  const doStart=()=>{
    const wi=Math.floor(Math.random()*selectedIds.length)
    winRef.current=null;setWinner(null);setGorges({});setLeft(10)
    const init:Marble[]=players.map((p,i)=>{
      const [wx,wy]=posAt(sp,0)
      return{id:p.id,name:p.name,colorIdx:p.colorIdx,
        d:0,lat:(i-(selectedIds.length-1)/2)*14,vd:BASE*(0.88+Math.random()*.1)*(i===wi?1.2:1),
        vl:(Math.random()-.5)*.5,wx,wy,stun:0,boost:0,finished:false}
    })
    mbRef.current=init;setMbs(init)
    camRef.current=[200,200];setCam([200,200])
    setPhase("countdown");setLp("waiting")
    let step=0
    const LPHASES=["lights1","lights2","lights3","lights4","lights5"]
    const iv=setInterval(()=>{
      if(step<5)setLp(LPHASES[step++])
      else{
        clearInterval(iv)
        setTimeout(()=>{
          setLp("go")
          setTimeout(()=>{setLp("racing");setPhase("racing")},400+Math.random()*500)
        },200)
      }
    },620)
  }

  useEffect(()=>{
    if(phase!=="racing")return
    const tick=()=>{
      const next=mbRef.current.map(m=>{
        if(m.finished)return m
        let{d,lat,vd,vl,stun,boost}=m
        let finished:boolean=m.finished

        const sf=stun>0?0.45:1
        const bf=boost>0?1.6:1
        stun=Math.max(0,stun-1)
        boost=Math.max(0,boost-1)

        // Gravity effect
        const g=gravAt(sp,d)
        d+=vd*sf*bf*Math.max(0.3,g)
        vl+=(Math.random()-.5)*.22;vl*=.94
        lat+=vl*sf

        // Wall bounce
        if(Math.abs(lat)>HALF-8){
          lat=(HALF-8)*(lat>0?1:-1)
          vl=-vl*.6;vd*=.91
        }

        const[px,py]=posAt(sp,d)
        const[nx,ny]=normAt(sp,d)
        const tx=px+nx*lat,ty=py+ny*lat

        // Smooth world position (lerp for rendering)
        const wx=m.wx+(tx-m.wx)*.35
        const wy=m.wy+(ty-m.wy)*.35

        // Obstacle check
        if(stun===0){
          for(const o of obs){
            const dx=tx-o.wx,dy=ty-o.wy
            if(dx*dx+dy*dy<(o.r+9)*(o.r+9)){
              stun=o.type==="puddle"?28:o.type==="bump"?16:10
              vd=Math.max(vd*(o.type==="puddle"?.72:.83),BASE*.38)
              vl=(Math.random()-.5)*2.2;break
            }
          }
        }
        // Boost check
        if(boost===0){
          for(const b of bst){
            const dx=tx-b.wx,dy=ty-b.wy
            if(dx*dx+dy*dy<21*21){boost=65;break}
          }
        }
        // Finish
        if(d>=sp.total-6){
          finished=true;d=sp.total
          if(!winRef.current){
            const w={...m,d,lat,vd,vl,stun,boost,wx,wy,finished}
            winRef.current=w;setWinner(w)
            setTimeout(()=>setPhase("finished"),2200)
          }
        }
        return{...m,d,lat,vd,vl,stun,boost,wx,wy,finished}
      })

      // Camera: smooth lerp toward lead marble
      const live=next.filter(m=>!m.finished)
      const lead=(live.length?live:next).sort((a,b)=>b.d-a.d)[0]
      const[pcx,pcy]=camRef.current
      const ncx=pcx+(lead.wx-pcx)*.06
      const ncy=pcy+(lead.wy-pcy)*.06
      camRef.current=[ncx,ncy];setCam([ncx,ncy])

      mbRef.current=next;setMbs([...next])
      if(phase==="racing")animRef.current=requestAnimationFrame(tick)
    }
    animRef.current=requestAnimationFrame(tick)
    return()=>cancelAnimationFrame(animRef.current)
  },[phase])

  const addSip=(id:number)=>{if(left<=0)return;setGorges(g=>({...g,[id]:(g[id]||0)+1}));setLeft(l=>l-1)}
  const remSip=(id:number)=>setGorges(g=>{if((g[id]||0)<=0)return g;setLeft(l=>l+1);return{...g,[id]:(g[id]||1)-1}})

  const BG:any={position:"fixed",inset:0,background:"#0a0a14",zIndex:400,
    display:"flex",flexDirection:"column",alignItems:"center"}

  // ── SETUP v2 ─────────────────────────────────────────────────────────────
  if(phase==="setup")return(
    <div style={{...BG,overflowY:"auto"}}>
      <div style={{width:"100%",maxWidth:380,padding:"24px 16px 60px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,letterSpacing:3,
            background:"linear-gradient(135deg,#ef4444,#f59e0b)",WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent",margin:0}}>🔮 COURSE DE BILLES</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#6b7280",fontSize:22,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{background:"#13131f",borderRadius:14,padding:14,border:"1px solid #2a2a3e",marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase"as const,marginBottom:10}}>
            Joueurs ({selectedIds.length}/6)
          </div>
          {activePlayers.map((m:any,i:number)=>{
            const sel=selectedIds.includes(m.user_id)
            const idx=selectedIds.indexOf(m.user_id)
            const color=sel?MARBLE_COLORS[picks[idx]??idx]?.color||"#a855f7":"#2a2a3e"
            return(
              <button key={m.user_id} onClick={()=>{
                if(sel){
                  if(selectedIds.length<=2)return // min 2
                  setSelectedIds(s=>s.filter(x=>x!==m.user_id))
                  setPicks({}) // reset picks quand on change les joueurs
                } else {
                  if(selectedIds.length>=6)return // max 6
                  setSelectedIds(s=>[...s,m.user_id])
                  setPicks({})
                }
              }}
                style={{display:"flex",alignItems:"center",gap:12,padding:"11px 12px",
                  borderRadius:12,border:"none",cursor:"pointer",width:"100%",marginBottom:8,
                  background:sel?`${color}18`:"#1e1e2e",
                  outline:sel?`2px solid ${color}`:"2px solid transparent"}}>
                <div style={{width:14,height:14,borderRadius:"50%",background:sel?color:"#374151",flexShrink:0}}/>
                <span style={{fontSize:13,fontWeight:600,color:"#e2e8f0",flex:1,textAlign:"left"as const}}>{m.pseudo}</span>
                {sel&&<span style={{fontSize:11,color,fontWeight:700}}>✓</span>}
              </button>
            )
          })}
        </div>
        <div style={{background:"#13131f",borderRadius:14,padding:12,border:"1px solid #2a2a3e",marginBottom:18,
          fontSize:12,color:"#6b7280",lineHeight:1.7}}>
          ⬇️ Piste en descente · 🔵 Boosts · 🟠 Cônes · 💧 Flaques · ⬛ Dos d'âne
        </div>
        <button onClick={()=>{ if(selectedIds.length>=2) setPhase("colors") }}
          disabled={selectedIds.length<2}
          style={{width:"100%",padding:"16px",borderRadius:14,border:"none",
            cursor:selectedIds.length>=2?"pointer":"not-allowed",
            background:selectedIds.length>=2?"linear-gradient(135deg,#ef4444,#b91c1c)":"#2a2a3e",
            color:selectedIds.length>=2?"#fff":"#4b5563",fontSize:17,fontWeight:700}}>
          {selectedIds.length>=2?"Choisir les couleurs →":"Sélectionne au moins 2 joueurs"}
        </button>
      </div>
    </div>
  )

  // ── COLOR PICK ────────────────────────────────────────────────────────
  if(phase==="colors"){
    const allPicked=players.every(p=>picks[p.id]!==undefined)
    const used=Object.values(picks)
    return(
      <div style={{...BG,overflowY:"auto"}}>
        <div style={{width:"100%",maxWidth:380,padding:"20px 16px 60px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:2,color:"#e2e8f0",margin:0}}>
              🎨 Couleurs des billes
            </h2>
            <button onClick={()=>setPhase("setup")} style={{background:"none",border:"none",color:"#6b7280",fontSize:18,cursor:"pointer"}}>←</button>
          </div>
          {players.map(p=>(
            <div key={p.id} style={{background:"#13131f",borderRadius:14,padding:14,
              border:"1px solid #2a2a3e",marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0",marginBottom:10}}>
                {p.name}
                {picks[p.id]!==undefined&&(
                  <span style={{marginLeft:8,color:MARBLE_COLORS[picks[p.id]].color}}>
                    ● {MARBLE_COLORS[picks[p.id]].name}
                  </span>
                )}
              </div>
              <div style={{display:"flex",flexWrap:"wrap"as const,gap:9}}>
                {MARBLE_COLORS.map((c,ci)=>{
                  const taken=used.includes(ci)&&picks[p.id]!==ci
                  return(
                    <button key={ci} onClick={()=>!taken&&setPicks(prev=>({...prev,[p.id]:ci}))}
                      disabled={taken}
                      style={{width:34,height:34,borderRadius:"50%",border:"none",cursor:taken?"not-allowed":"pointer",
                        background:c.color,opacity:taken?.18:1,
                        outline:picks[p.id]===ci?"3px solid white":"3px solid transparent",
                        boxShadow:picks[p.id]===ci?`0 0 10px ${c.color}`:"none"}}/>
                  )
                })}
              </div>
            </div>
          ))}
          <button onClick={doStart} disabled={!allPicked}
            style={{width:"100%",padding:"16px",borderRadius:14,border:"none",
              cursor:allPicked?"pointer":"not-allowed",
              background:allPicked?"linear-gradient(135deg,#ef4444,#b91c1c)":"#2a2a3e",
              color:allPicked?"#fff":"#4b5563",fontSize:17,fontWeight:700}}>
            {allPicked?"🚦 LANCER LA COURSE !":"Chaque joueur choisit sa couleur"}
          </button>
        </div>
      </div>
    )
  }

  // ── RACE ─────────────────────────────────────────────────────────────────
  if(phase==="countdown"||phase==="racing"){
    const[camX,camY]=cam
    const ox=camX-VIEW_W/2,oy=camY-VIEW_H/2
    const vx=(x:number)=>x-ox, vy=(y:number)=>y-oy
    const vis=(x:number,y:number,p=40)=>x>ox-p&&x<ox+VIEW_W+p&&y>oy-p&&y<oy+VIEW_H+p

    const tsvg=PATH.map(([x,y],i)=>`${i===0?"M":"L"}${vx(x).toFixed(1)},${vy(y).toFixed(1)}`).join(" ")
    const ranked=[...mbs].sort((a,b)=>b.d-a.d)

    // Finish line: last point, perpendicular
    const[fx,fy]=PATH[PATH.length-1]
    const[fnx,fny]=normAt(sp,sp.total)
    // finLine: two endpoints
    const fl1=[fx-fny*42,fy+fnx*42] as [number,number]
    const fl2=[fx+fny*42,fy-fnx*42] as [number,number]

    // Speed arrows (slope effect visual): small arrows pointing down along steep sections
    const arrowDs=[0.05,0.15,0.55,0.65,0.72,0.80].map(t=>{
      const d=t*sp.total
      const[px,py]=posAt(sp,d)
      const g=gravAt(sp,d)
      return{x:px,y:py,g}
    }).filter(a=>a.g>1.05) // only on downslopes

    return(
      <div style={BG}>
        <div style={{width:"100%",maxWidth:VIEW_W,padding:"10px 16px 6px",
          display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:3,color:"#ef4444"}}>🔮 BILLES</div>
          <F1Lights phase={lp}/>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#6b7280",fontSize:18,cursor:"pointer"}}>✕</button>
        </div>

        <div style={{width:VIEW_W,height:VIEW_H,overflow:"hidden",
          flexShrink:0,borderTop:"1px solid #1e1e2e",borderBottom:"1px solid #1e1e2e",
          position:"relative"}}>

          {/* Gradient overlay: top lighter, bottom darker (slope illusion) */}
          <div style={{position:"absolute",inset:0,
            background:"linear-gradient(to bottom, rgba(100,180,255,.07) 0%, rgba(0,0,0,.18) 100%)",
            pointerEvents:"none",zIndex:2}}/>

          <svg width={VIEW_W} height={VIEW_H} style={{display:"block"}}>
            <defs>
              <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0d1825"/>
                <stop offset="100%" stopColor="#060d14"/>
              </linearGradient>
            </defs>
            <rect width={VIEW_W} height={VIEW_H} fill="url(#bg)"/>

            {/* Kerbs */}
            <path d={tsvg} fill="none" stroke="#888" strokeWidth={ROAD_W+14}
              strokeLinecap="round" strokeLinejoin="round"/>
            <path d={tsvg} fill="none" stroke="#ef4444" strokeWidth={ROAD_W+14}
              strokeLinecap="round" strokeLinejoin="round" strokeDasharray="13,13" opacity=".75"/>
            {/* Tarmac — darker at bottom for depth */}
            <path d={tsvg} fill="none" stroke="#1a2230" strokeWidth={ROAD_W}
              strokeLinecap="round" strokeLinejoin="round"/>
            <path d={tsvg} fill="none" stroke="#1f2d40" strokeWidth={ROAD_W-10}
              strokeLinecap="round" strokeLinejoin="round" strokeDasharray="26,7" opacity=".4"/>
            {/* Center dashes */}
            <path d={tsvg} fill="none" stroke="#fbbf24" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" strokeDasharray="12,14" opacity=".5"/>

            {/* Slope arrows */}
            {arrowDs.map((a,i)=>{
              if(!vis(a.x,a.y))return null
              const[tx,ty]=normAt(sp,(i+.5)*.15*sp.total)
              const intensity=Math.min((a.g-1)*4,1)
              return(
                <g key={i} opacity={intensity*.5}>
                  <polygon points={`${vx(a.x)},${vy(a.y)+8} ${vx(a.x)-5},${vy(a.y)-2} ${vx(a.x)+5},${vy(a.y)-2}`}
                    fill="#60a5fa" opacity=".4"/>
                </g>
              )
            })}

            {/* START */}
            {vis(PATH[0][0],PATH[0][1])&&(
              <g>
                <line x1={vx(165)} y1={vy(60)} x2={vx(235)} y2={vy(60)}
                  stroke="white" strokeWidth="6" strokeDasharray="6,6"/>
                <text x={vx(200)} y={vy(45)} fill="#22c55e" fontSize="10"
                  textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">🚦 DÉPART</text>
              </g>
            )}

            {/* FINISH — proper perpendicular line */}
            {vis(fx,fy,80)&&(
              <g>
                <line x1={vx(fl1[0])} y1={vy(fl1[1])} x2={vx(fl2[0])} y2={vy(fl2[1])}
                  stroke="white" strokeWidth="8" strokeDasharray="8,8"/>
                <line x1={vx(fl1[0])} y1={vy(fl1[1])} x2={vx(fl2[0])} y2={vy(fl2[1])}
                  stroke="#111" strokeWidth="8" strokeDasharray="8,8" strokeDashoffset="8"/>
                <text x={vx(fx+fny*54)} y={vy(fy-fnx*54)} fill="#ef4444" fontSize="10"
                  textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">🏁</text>
                <text x={vx(fx+fny*54)} y={vy(fy-fnx*54)+13} fill="#ef4444" fontSize="9"
                  textAnchor="middle" fontFamily="sans-serif">ARRIVÉE</text>
              </g>
            )}

            {/* Boosts */}
            {bst.map((b,i)=>{
              if(!vis(b.wx,b.wy))return null
              const pulse=(Date.now()/600+i)%1
              return(
                <g key={i}>
                  <circle cx={vx(b.wx)} cy={vy(b.wy)} r={11+pulse*6} fill="none"
                    stroke="#22c55e" strokeWidth="1.5" opacity={1-pulse}/>
                  <circle cx={vx(b.wx)} cy={vy(b.wy)} r="10" fill="#22c55e" opacity=".18"/>
                  <text x={vx(b.wx)} y={vy(b.wy)+4} textAnchor="middle" fontSize="11">⚡</text>
                </g>
              )
            })}

            {/* Obstacles */}
            {obs.map((o,i)=>{
              if(!vis(o.wx,o.wy))return null
              const x=vx(o.wx),y=vy(o.wy)
              return(
                <g key={i}>
                  {o.type==="cone"&&<>
                    <polygon points={`${x},${y-o.r} ${x-o.r*.8},${y+o.r*.6} ${x+o.r*.8},${y+o.r*.6}`}
                      fill="#f97316" stroke="white" strokeWidth="1.5"/>
                    <line x1={x-o.r*.5} y1={y+o.r*.05} x2={x+o.r*.5} y2={y+o.r*.05} stroke="white" strokeWidth="2"/>
                  </>}
                  {o.type==="puddle"&&<>
                    <ellipse cx={x} cy={y} rx={o.r*1.6} ry={o.r*.7} fill="#3b82f6" opacity=".5"/>
                    <ellipse cx={x-o.r*.4} cy={y-o.r*.2} rx={o.r*.5} ry={o.r*.25} fill="white" opacity=".3"/>
                  </>}
                  {o.type==="bump"&&<>
                    <ellipse cx={x} cy={y} rx={o.r*1.4} ry={o.r*.55} fill="#2a3545"/>
                    <ellipse cx={x} cy={y-2} rx={o.r*1.2} ry={o.r*.4} fill="#374151"/>
                  </>}
                </g>
              )
            })}

            {/* Marbles — smooth rendered position */}
            {mbs.map(m=>{
              if(!vis(m.wx,m.wy))return null
              const x=vx(m.wx),y=vy(m.wy)
              const mc=MARBLE_COLORS[m.colorIdx].color
              const blink=m.stun>0&&m.stun%6<3
              const boosted=m.boost>0
              // Speed trail: show motion blur
              const[px2,py2]=posAt(sp,Math.max(0,m.d-15))
              const[nx2,ny2]=normAt(sp,Math.max(0,m.d-15))
              const tx2=px2+nx2*m.lat,ty2=py2+ny2*m.lat
              return(
                <g key={m.id}>
                  {/* Motion trail */}
                  {phase==="racing"&&m.vd>BASE*.9&&(
                    <line x1={vx(tx2)} y1={vy(ty2)} x2={x} y2={y}
                      stroke={mc} strokeWidth="4" opacity=".2" strokeLinecap="round"/>
                  )}
                  {/* Shadow */}
                  <ellipse cx={x+2} cy={y+5} rx="9" ry="4" fill="black" opacity=".3"/>
                  {boosted&&<circle cx={x} cy={y} r="16" fill="#22c55e" opacity=".18"/>}
                  {blink&&<circle cx={x} cy={y} r="14" fill="white" opacity=".16"/>}
                  <defs>
                    <radialGradient id={`g${m.id}`} cx="33%" cy="28%" r="65%">
                      <stop offset="0%" stopColor="white" stopOpacity=".8"/>
                      <stop offset="38%" stopColor={mc}/>
                      <stop offset="100%" stopColor={`${mc}44`}/>
                    </radialGradient>
                  </defs>
                  <circle cx={x} cy={y} r="10" fill={`url(#g${m.id})`}
                    stroke={blink?"white":boosted?"#22c55e":"rgba(255,255,255,.12)"}
                    strokeWidth={blink||boosted?"2":"1"}/>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Ranking */}
        <div style={{width:"100%",maxWidth:VIEW_W,padding:"7px 12px 0",
          display:"flex",gap:5,flexWrap:"wrap"as const,justifyContent:"center",flexShrink:0}}>
          {ranked.map((m,i)=>{
            const mc=MARBLE_COLORS[m.colorIdx].color
            return(
              <div key={m.id} style={{display:"flex",alignItems:"center",gap:5,
                background:"#13131f",borderRadius:8,padding:"4px 8px",
                border:`1px solid ${m.finished?mc:"#2a2a3e"}`}}>
                <span style={{fontSize:10,color:"#6b7280"}}>{i+1}.</span>
                <div style={{width:11,height:11,borderRadius:"50%",background:mc}}/>
                <div style={{width:36,height:3,borderRadius:1,background:"#1e1e2e"}}>
                  <div style={{width:`${(m.d/sp.total)*100}%`,height:"100%",
                    borderRadius:1,background:mc,transition:"width .1s"}}/>
                </div>
                {m.boost>0&&<span style={{fontSize:9}}>⚡</span>}
                {m.stun>0&&<span style={{fontSize:9}}>😵</span>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── FINISHED ────────────────────────────────────────────────────────────
  if(phase==="finished"&&winner){
    const wc=MARBLE_COLORS[winner.colorIdx].color
    const losers=mbs.filter(m=>m.id!==winner.id)
    return(
      <div style={{...BG,overflowY:"auto"}}>
        <div style={{width:"100%",maxWidth:380,padding:"24px 16px 60px"}}>
          <div style={{background:"linear-gradient(135deg,#1a0800,#0f0400)",
            border:`2px solid ${wc}`,borderRadius:20,padding:"20px",
            textAlign:"center"as const,marginBottom:16}}>
            <div style={{width:44,height:44,borderRadius:"50%",background:wc,
              margin:"0 auto 10px",boxShadow:`0 0 24px ${wc}`,
              backgroundImage:`radial-gradient(circle at 35% 30%, white, ${wc})`}}/>
            <div style={{fontSize:12,color:"#9ca3af",letterSpacing:2,marginBottom:4}}>
              Bille {MARBLE_COLORS[winner.colorIdx].name}
            </div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:30,
              color:wc,letterSpacing:2,marginBottom:6,textShadow:`0 0 20px ${wc}`}}>
              {winner.name} GAGNE !
            </div>
            <div style={{fontSize:12,color:"#9ca3af"}}>
              Distribue 10 gorgées comme tu veux 🍺
            </div>
          </div>

          <div style={{background:"#13131f",borderRadius:14,padding:14,
            border:"1px solid #2a2a3e",marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",
              marginBottom:12,alignItems:"center"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#6b7280",
                letterSpacing:1,textTransform:"uppercase"as const}}>Distribuer</div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,
                color:left>0?"#fbbf24":"#22c55e"}}>
                {left>0?`${left} restantes`:"✅ Validé !"}
              </div>
            </div>
            {losers.map(p=>{
              const lc=MARBLE_COLORS[p.colorIdx].color
              return(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,
                  padding:"10px 0",borderBottom:"1px solid #1a1a2a"}}>
                  <div style={{width:14,height:14,borderRadius:"50%",background:lc,flexShrink:0}}/>
                  <span style={{flex:1,fontSize:13,color:"#e2e8f0",fontWeight:600}}>{p.name}</span>
                  <button onClick={()=>remSip(p.id)} disabled={(gorges[p.id]||0)<=0}
                    style={{width:30,height:30,borderRadius:8,border:"1px solid #2a2a3e",
                      background:"#1e1e2e",color:"#9ca3af",fontSize:16,cursor:"pointer",
                      opacity:(gorges[p.id]||0)<=0?0.3:1}}>−</button>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,
                    color:lc,width:28,textAlign:"center"as const}}>
                    {gorges[p.id]||0}
                  </div>
                  <button onClick={()=>addSip(p.id)} disabled={left<=0}
                    style={{width:30,height:30,borderRadius:8,border:"none",
                      background:left>0?lc:"#1e1e2e",color:"#fff",fontSize:16,cursor:"pointer",
                      opacity:left<=0?0.3:1}}>+</button>
                </div>
              )
            })}
          </div>

          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>{setPhase("colors");setWinner(null)}}
              style={{flex:1,padding:"12px",borderRadius:12,border:"1px solid #2a2a3e",
                cursor:"pointer",background:"#1e1e2e",color:"#9ca3af",fontSize:13,fontWeight:700}}>
              🔄 Rejouer
            </button>
            <button onClick={onClose} disabled={left>0}
              style={{flex:2,padding:"12px",borderRadius:12,border:"none",
                cursor:left>0?"not-allowed":"pointer",
                background:left>0?"#2a2a3e":"linear-gradient(135deg,#22c55e,#16a34a)",
                color:left>0?"#4b5563":"#fff",fontSize:13,fontWeight:700}}>
              {left>0?`Encore ${left}…`:"✅ C'est parti !"}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
