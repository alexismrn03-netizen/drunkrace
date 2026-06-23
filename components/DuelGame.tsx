"use client"
import { useState, useEffect, useRef } from "react"
import { DRINK_BASES, DRINK_CATEGORIES, alcoholGrams, calcDistance, type DrinkEntry } from "@/lib/drinks"

type Phase = "setup" | "ready1" | "lights" | "p1" | "ready2" | "p2" | "result"

// ── SOUND ENGINE ─────────────────────────────────────────────────────────────
function playSound(type: "light_on" | "go" | "stop" | "beep") {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new AudioCtx()
    // Resume context if suspended (iOS Safari requires user gesture)
    if (ctx.state === "suspended") ctx.resume()
    const g = ctx.createGain()
    g.connect(ctx.destination)

    if (type === "light_on") {
      // Deep thump when each red light turns on
      const o = ctx.createOscillator()
      o.connect(g)
      o.type = "sine"
      o.frequency.setValueAtTime(80, ctx.currentTime)
      o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15)
      g.gain.setValueAtTime(0.5, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      o.start(); o.stop(ctx.currentTime + 0.2)
    }

    if (type === "go") {
      // High-pitched GO sound — ascending beeps
      ;[0, 0.08, 0.16].forEach((delay, i) => {
        const o = ctx.createOscillator()
        const gNode = ctx.createGain()
        o.connect(gNode); gNode.connect(ctx.destination)
        o.type = "square"
        o.frequency.setValueAtTime(440 + i * 220, ctx.currentTime + delay)
        gNode.gain.setValueAtTime(0.3, ctx.currentTime + delay)
        gNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.25)
        o.start(ctx.currentTime + delay)
        o.stop(ctx.currentTime + delay + 0.25)
      })
    }

    if (type === "stop") {
      // Buzzer / finish sound
      const o = ctx.createOscillator()
      o.connect(g)
      o.type = "sawtooth"
      o.frequency.setValueAtTime(660, ctx.currentTime)
      o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.3)
      g.gain.setValueAtTime(0.4, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
      o.start(); o.stop(ctx.currentTime + 0.35)
    }

    if (type === "beep") {
      // Countdown tick
      const o = ctx.createOscillator()
      o.connect(g)
      o.type = "sine"
      o.frequency.setValueAtTime(880, ctx.currentTime)
      g.gain.setValueAtTime(0.2, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
      o.start(); o.stop(ctx.currentTime + 0.1)
    }
  } catch (e) { /* Audio not supported */ }
}

interface Player {
  name: string
  drinkId: string
  vol_cl: number
  time: number | null
}

interface Props {
  members: any[]
  onAwardDistance: (userId: string, delta: number, drink: any) => void
  onClose: () => void
}

const DRINK_CATALOG = DRINK_BASES

export default function DuelGame({ members, onAwardDistance, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("setup")
  const [p1, setP1] = useState<Player>({ name: "", drinkId: "shot_vodka", vol_cl: 4, time: null })
  const [p2, setP2] = useState<Player>({ name: "", drinkId: "shot_vodka", vol_cl: 4, time: null })
  const [p1UserId, setP1UserId] = useState("")
  const [p2UserId, setP2UserId] = useState("")
  const [lights, setLights] = useState(0) // 0-5 lights on, then -1 = GO
  const [currentPlayer, setCurrentPlayer] = useState<1|2>(1)
  const [drinking, setDrinking] = useState(false)
  const [startTime, setStartTime] = useState<number>(0)
  const [elapsed, setElapsed] = useState(0)
  const [cat, setCat] = useState("Shots")
  const intervalRef = useRef<any>(null)
  const lightsRef = useRef<any>(null)

  // Timer tick
  useEffect(() => {
    if (drinking) {
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - startTime)
      }, 50)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [drinking, startTime])

  const startLightsAndTimer = (targetPhase: "p1" | "p2") => {
    setPhase("lights")
    setLights(0)
    setDrinking(false)
    setElapsed(0)
    let count = 0
    lightsRef.current = setInterval(() => {
      count++
      if (count <= 5) {
        setLights(count)
        playSound("light_on")
      } else {
        clearInterval(lightsRef.current)
        const delay = 200 + Math.random() * 600
        setTimeout(() => {
          setLights(-1)
          setPhase(targetPhase)
          playSound("go")
          const t = Date.now()
          setStartTime(t)
          setDrinking(true)
        }, delay)
      }
    }, 700)
  }

  const startLights = () => setPhase("ready1")

  const handlePress = () => {
    if (phase === "p1" && drinking) {
      playSound("stop")
      const time = Date.now() - startTime
      setP1(prev => ({ ...prev, time }))
      setDrinking(false)
      setElapsed(time)
      setTimeout(() => { setPhase("ready2") }, 800)
    } else if (phase === "p2" && drinking) {
      playSound("stop")
      const time = Date.now() - startTime
      setP2(prev => ({ ...prev, time }))
      setDrinking(false)
      setElapsed(time)
      setPhase("result")
    }
  }

  const applyResults = () => {
    const p1Drink = DRINK_CATALOG.find(d => d.id === p1.drinkId)
    const p2Drink = DRINK_CATALOG.find(d => d.id === p2.drinkId)
    const p1Won = (p1.time || 99999) < (p2.time || 99999)

    if (p1UserId && p1Drink) {
      const alc = alcoholGrams(p1.vol_cl, p1Drink.degree_pct)
      const dist = calcDistance(alc, p1.vol_cl)
      onAwardDistance(p1UserId, dist + (p1Won ? 10 : -5), { ...p1Drink, vol_cl: p1.vol_cl })
    }
    if (p2UserId && p2Drink) {
      const alc = alcoholGrams(p2.vol_cl, p2Drink.degree_pct)
      const dist = calcDistance(alc, p2.vol_cl)
      onAwardDistance(p2UserId, dist + (!p1Won ? 10 : -5), { ...p2Drink, vol_cl: p2.vol_cl })
    }
    onClose()
  }

  const fmt = (ms: number) => `${(ms / 1000).toFixed(2)}s`

  const PlayerSetup = ({ player, setPlayer, userId, setUserId, label }: any) => {
    const base = DRINK_CATALOG.find(d => d.id === player.drinkId)
    const filteredDrinks = DRINK_CATALOG.filter(d => d.category === cat)
    return (
      <div style={{ background:"#13131f",borderRadius:14,padding:14,border:"1px solid #2a2a3e",marginBottom:12 }}>
        <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase" as const,marginBottom:10 }}>{label}</div>
        {/* Member select */}
        <select value={userId} onChange={e => { setUserId(e.target.value); setPlayer((p:any) => ({ ...p, name: members.find(m=>m.user_id===e.target.value)?.pseudo || "" })) }}
          style={{ width:"100%",padding:"10px 12px",borderRadius:10,background:"#1e1e2e",border:"1px solid #2a2a3e",color:"#e2e8f0",fontSize:13,marginBottom:10,outline:"none" }}>
          <option value="">Choisir un joueur</option>
          {members.map((m:any) => <option key={m.user_id} value={m.user_id}>{m.pseudo}</option>)}
        </select>
        {/* Drink category */}
        <div style={{ display:"flex",gap:6,marginBottom:10,overflowX:"auto" as const }}>
          {DRINK_CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{ padding:"4px 10px",borderRadius:16,border:"none",cursor:"pointer",whiteSpace:"nowrap" as const,background:cat===c?"linear-gradient(135deg,#a855f7,#ec4899)":"#1e1e2e",color:cat===c?"#fff":"#6b7280",fontSize:10,fontWeight:cat===c?700:400 }}>{c}</button>
          ))}
        </div>
        {/* Drink select */}
        <select value={player.drinkId} onChange={e => {
          const d = DRINK_CATALOG.find(x=>x.id===e.target.value)
          setPlayer((p:any) => ({ ...p, drinkId: e.target.value, vol_cl: d?.volumes[0] || 4 }))
        }} style={{ width:"100%",padding:"10px 12px",borderRadius:10,background:"#1e1e2e",border:"1px solid #2a2a3e",color:"#e2e8f0",fontSize:13,marginBottom:8,outline:"none" }}>
          {filteredDrinks.map(d => <option key={d.id} value={d.id}>{d.emoji} {d.name} ({d.degree_pct}%)</option>)}
        </select>
        {/* Volume */}
        {base && (
          <div style={{ display:"flex",gap:6,flexWrap:"wrap" as const }}>
            {base.volumes.map(v => (
              <button key={v} onClick={() => setPlayer((p:any) => ({ ...p, vol_cl: v }))} style={{ padding:"6px 12px",borderRadius:10,border:"none",cursor:"pointer",background:player.vol_cl===v?"linear-gradient(135deg,#a855f720,#ec489920)":"#1e1e2e",outline:player.vol_cl===v?"2px solid #a855f7":"2px solid transparent",color:"#e2e8f0",fontSize:12,fontWeight:player.vol_cl===v?700:400 }}>
                {v}cl
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── SETUP PHASE ──────────────────────────────────────────────────────────
  if (phase === "setup") return (
    <div style={{ position:"fixed",inset:0,background:"#0a0a14",zIndex:400,overflowY:"auto",padding:"20px 16px 40px" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive",fontSize:28,letterSpacing:3,background:"linear-gradient(135deg,#c084fc,#ec4899)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",margin:0 }}>
          🏎️ DUEL DE SHOTS
        </h2>
        <button onClick={onClose} style={{ background:"none",border:"none",color:"#6b7280",fontSize:22,cursor:"pointer" }}>✕</button>
      </div>

      <div style={{ background:"#13131f",borderRadius:14,padding:14,border:"1px solid #2a2a3e",marginBottom:16 }}>
        <div style={{ fontSize:12,color:"#9ca3af",lineHeight:1.6 }}>
          🏁 Deux joueurs boivent leur verre au signal.<br/>
          Le plus rapide gagne <span style={{ color:"#4ade80",fontWeight:700 }}>+10m</span>, le perdant perd <span style={{ color:"#f87171",fontWeight:700 }}>−5m</span>.<br/>
          La distance de la boisson est ajoutée pour les deux.
        </div>
      </div>

      <PlayerSetup player={p1} setPlayer={setP1} userId={p1UserId} setUserId={setP1UserId} label="🔴 Joueur 1"/>
      <PlayerSetup player={p2} setPlayer={setP2} userId={p2UserId} setUserId={setP2UserId} label="🔵 Joueur 2"/>

      <button onClick={startLights} disabled={!p1UserId || !p2UserId}
        style={{ width:"100%",padding:"16px",borderRadius:14,border:"none",cursor:p1UserId&&p2UserId?"pointer":"not-allowed",background:p1UserId&&p2UserId?"linear-gradient(135deg,#a855f7,#ec4899)":"#2a2a3e",color:p1UserId&&p2UserId?"#fff":"#6b7280",fontSize:16,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif" }}>
        🏁 Lancer le duel !
      </button>
    </div>
  )

  // ── READY 1 ──────────────────────────────────────────────────────────────
  if (phase === "ready1") {
    const drink = DRINK_CATALOG.find(d => d.id === p1.drinkId)
    return (
      <div style={{ position:"fixed",inset:0,background:"#0a0a14",zIndex:400,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24 }}>
        <div style={{ background:"#1c0505",border:"2px solid #ef4444",borderRadius:24,padding:"32px 24px",textAlign:"center",width:"100%",maxWidth:340,marginBottom:32 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:16,color:"#ef4444",letterSpacing:3,marginBottom:8 }}>🔴 JOUEUR 1</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:28,color:"#e2e8f0",letterSpacing:2,marginBottom:16 }}>{p1.name || "Joueur 1"}</div>
          <div style={{ background:"#0f0f1a",borderRadius:12,padding:"12px",marginBottom:8 }}>
            <div style={{ fontSize:20,marginBottom:4 }}>{drink?.emoji}</div>
            <div style={{ fontSize:14,color:"#e2e8f0",fontWeight:600 }}>{drink?.name} {p1.vol_cl}cl</div>
            <div style={{ fontSize:11,color:"#6b7280" }}>{drink?.degree_pct}%</div>
          </div>
          <div style={{ fontSize:12,color:"#6b7280",marginTop:8 }}>Prends ton verre en main 🍺</div>
        </div>
        <button onClick={()=>{ playSound("beep"); startLightsAndTimer("p1") }} style={{ width:"100%",maxWidth:340,padding:"20px",borderRadius:18,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#ef4444,#dc2626)",color:"#fff",fontSize:20,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",boxShadow:"0 0 30px #ef444460" }}>
          🚦 JE SUIS PRÊT !
        </button>
      </div>
    )
  }

  // ── READY 2 ──────────────────────────────────────────────────────────────
  if (phase === "ready2") {
    const drink = DRINK_CATALOG.find(d => d.id === p2.drinkId)
    return (
      <div style={{ position:"fixed",inset:0,background:"#0a0a14",zIndex:400,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24 }}>
        <div style={{ background:"#0c1a3a",border:"2px solid #3b82f6",borderRadius:24,padding:"32px 24px",textAlign:"center",width:"100%",maxWidth:340,marginBottom:16 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:16,color:"#3b82f6",letterSpacing:3,marginBottom:8 }}>🔵 JOUEUR 2</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:28,color:"#e2e8f0",letterSpacing:2,marginBottom:16 }}>{p2.name || "Joueur 2"}</div>
          <div style={{ background:"#0f0f1a",borderRadius:12,padding:"12px",marginBottom:8 }}>
            <div style={{ fontSize:20,marginBottom:4 }}>{drink?.emoji}</div>
            <div style={{ fontSize:14,color:"#e2e8f0",fontWeight:600 }}>{drink?.name} {p2.vol_cl}cl</div>
            <div style={{ fontSize:11,color:"#6b7280" }}>{drink?.degree_pct}%</div>
          </div>
          <div style={{ fontSize:12,color:"#6b7280",marginTop:8 }}>Prends ton verre en main 🍺</div>
        </div>
        {/* Show P1 time */}
        <div style={{ background:"#13131f",borderRadius:12,padding:"10px 20px",marginBottom:24,border:"1px solid #2a2a3e",textAlign:"center" }}>
          <div style={{ fontSize:10,color:"#6b7280",marginBottom:2 }}>🔴 {p1.name} a fini en</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"#ef4444" }}>{p1.time ? `${(p1.time/1000).toFixed(2)}s` : "?"}</div>
        </div>
        <button onClick={()=>{ playSound("beep"); startLightsAndTimer("p2") }} style={{ width:"100%",maxWidth:340,padding:"20px",borderRadius:18,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",color:"#fff",fontSize:20,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",boxShadow:"0 0 30px #3b82f660" }}>
          🚦 JE SUIS PRÊT !
        </button>
      </div>
    )
  }

  // ── LIGHTS PHASE ─────────────────────────────────────────────────────────
  if (phase === "lights") return (
    <div style={{ position:"fixed",inset:0,background:"#0a0a14",zIndex:400,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"#6b7280",letterSpacing:3,marginBottom:40 }}>PRÉPAREZ-VOUS</div>

      {/* F1 Light panel */}
      <div style={{ background:"#111",borderRadius:20,padding:"24px 32px",border:"2px solid #1f2937",marginBottom:40 }}>
        <div style={{ display:"flex",gap:16 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{
              width:48, height:48, borderRadius:"50%",
              background: lights >= i ? "#ef4444" : "#1f1f1f",
              boxShadow: lights >= i ? "0 0 20px #ef4444, 0 0 40px #ef444480" : "none",
              transition: "all 0.15s",
              border: "2px solid #374151",
            }}/>
          ))}
        </div>
      </div>

      <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:16,color:"#4b5563",letterSpacing:2 }}>
        {lights === 0 ? "..." : lights < 5 ? `${lights} / 5` : "ATTENTION..."}
      </div>
    </div>
  )

  // ── GO LIGHTS (brief flash before auto-start) ───────────────────────────
  if (lights === -1 && (phase === "p1" || phase === "p2") && !drinking && elapsed === 0) return (
    <div style={{ position:"fixed",inset:0,background:"#0a0a14",zIndex:400,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24 }}>
      <div style={{ background:"#111",borderRadius:20,padding:"24px 32px",border:"2px solid #1f2937",marginBottom:32 }}>
        <div style={{ display:"flex",gap:16 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ width:48,height:48,borderRadius:"50%",background:"#111",border:"2px solid #374151" }}/>
          ))}
        </div>
      </div>
      {/* Big green GO */}
      <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:80,color:"#4ade80",letterSpacing:8,textShadow:"0 0 40px #4ade80, 0 0 80px #4ade8080",animation:"pulse 0.5s infinite alternate" }}>
        GO!
      </div>
      <div style={{ color:"#6b7280",fontSize:14,marginTop:16 }}>
        {phase==="p1" ? `${p1.name||"Joueur 1"} — Appuie pour boire !` : `${p2.name||"Joueur 2"} — Appuie pour boire !`}
      </div>
      <div style={{ marginTop:40,fontFamily:"'Bebas Neue',cursive",fontSize:20,color:"#4ade80",letterSpacing:2,animation:"pulse 0.3s infinite alternate" }}>
        LE TIMER DÉMARRE AUTOMATIQUEMENT !
      </div>
      <style>{`@keyframes pulse{from{opacity:0.8}to{opacity:1}}`}</style>
    </div>
  )

  // ── DRINKING PHASE ────────────────────────────────────────────────────────
  if ((phase === "p1" || phase === "p2") && (drinking || elapsed > 0)) {
    const currentName = phase==="p1" ? (p1.name||"Joueur 1") : (p2.name||"Joueur 2")
    const color = phase==="p1" ? "#ef4444" : "#3b82f6"
    return (
      <div style={{ position:"fixed",inset:0,background:"#0a0a14",zIndex:400,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24 }}>
        <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:20,color:"#6b7280",letterSpacing:3,marginBottom:16 }}>
          {phase==="p1"?"🔴 JOUEUR 1":"🔵 JOUEUR 2"}
        </div>
        <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"#e2e8f0",marginBottom:32 }}>{currentName}</div>

        {/* Timer display */}
        <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:72,color:color,letterSpacing:4,textShadow:`0 0 30px ${color}60`,marginBottom:40,minWidth:200,textAlign:"center" }}>
          {fmt(elapsed)}
        </div>

        <button onClick={handlePress} disabled={!drinking} style={{ width:"100%",maxWidth:320,padding:"28px",borderRadius:20,border:"none",cursor:drinking?"pointer":"not-allowed",background:drinking?`linear-gradient(135deg,${color},${color}cc)`:"#2a2a3e",color:"#fff",fontSize:20,fontWeight:700,boxShadow:drinking?`0 0 30px ${color}60`:"none",animation:drinking?"throb 0.4s infinite alternate":"none",transition:"all .2s" }}>
          {drinking ? "✅ FINI !" : "⏳ Prépare-toi..."}
        </button>

        {phase==="p2" && p1.time && (
          <div style={{ marginTop:20,color:"#6b7280",fontSize:13 }}>
            {p1.name||"Joueur 1"} : <span style={{ color:"#ef4444",fontWeight:700 }}>{fmt(p1.time)}</span>
          </div>
        )}

        <style>{`@keyframes throb{from{transform:scale(1)}to{transform:scale(1.03)}}`}</style>
      </div>
    )
  }

  // ── RESULT PHASE ──────────────────────────────────────────────────────────
  if (phase === "result" && p1.time && p2.time) {
    const p1Won = p1.time < p2.time
    const winner = p1Won ? (p1.name||"Joueur 1") : (p2.name||"Joueur 2")
    const loser  = p1Won ? (p2.name||"Joueur 2") : (p1.name||"Joueur 1")
    const diff = Math.abs(p1.time - p2.time)
    const p1Drink = DRINK_CATALOG.find(d=>d.id===p1.drinkId)
    const p2Drink = DRINK_CATALOG.find(d=>d.id===p2.drinkId)
    const p1AlcG = p1Drink ? alcoholGrams(p1.vol_cl, p1Drink.degree_pct) : 0
    const p2AlcG = p2Drink ? alcoholGrams(p2.vol_cl, p2Drink.degree_pct) : 0
    const p1Dist = p1AlcG ? calcDistance(p1AlcG, p1.vol_cl) : 0
    const p2Dist = p2AlcG ? calcDistance(p2AlcG, p2.vol_cl) : 0

    return (
      <div style={{ position:"fixed",inset:0,background:"#0a0a14",zIndex:400,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,overflowY:"auto" }}>
        <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:32,color:"#fbbf24",letterSpacing:3,marginBottom:8 }}>RÉSULTAT !</div>

        {/* Winner */}
        <div style={{ background:"linear-gradient(135deg,#052e16,#0a2010)",border:"2px solid #4ade80",borderRadius:20,padding:"20px 32px",marginBottom:12,textAlign:"center",width:"100%",maxWidth:320 }}>
          <div style={{ fontSize:40,marginBottom:4 }}>🏆</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:26,color:"#4ade80",letterSpacing:2 }}>{winner}</div>
          <div style={{ fontSize:13,color:"#86efac",marginTop:4 }}>VAINQUEUR en {fmt(p1Won?p1.time:p2.time)}</div>
        </div>

        {/* Times */}
        <div style={{ display:"flex",gap:10,width:"100%",maxWidth:320,marginBottom:16 }}>
          <div style={{ flex:1,background:p1Won?"#052e16":"#1c0505",border:`1px solid ${p1Won?"#166534":"#7f1d1d"}`,borderRadius:14,padding:14,textAlign:"center" }}>
            <div style={{ fontSize:10,color:"#6b7280",marginBottom:4 }}>🔴 {p1.name||"J1"}</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:22,color:p1Won?"#4ade80":"#f87171" }}>{fmt(p1.time)}</div>
            <div style={{ fontSize:10,color:"#6b7280",marginTop:4 }}>
              {p1Won?`+${(p1Dist+10).toFixed(1)}m`:`+${Math.max(0,p1Dist-5).toFixed(1)}m`}
            </div>
          </div>
          <div style={{ flex:1,background:!p1Won?"#052e16":"#1c0505",border:`1px solid ${!p1Won?"#166534":"#7f1d1d"}`,borderRadius:14,padding:14,textAlign:"center" }}>
            <div style={{ fontSize:10,color:"#6b7280",marginBottom:4 }}>🔵 {p2.name||"J2"}</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive",fontSize:22,color:!p1Won?"#4ade80":"#f87171" }}>{fmt(p2.time)}</div>
            <div style={{ fontSize:10,color:"#6b7280",marginTop:4 }}>
              {!p1Won?`+${(p2Dist+10).toFixed(1)}m`:`+${Math.max(0,p2Dist-5).toFixed(1)}m`}
            </div>
          </div>
        </div>

        <div style={{ color:"#6b7280",fontSize:12,marginBottom:24 }}>
          Écart : <span style={{ color:"#fbbf24",fontWeight:700 }}>{fmt(diff)}</span>
        </div>

        <div style={{ display:"flex",gap:10,width:"100%",maxWidth:320 }}>
          <button onClick={()=>{ setPhase("setup"); setP1(p=>({...p,time:null})); setP2(p=>({...p,time:null})) }}
            style={{ flex:1,padding:"13px",borderRadius:13,border:"1px solid #2a2a3e",cursor:"pointer",background:"#1e1e2e",color:"#9ca3af",fontSize:14,fontWeight:700 }}>
            🔄 Rejouer
          </button>
          <button onClick={applyResults}
            style={{ flex:2,padding:"13px",borderRadius:13,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#a855f7,#ec4899)",color:"#fff",fontSize:14,fontWeight:700 }}>
            ✅ Appliquer les distances
          </button>
        </div>
      </div>
    )
  }

  return null
}
