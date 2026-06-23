"use client"
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
  const dot = size * 0.12

  useEffect(() => {
    if (rolling) {
      startRef.current = performance.now()
      // Pick random extra full rotations so landing is unpredictable
      const extraX = (Math.floor(Math.random()*4)+3)*360
      const extraY = (Math.floor(Math.random()*4)+3)*360
      const animate = (now: number) => {
        const t = (now - startRef.current) / 1400 // 1.4s animation
        if (t < 1) {
          // Ease in-out spin
          const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t
          setRx(extraX * ease + Math.sin(t*13)*15)
          setRy(extraY * ease + Math.cos(t*11)*20)
          setRz(Math.sin(t*7)*8)
          frameRef.current = requestAnimationFrame(animate)
        }
      }
      frameRef.current = requestAnimationFrame(animate)
    } else {
      cancelAnimationFrame(frameRef.current)
      const target = FACE_ROTS[value] || FACE_ROTS[1]
      setRx(target.x)
      setRy(target.y)
      setRz(0)
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

function playDiceSound() {
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
    const ctx = new AudioCtx()
    if (ctx.state === "suspended") ctx.resume()

    const now = ctx.currentTime

    // Rolling rattle: multiple short noise bursts
    ;[0, 0.12, 0.27, 0.45, 0.65, 0.88, 1.05, 1.18].forEach((delay, i) => {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let j = 0; j < data.length; j++) data[j] = (Math.random()*2-1) * Math.exp(-j/800)
      const src = ctx.createBufferSource()
      src.buffer = buf
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      filter.type = "bandpass"
      filter.frequency.value = 800 + Math.random() * 1200
      filter.Q.value = 0.8
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
      // Quieter at start and end, louder in middle
      const vol = i < 3 ? 0.08 + i*0.04 : i < 6 ? 0.2 : 0.2 - (i-6)*0.08
      gain.gain.setValueAtTime(vol, now + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.07)
      src.start(now + delay); src.stop(now + delay + 0.07)
    })

    // Final thud when dice lands
    const thudTime = now + 1.3
    const thudBuf = ctx.createBuffer(1, ctx.sampleRate * 0.15, ctx.sampleRate)
    const thudData = thudBuf.getChannelData(0)
    for (let j = 0; j < thudData.length; j++) {
      thudData[j] = (Math.random()*2-1) * Math.exp(-j/1200) * 0.6
    }
    const thudSrc = ctx.createBufferSource()
    thudSrc.buffer = thudBuf
    const thudFilter = ctx.createBiquadFilter()
    thudFilter.type = "lowpass"
    thudFilter.frequency.value = 400
    const thudGain = ctx.createGain()
    thudSrc.connect(thudFilter); thudFilter.connect(thudGain); thudGain.connect(ctx.destination)
    thudGain.gain.setValueAtTime(0.5, thudTime)
    thudGain.gain.exponentialRampToValueAtTime(0.001, thudTime + 0.18)
    thudSrc.start(thudTime); thudSrc.stop(thudTime + 0.2)

    // Short click on impact
    const clickTime = thudTime + 0.01
    const clickOsc = ctx.createOscillator()
    const clickGain = ctx.createGain()
    clickOsc.connect(clickGain); clickGain.connect(ctx.destination)
    clickOsc.type = "sine"
    clickOsc.frequency.setValueAtTime(180, clickTime)
    clickOsc.frequency.exponentialRampToValueAtTime(60, clickTime + 0.08)
    clickGain.gain.setValueAtTime(0.3, clickTime)
    clickGain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.1)
    clickOsc.start(clickTime); clickOsc.stop(clickTime + 0.1)

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
  const [pendingValue, setPendingValue] = useState<Record<string,number>>({})
  const [phase, setPhase] = useState<Phase>(invite ? "rolling" : "setup")
  const [losers, setLosers] = useState<string[]>([])
  const [tieRound, setTieRound] = useState(false)

  const activePlayers = members.filter(m => !m.is_sam)
  const gamePlayers = selected.map((id,i) => ({
    userId: id,
    name: members.find(m=>m.user_id===id)?.pseudo || "?",
    color: COLORS[i % COLORS.length],
  }))

  // Realtime for invite mode
  useEffect(() => {
    if (!inviteId || mode !== "invite") return
    const channel = supabase.channel(`dice-${inviteId}`)
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"game_invites", filter:`id=eq.${inviteId}` }, (payload:any) => {
        const rolls: Record<string,number> = payload.new.game_data?.rolls || {}
        const playerIds: string[] = payload.new.game_data?.player_ids || selected
        setPlayerRolls(rolls)
        if (playerIds.every(id => rolls[id] != null)) {
          computeResult(rolls, playerIds)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [inviteId, mode])

  const computeResult = (rolls: Record<string,number|null>, playerIds: string[]) => {
    const vals = playerIds.map(id => ({ id, val: rolls[id] ?? 99 }))
    const minVal = Math.min(...vals.map(v => v.val))
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

  const rollLocal = async (userId: string) => {
    if (isRolling || playerRolls[userId] != null) return
    playDiceSound(); setIsRolling(true)
    const val = Math.ceil(Math.random() * 6)
    // Wait for roll animation
    await new Promise(r => setTimeout(r, 1400))
    // Set pending so die snaps to correct face
    setPendingValue(prev => ({ ...prev, [userId]: val }))
    setIsRolling(false)
    // Extra pause so player can READ the face before score number appears
    await new Promise(r => setTimeout(r, 900))
    setPlayerRolls(prev => {
      const next = { ...prev, [userId]: val }
      const allDone = gamePlayers.every(p => next[p.userId] != null)
      if (allDone) setTimeout(() => computeResult(next, gamePlayers.map(p=>p.userId)), 600)
      else setLocalTurn(t => t + 1)
      return next
    })
  }

  const rollRemote = async () => {
    if (isRolling || playerRolls[myUserId] != null) return
    playDiceSound(); setIsRolling(true)
    const val = Math.ceil(Math.random() * 6)
    await new Promise(r => setTimeout(r, 1400))
    setIsRolling(false)
    await new Promise(r => setTimeout(r, 700))
    const { data: current } = await supabase.from("game_invites").select("game_data").eq("id", inviteId).single()
    const currentRolls = current?.game_data?.rolls || {}
    const newRolls = { ...currentRolls, [myUserId]: val }
    const playerIds: string[] = current?.game_data?.player_ids || selected
    setPlayerRolls(prev => ({ ...prev, [myUserId]: val }))
    await supabase.from("game_invites").update({ game_data:{ ...current?.game_data, rolls:newRolls } }).eq("id", inviteId)
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
    const currentPlayer = gamePlayers[Math.min(localTurn, gamePlayers.length-1)]
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
                <Dice3D value={pendingValue[currentPlayer?.userId] || currentRoll||1} rolling={currentRolling} size={130}/>
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
            <button onClick={applyAndClose} style={{ flex:2, padding:"13px", borderRadius:13, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontSize:14, fontWeight:700 }}>✅ Appliquer</button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
