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
import { createClient } from "@/lib/supabase"

type Phase = "setup" | "rolling" | "result"

const COLORS = ["#c084fc","#ec4899","#fbbf24","#4ade80","#60a5fa","#f87171"]

// ── 3D CSS DICE ───────────────────────────────────────────────────────────────
// Standard die layout (opposite faces sum to 7):
// 1 opposite 6, 2 opposite 5, 3 opposite 4
// Placement: 1=front, 6=back, 2=left, 5=right, 3=top, 4=bottom

const DOTS: Record<number, [number,number][]> = {
  1: [[50,50]],
  2: [[28,28],[72,72]],
  3: [[28,28],[50,50],[72,72]],
  4: [[28,28],[72,28],[28,72],[72,72]],
  5: [[28,28],[72,28],[50,50],[28,72],[72,72]],
  6: [[28,25],[72,25],[28,50],[72,50],[28,75],[72,75]],
}

// Target rotations so each face number appears front-facing to viewer
// CSS 3D: positive rotateX tilts top away, positive rotateY turns right
const FACE_ROTS: Record<number,{x:number,y:number}> = {
  1: { x:  0, y:   0 }, // front face
  2: { x:  0, y:  90 }, // left face rotated to front
  3: { x:-90, y:   0 }, // top face rotated to front
  4: { x: 90, y:   0 }, // bottom face rotated to front
  5: { x:  0, y: -90 }, // right face rotated to front
  6: { x:  0, y: 180 }, // back face rotated to front
}

function Dice3D({ value, rolling, size = 110 }: { value: number, rolling: boolean, size?: number }) {
  const [rx, setRx] = useState(0)
  const [ry, setRy] = useState(0)
  const [rz, setRz] = useState(0)
  const frameRef = useRef<any>(null)
  const startRef = useRef(0)
  const half = size / 2
  // Store target rotations so we can approach them smoothly
  const targetRef = useRef({ x: 0, y: 0 })
  const phaseRef = useRef<"fast"|"slow"|"stop">("fast")
  const speedRef = useRef(1.0)

  useEffect(() => {
    if (rolling) {
      startRef.current = performance.now()
      phaseRef.current = "fast"
      speedRef.current = 1.0
      // Random target face: large random rotations + final face offset
      const face = value  // the face we need to land on
      const target = FACE_ROTS[face] || FACE_ROTS[1]
      // Add many full rotations so the path is long and unpredictable
      const spinsX = (Math.floor(Math.random() * 5) + 6) * 360
      const spinsY = (Math.floor(Math.random() * 5) + 6) * 360
      targetRef.current = {
        x: target.x + spinsX,
        y: target.y + spinsY,
      }

      let curX = rx, curY = ry, curZ = rz
      let vx = (Math.random() - 0.5) * 25
      let vy = (Math.random() * 15) + 20
      let vz = (Math.random() - 0.5) * 8

      const animate = (now: number) => {
        const elapsed = (now - startRef.current) / 1000
        // Phase 1: fast random spin (0 - 0.9s)
        // Phase 2: slow deceleration toward target face (0.9s - 2.0s)
        // Phase 3: snap to exact target
        if (elapsed < 0.9) {
          // Fast tumbling phase
          vx += (Math.random() - 0.5) * 2
          vy += (Math.random() - 0.5) * 2
          vz += (Math.random() - 0.5) * 1
          curX += vx; curY += vy; curZ += vz
          setRx(curX); setRy(curY); setRz(curZ)
          frameRef.current = requestAnimationFrame(animate)
        } else if (elapsed < 2.2) {
          // Deceleration phase — ease toward target
          const t = (elapsed - 0.9) / 1.3  // 0 → 1
          // Ease out cubic
          const ease = 1 - Math.pow(1 - t, 3)
          const startX = curX, startY = curY
          const tx = targetRef.current.x
          const ty = targetRef.current.y
          setRx(startX + (tx - startX) * ease)
          setRy(startY + (ty - startY) * ease)
          // Small wobble at end like real dice bouncing
          const wobble = Math.sin(t * 12) * (1 - t) * 4
          setRz(wobble)
          frameRef.current = requestAnimationFrame(animate)
        } else {
          // Final snap
          const target2 = FACE_ROTS[value] || FACE_ROTS[1]
          setRx(target2.x); setRy(target2.y); setRz(0)
        }
      }
      frameRef.current = requestAnimationFrame(animate)
    } else {
      cancelAnimationFrame(frameRef.current)
      const target = FACE_ROTS[value] || FACE_ROTS[1]
      setRx(target.x); setRy(target.y); setRz(0)
    }
    return () => cancelAnimationFrame(frameRef.current)
  }, [rolling, value])

  const Face = ({ face, transform }: { face: number, transform: string }) => (
    <div style={{
      position: "absolute",
      width: size, height: size,
      background: "#fff",
      border: "2px solid #ddd",
      borderRadius: size * 0.1,
      transform,
      backfaceVisibility: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
    }}>
      <svg width={size*0.82} height={size*0.82} viewBox="0 0 100 100">
        {(DOTS[face]||[]).map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r={9.5} fill="#1a1a1a"/>
        ))}
        {/* Red dot for face 1 */}
        {face === 1 && <circle cx={50} cy={50} r={9.5} fill="#dc2626"/>}
      </svg>
    </div>
  )

  return (
    <div style={{ width:size, height:size, perspective:size*5 }}>
      <div style={{
        width:size, height:size, position:"relative",
        transformStyle:"preserve-3d",
        transform:`rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`,
        transition: rolling ? "none" : "transform 0.55s cubic-bezier(.25,.8,.25,1)",
      }}>
        <Face face={1} transform={`translateZ(${half}px)`}/>
        <Face face={6} transform={`rotateY(180deg) translateZ(${half}px)`}/>
        <Face face={2} transform={`rotateY(-90deg) translateZ(${half}px)`}/>
        <Face face={5} transform={`rotateY(90deg) translateZ(${half}px)`}/>
        <Face face={3} transform={`rotateX(90deg) translateZ(${half}px)`}/>
        <Face face={4} transform={`rotateX(-90deg) translateZ(${half}px)`}/>
      </div>
    </div>
  )
}

function makeNoise(ctx: AudioContext, duration: number, freq: number, vol: number, at: number) {
  const len = Math.floor(ctx.sampleRate * duration)
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.exp(-i/(len*0.35))
  const src = ctx.createBufferSource(); src.buffer = buf
  const flt = ctx.createBiquadFilter(); flt.type = "bandpass"; flt.frequency.value = freq; flt.Q.value = 1.2
  const g = ctx.createGain()
  src.connect(flt); flt.connect(g); g.connect(ctx.destination)
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  src.start(at); src.stop(at + duration)
}

function playDiceSound() {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
    const ctx = new AudioCtx()
    if (ctx.state === "suspended") ctx.resume()
    const now = ctx.currentTime

    // Phase 1: Fast rattling (0 → 0.9s) — dice rolling on surface
    // Accelerates then has rhythm of tumbling
    const rattleTimes = [0, 0.07, 0.14, 0.22, 0.31, 0.40, 0.50, 0.60, 0.70, 0.80]
    rattleTimes.forEach((t, i) => {
      const vol = 0.06 + i * 0.015 // gets louder as it settles
      makeNoise(ctx, 0.055, 1800 + Math.random()*800, vol, now + t)
    })

    // Phase 2: Slow bouncing (0.9s → 2.2s) — die decelerating
    const bounceTimes = [0.92, 1.08, 1.22, 1.35, 1.46, 1.55, 1.63, 1.70, 1.76]
    bounceTimes.forEach((t, i) => {
      const vol = Math.max(0.04, 0.18 - i * 0.016)
      const freq = 1200 - i * 80
      makeNoise(ctx, 0.06, freq, vol, now + t)
    })

    // Final THUD — die hits table hard (low frequency)
    const thud = now + 2.1
    ;[0, 0.008, 0.02].forEach(d => {
      const buf2 = ctx.createBuffer(1, Math.floor(ctx.sampleRate*0.18), ctx.sampleRate)
      const data2 = buf2.getChannelData(0)
      for (let i = 0; i < data2.length; i++) data2[i] = (Math.random()*2-1) * Math.exp(-i/1800)
      const src2 = ctx.createBufferSource(); src2.buffer = buf2
      const flt2 = ctx.createBiquadFilter(); flt2.type = "lowpass"; flt2.frequency.value = 250 - d*1000
      const g2 = ctx.createGain()
      src2.connect(flt2); flt2.connect(g2); g2.connect(ctx.destination)
      g2.gain.setValueAtTime(0.5 - d*10, thud + d)
      g2.gain.exponentialRampToValueAtTime(0.0001, thud + d + 0.2)
      src2.start(thud + d); src2.stop(thud + d + 0.22)
    })

    // High-click on impact (corner of die hitting table)
    const osc = ctx.createOscillator()
    const og = ctx.createGain()
    osc.connect(og); og.connect(ctx.destination)
    osc.type = "sine"
    osc.frequency.setValueAtTime(800, thud)
    osc.frequency.exponentialRampToValueAtTime(120, thud + 0.06)
    og.gain.setValueAtTime(0.25, thud); og.gain.exponentialRampToValueAtTime(0.0001, thud + 0.08)
    osc.start(thud); osc.stop(thud + 0.1)

  } catch(e){}
}

interface Props {
  members: any[]
  myUserId: string
  groupId: string
  invite?: any
  onAwardDistance: (userId: string, delta: number) => void
  onClose: () => void
}

export default function DiceGame({ members, myUserId, groupId, invite, onAwardDistance, onClose }: Props) {
  const supabase = createClient()
  const [mode, setMode] = useState<"local"|"invite"|null>(invite ? "invite" : null)
  const [selected, setSelected] = useState<string[]>(invite ? (invite.game_data?.player_ids || []) : [])
  const [inviteId, setInviteId] = useState(invite?.id || "")
  const [sending, setSending] = useState(false)
  const [playerRolls, setPlayerRolls] = useState<Record<string,number|null>>({})
  const [localTurn, setLocalTurn] = useState(0)
  const [isRolling, setIsRolling] = useState(false)
  const valRef = useRef<{[key:string]:number}>({}) // locked values per userId
  const isRollingRef = useRef(false)
  const dieDisplayRef = useRef(1) // ref pour éviter le stale state pendant animation
  const [dieDisplayValue, setDieDisplayValue] = useState(1)
  // Keep myValRef for invite mode compat
  const myValRef = useRef<number>(0)
  const [phase, setPhase] = useState<Phase>(invite ? "rolling" : "setup")
  const [losers, setLosers] = useState<string[]>([])
  const [tieRound, setTieRound] = useState(false)

  const activePlayers = members.filter(m => !m.is_sam)
  const gamePlayers = selected.map((id,i) => ({
    userId: id,
    name: members.find(m=>m.user_id===id)?.pseudo || "?",
    color: COLORS[i % COLORS.length],
  }))

  // Polling for invite mode (every 2s) — no realtime to avoid race conditions
  useEffect(() => {
    if (!inviteId || mode !== "invite") return
    const poll = async () => {
      const { data } = await supabase.from("game_invites").select("game_data").eq("id", inviteId).single()
      if (!data) return
      const rolls: {[key:string]:number} = data.game_data?.rolls || {}
      const playerIds: string[] = data.game_data?.player_ids || selected
      // Inject our locked value — never use DB value for our own roll
      if (myValRef.current > 0) rolls[myUserId] = myValRef.current
      // Update others display only
      setPlayerRolls(prev => {
        const merged = { ...prev }
        playerIds.forEach((id:string) => {
          if (id !== myUserId && rolls[id] != null) merged[id] = rolls[id]
          if (id === myUserId && myValRef.current > 0) merged[id] = myValRef.current
        })
        return merged
      })
      // Only compute result when ALL have rolled AND we're done animating
      if (!isRollingRef.current && myValRef.current > 0 &&
          playerIds.every((id:string) => id === myUserId ? myValRef.current > 0 : rolls[id] != null)) {
        const finalRolls: {[key:string]:number} = {}
        playerIds.forEach((id:string) => {
          finalRolls[id] = id === myUserId ? myValRef.current : rolls[id]
        })
        computeResult(finalRolls, playerIds)
      }
    }
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [inviteId, mode, selected])

  const computeResult = (rolls: Record<string,number|null>, playerIds: string[]) => {
    // Use per-player locked refs — these are the ground truth
    const resolvedRolls = { ...rolls }
    Object.keys(valRef.current).forEach(uid => {
      if (valRef.current[uid] > 0) resolvedRolls[uid] = valRef.current[uid]
    })
    const vals = playerIds.map(id => ({
      id,
      val: resolvedRolls[id] ?? 99
    }))
    const minVal = Math.min(...vals.map(v => v.val))
    // Sync display with resolved values
    const syncedRolls: Record<string,number> = {}
    vals.forEach(v => { if (v.val !== 99) syncedRolls[v.id] = v.val })
    setPlayerRolls(prev => ({ ...prev, ...syncedRolls }))
    setLosers(vals.filter(v => v.val === minVal).map(v => v.id))
    setPhase("result")
  }

  const sendInvite = async () => {
    if (selected.length < 1) return
    setSending(true)
    const allIds = [myUserId, ...selected]
    const { data, error } = await supabase.from("game_invites").insert({
      group_id:groupId, game_type:"dice", from_user_id:myUserId, to_user_id:selected[0],
      status:"pending", game_data:{ player_ids:allIds, rolls:{} }
    }).select().single()
    if (error) { alert("Erreur: "+error.message); setSending(false); return }
    setInviteId(data.id); setSelected(allIds)
    setSending(false); setPhase("rolling"); setPlayerRolls({})
  }

  const trueRandom = () => {
    const arr = new Uint32Array(1)
    crypto.getRandomValues(arr)
    return (arr[0] % 6) + 1
  }

  const rollLocal = async (userId: string) => {
    if (isRolling || playerRolls[userId] != null) return
    // Generate and lock val PER PLAYER in a separate ref slot
    const val = trueRandom()
    valRef.current[userId] = val // locked per userId, never overwritten by other players
    playDiceSound()
    setIsRolling(true)
    dieDisplayRef.current = val
    setDieDisplayValue(val)
    // Animation 2.3s
    await new Promise(r => setTimeout(r, 2300))
    setIsRolling(false)
    // 1.5s pause to read the face
    await new Promise(r => setTimeout(r, 1500))
    // Read from per-player ref — guaranteed to be the right value
    const lockedVal = valRef.current[userId]
    // Snapshot des playerIds AVANT le setState pour éviter closure stale
    const playerIds = gamePlayers.map(p => p.userId)
    setPlayerRolls(prev => {
      const next = { ...prev, [userId]: lockedVal }
      const allDone = playerIds.every(id => next[id] != null)
      if (allDone) {
        setTimeout(() => computeResult(next, playerIds), 300)
      } else {
        setLocalTurn(t => t + 1)
      }
      return next
    })
  }

  const rollRemote = async () => {
    if (isRolling || playerRolls[myUserId] != null) return
    // Lock val immediately in ref - this NEVER changes
    const val = trueRandom()
    myValRef.current = val
    valRef.current[myUserId] = val
    isRollingRef.current = true
    playDiceSound()
    setIsRolling(true)
    dieDisplayRef.current = val
    setDieDisplayValue(val) // tell die which face to land on
    // Animation: 2.3s
    await new Promise(r => setTimeout(r, 2300))
    setIsRolling(false)
    // 1.5s pause to read the face
    await new Promise(r => setTimeout(r, 1500))
    // Animation done - now safe to unblock realtime and write to DB
    isRollingRef.current = false
    const lockedVal = myValRef.current // still the same val we locked at the start
    // Update local state FIRST (so display is correct)
    setPlayerRolls(prev => ({ ...prev, [myUserId]: lockedVal }))
    // Then push to DB
    const { data: current } = await supabase.from("game_invites").select("game_data").eq("id", inviteId).single()
    const currentRolls = current?.game_data?.rolls || {}
    const newRolls = { ...currentRolls, [myUserId]: lockedVal }
    const playerIds: string[] = current?.game_data?.player_ids || selected
    await supabase.from("game_invites").update({
      game_data: { ...current?.game_data, rolls: newRolls }
    }).eq("id", inviteId)
    if (playerIds.every(id => newRolls[id] != null)) computeResult(newRolls, playerIds)
  }

  const startTiebreak = () => {
    setTieRound(true); setPhase("rolling")
    const resetRolls: Record<string,number|null> = {}
    losers.forEach(id => resetRolls[id] = null)
    setPlayerRolls(resetRolls); setSelected(losers); setLocalTurn(0); setLosers([])
  }

  const applyAndClose = () => { losers.forEach(id => onAwardDistance(id, -5)); onClose() }

  const BG: any = { position:"fixed", inset:0, background:"#0a0a14", zIndex:400, display:"flex", flexDirection:"column", alignItems:"center", overflowY:"auto", padding:"24px 16px 40px" }

  // ── MODE SELECT ───────────────────────────────────────────────────────────
  if (!mode) return (
    <div style={BG}>
      <div style={{ display:"flex", justifyContent:"space-between", width:"100%", maxWidth:360, marginBottom:24, alignItems:"center" }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0 }}>🎲 JEU DU DÉ</h2>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
      </div>
      <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:14 }}>
        {[
          { id:"local", icon:"📱", title:"Même téléphone", desc:"Tour par tour sur ce téléphone.", color:"#fbbf24", border:"#78350f", bg:"#1a0a00" },
          { id:"invite", icon:"📨", title:"Inviter les joueurs", desc:"Chacun lance depuis son propre téléphone.", color:"#60a5fa", border:"#1e3a8a", bg:"#0c1a3a" },
        ].map(opt => (
          <button key={opt.id} onClick={() => setMode(opt.id as any)}
            style={{ padding:"24px", borderRadius:18, border:`1px solid ${opt.border}`, cursor:"pointer", background:`linear-gradient(135deg,${opt.bg},${opt.bg}88)`, textAlign:"left" as const }}>
            <div style={{ fontSize:32, marginBottom:8 }}>{opt.icon}</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, color:opt.color, letterSpacing:2, marginBottom:4 }}>{opt.title}</div>
            <div style={{ fontSize:12, color:"#6b7280", lineHeight:1.5 }}>{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )

  // ── LOCAL SETUP ───────────────────────────────────────────────────────────
  if (mode === "local" && phase === "setup") return (
    <div style={{ ...BG, justifyContent:"flex-start", paddingTop:32 }}>
      <div style={{ display:"flex", justifyContent:"space-between", width:"100%", maxWidth:360, marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, letterSpacing:3, color:"#fbbf24", margin:0 }}>📱 MÊME TÉLÉPHONE</h2>
        <button onClick={()=>setMode(null)} style={{ background:"none", border:"none", color:"#6b7280", fontSize:18, cursor:"pointer" }}>← Retour</button>
      </div>
      <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginBottom:16, width:"100%", maxWidth:360 }}>
        <div style={{ fontSize:12, color:"#9ca3af", lineHeight:1.7 }}>Le plus petit score <span style={{ color:"#f87171", fontWeight:700 }}>boit et perd −5m</span> 🥃<br/>Égalité → seulement les ex-æquo relancent 🎲</div>
      </div>
      <div style={{ width:"100%", maxWidth:360, marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:10 }}>Joueurs ({selected.length}/6)</div>
        {activePlayers.map((m:any)=>(
          <button key={m.user_id} onClick={()=>{ if(selected.includes(m.user_id)) setSelected(s=>s.filter(x=>x!==m.user_id)); else if(selected.length<6) setSelected(s=>[...s,m.user_id]) }}
            style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, border:"none", cursor:"pointer", width:"100%", marginBottom:8, background:selected.includes(m.user_id)?`${COLORS[selected.indexOf(m.user_id)]}18`:"#1e1e2e", outline:selected.includes(m.user_id)?`2px solid ${COLORS[selected.indexOf(m.user_id)]}`:"2px solid transparent" }}>
            <span style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", flex:1, textAlign:"left" as const }}>{m.pseudo}</span>
            {selected.includes(m.user_id)&&<div style={{ width:12, height:12, borderRadius:"50%", background:COLORS[selected.indexOf(m.user_id)] }}/>}
          </button>
        ))}
      </div>
      <button onClick={()=>{ if(selected.length>=2){ setPhase("rolling"); setPlayerRolls({}); setLocalTurn(0) }}} disabled={selected.length<2}
        style={{ width:"100%", maxWidth:360, padding:"15px", borderRadius:14, border:"none", cursor:selected.length>=2?"pointer":"not-allowed", background:selected.length>=2?"linear-gradient(135deg,#a855f7,#ec4899)":"#2a2a3e", color:selected.length>=2?"#fff":"#6b7280", fontSize:15, fontWeight:700 }}>
        🎲 Lancer la partie !
      </button>
    </div>
  )

  // ── INVITE SETUP ──────────────────────────────────────────────────────────
  if (mode === "invite" && phase === "setup" && !inviteId) return (
    <div style={{ ...BG, justifyContent:"flex-start", paddingTop:32 }}>
      <div style={{ display:"flex", justifyContent:"space-between", width:"100%", maxWidth:360, marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, letterSpacing:3, color:"#60a5fa", margin:0 }}>📨 INVITER DES JOUEURS</h2>
        <button onClick={()=>setMode(null)} style={{ background:"none", border:"none", color:"#6b7280", fontSize:18, cursor:"pointer" }}>← Retour</button>
      </div>
      <div style={{ width:"100%", maxWidth:360, marginBottom:20 }}>
        {members.filter((m:any)=>m.user_id!==myUserId&&!m.is_sam).map((m:any)=>(
          <button key={m.user_id} onClick={()=>{ if(selected.includes(m.user_id)) setSelected(s=>s.filter(x=>x!==m.user_id)); else if(selected.length<5) setSelected(s=>[...s,m.user_id]) }}
            style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, border:"none", cursor:"pointer", width:"100%", marginBottom:8, background:selected.includes(m.user_id)?`${COLORS[(selected.indexOf(m.user_id)+1)%6]}18`:"#1e1e2e", outline:selected.includes(m.user_id)?`2px solid ${COLORS[(selected.indexOf(m.user_id)+1)%6]}`:"2px solid transparent" }}>
            <span style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", flex:1, textAlign:"left" as const }}>{m.pseudo}</span>
            {selected.includes(m.user_id)&&<span style={{ color:"#60a5fa" }}>✓</span>}
          </button>
        ))}
      </div>
      <button onClick={sendInvite} disabled={selected.length<1||sending}
        style={{ width:"100%", maxWidth:360, padding:"15px", borderRadius:14, border:"none", cursor:selected.length>=1?"pointer":"not-allowed", background:selected.length>=1?"linear-gradient(135deg,#3b82f6,#1d4ed8)":"#2a2a3e", color:selected.length>=1?"#fff":"#6b7280", fontSize:15, fontWeight:700 }}>
        {sending?"⏳ Envoi…":"📨 Envoyer les invitations !"}
      </button>
    </div>
  )

  // ── ROLLING — LOCAL ───────────────────────────────────────────────────────
  if (phase === "rolling" && mode === "local") {
    const currentPlayer = gamePlayers[localTurn < gamePlayers.length ? localTurn : gamePlayers.length - 1]
    const allDone = gamePlayers.every(p => playerRolls[p.userId] != null)
    const currentRoll = playerRolls[currentPlayer?.userId]
    const currentRolling = isRolling && currentRoll == null

    return (
      <div style={{ ...BG, justifyContent:"center" }}>
        {tieRound && <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:16, color:"#fbbf24", letterSpacing:3, marginBottom:24 }}>🎲 ÉGALITÉ — RELANCE !</div>}

        {!allDone && (
          <>
            {/* Big centered die */}
            <div style={{ marginBottom:32, display:"flex", flexDirection:"column" as const, alignItems:"center", gap:16 }}>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:18, color:currentPlayer?.color, letterSpacing:2 }}>
                {currentPlayer?.name}
              </div>
              <button onClick={()=>rollLocal(currentPlayer?.userId)} disabled={isRolling} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}>
                <Dice3D value={isRolling ? dieDisplayRef.current : (valRef.current[currentPlayer?.userId] || currentRoll || dieDisplayRef.current || 1)} rolling={currentRolling} size={130}/>
              </button>
              {!isRolling && currentRoll == null && (
                <button onClick={()=>rollLocal(currentPlayer?.userId)}
                  style={{ padding:"14px 36px", borderRadius:14, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${currentPlayer?.color},${currentPlayer?.color}cc)`, color:"#fff", fontSize:16, fontWeight:700 }}>
                  🎲 Lancer !
                </button>
              )}
              {currentRoll != null && (
                <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:56, color:currentPlayer?.color }}>{currentRoll}</div>
              )}
            </div>

            {/* Compact list of others */}
            <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:8 }}>
              {gamePlayers.filter(p=>p.userId!==currentPlayer?.userId).map(p=>(
                <div key={p.userId} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:12, background:"#13131f", border:"1px solid #2a2a3e" }}>
                  <Dice3D value={playerRolls[p.userId]||1} rolling={false}  size={36}/>
                  <span style={{ flex:1, fontSize:12, color:"#9ca3af" }}>{p.name}</span>
                  {playerRolls[p.userId] != null
                    ? <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, color:p.color }}>{playerRolls[p.userId]}</span>
                    : <span style={{ fontSize:11, color:"#4b5563" }}>⏳</span>
                  }
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // ── ROLLING — INVITE ──────────────────────────────────────────────────────
  if (phase === "rolling" && mode === "invite") {
    const myRollDone = playerRolls[myUserId] != null
    return (
      <div style={{ ...BG, justifyContent:"center" }}>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:16, color:"#60a5fa", letterSpacing:3, marginBottom:32 }}>
          {tieRound?"🎲 ÉGALITÉ — RELANCE !":"🎲 JEU DU DÉ"}
        </div>
        {/* My big die */}
        <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:16, marginBottom:32 }}>
          <div style={{ fontSize:12, color:"#9ca3af" }}>{myRollDone?"✅ Tu as lancé !":"👆 Lance le dé !"}</div>
          <button onClick={myRollDone?undefined:rollRemote} disabled={myRollDone||isRolling} style={{ background:"none", border:"none", cursor:myRollDone?"default":"pointer", padding:0 }}>
            <Dice3D value={playerRolls[myUserId]||1} rolling={isRolling&&!myRollDone}  size={130}/>
          </button>
          {playerRolls[myUserId] != null
            ? <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:56, color:COLORS[0] }}>{playerRolls[myUserId]}</div>
            : !isRolling && <button onClick={rollRemote} style={{ padding:"14px 36px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontSize:16, fontWeight:700 }}>🎲 Lancer !</button>
          }
        </div>
        {/* Others compact */}
        <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:8 }}>
          {gamePlayers.filter(p=>p.userId!==myUserId).map(p=>(
            <div key={p.userId} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:12, background:"#13131f", border:"1px solid #2a2a3e" }}>
              <Dice3D value={playerRolls[p.userId]||1} rolling={false}  size={36}/>
              <span style={{ flex:1, fontSize:12, color:"#9ca3af" }}>{p.name}</span>
              {playerRolls[p.userId] != null
                ? <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, color:p.color }}>{playerRolls[p.userId]}</span>
                : <span style={{ fontSize:11, color:"#4b5563" }}>⏳</span>
              }
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (phase === "result") {
    const minVal = Math.min(...gamePlayers.map(p=>playerRolls[p.userId]||99))
    const isTie = losers.length > 1
    const loserNames = losers.map(id=>members.find(m=>m.user_id===id)?.pseudo||"?")
    return (
      <div style={{ ...BG, justifyContent:"center" }}>
        <div style={{ width:"100%", maxWidth:360, textAlign:"center" as const }}>
          {isTie ? (
            <div style={{ background:"#1a0a00", border:"2px solid #f59e0b", borderRadius:20, padding:"20px", marginBottom:16 }}>
              <div style={{ fontSize:48, marginBottom:8 }}>🎲</div>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, color:"#fbbf24", letterSpacing:2, marginBottom:4 }}>ÉGALITÉ !</div>
              <div style={{ fontSize:13, color:"#9ca3af" }}>{loserNames.join(" et ")} ont {minVal} — relancent !</div>
            </div>
          ) : (
            <div style={{ background:"#1c0505", border:"2px solid #ef4444", borderRadius:20, padding:"20px", marginBottom:16 }}>
              <div style={{ fontSize:48, marginBottom:8 }}>🥃</div>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, color:"#f87171", letterSpacing:2, marginBottom:4 }}>{loserNames[0]} BOIT !</div>
              <div style={{ fontSize:13, color:"#6b7280" }}>Score le plus bas : {minVal} — −5m 📉</div>
            </div>
          )}
          <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginBottom:20 }}>
            {gamePlayers.map(p=>{
              const isLoser=losers.includes(p.userId)
              return (
                <div key={p.userId} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid #1a1a2a" }}>
                  <Dice3D value={playerRolls[p.userId]||1} rolling={false}  size={40}/>
                  <span style={{ flex:1, fontSize:13, color:isLoser?"#f87171":"#e2e8f0", fontWeight:isLoser?700:400 }}>{p.name}</span>
                  <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, color:isLoser?"#ef4444":p.color }}>{playerRolls[p.userId]}</span>
                  {isLoser&&<span>💀</span>}
                </div>
              )
            })}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {isTie&&<button onClick={startTiebreak} style={{ flex:1, padding:"13px", borderRadius:13, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"#fff", fontSize:14, fontWeight:700 }}>🎲 Relancer</button>}
            <button onClick={() => { setPhase("setup"); setLosers([]); setTieRound(false); setPlayerRolls({}); setLocalTurn(0); setIsRolling(false); }}
              style={{ flex:1, padding:"13px", borderRadius:13, border:"1px solid #2a2a3e", cursor:"pointer", background:"#13131f", color:"#9ca3af", fontSize:14, fontWeight:700 }}>🔄 Rejouer</button>
            <button onClick={applyAndClose} style={{ flex:2, padding:"13px", borderRadius:13, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontSize:14, fontWeight:700 }}>✅ Appliquer</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
