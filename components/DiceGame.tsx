"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase"

type Phase = "setup" | "rolling" | "result"

const COLORS = ["#c084fc","#ec4899","#fbbf24","#4ade80","#60a5fa","#f87171"]

// ── 3D CSS DICE ───────────────────────────────────────────────────────────────
const FACE_ROTATIONS: Record<number, string> = {
  1: "rotateY(0deg)",
  2: "rotateY(-90deg)",
  3: "rotateX(-90deg)",
  4: "rotateX(90deg)",
  5: "rotateY(90deg)",
  6: "rotateY(180deg)",
}

const DOT_POSITIONS: Record<number, { top: string, left: string }[]> = {
  1: [{ top:"50%", left:"50%" }],
  2: [{ top:"22%", left:"22%" }, { top:"78%", left:"78%" }],
  3: [{ top:"22%", left:"22%" }, { top:"50%", left:"50%" }, { top:"78%", left:"78%" }],
  4: [{ top:"22%", left:"22%" }, { top:"22%", left:"78%" }, { top:"78%", left:"22%" }, { top:"78%", left:"78%" }],
  5: [{ top:"22%", left:"22%" }, { top:"22%", left:"78%" }, { top:"50%", left:"50%" }, { top:"78%", left:"22%" }, { top:"78%", left:"78%" }],
  6: [{ top:"22%", left:"22%" }, { top:"22%", left:"78%" }, { top:"50%", left:"22%" }, { top:"50%", left:"78%" }, { top:"78%", left:"22%" }, { top:"78%", left:"78%" }],
}

function Dice3D({ value, rolling, color = "#a855f7", size = 100 }: { value: number, rolling: boolean, color?: string, size?: number }) {
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 })
  const frameRef = useRef<any>(null)
  const startRef = useRef<number>(0)

  useEffect(() => {
    if (rolling) {
      startRef.current = Date.now()
      const animate = () => {
        const t = (Date.now() - startRef.current) / 1000
        setRotation({
          x: t * 300 + Math.sin(t * 7) * 60,
          y: t * 400 + Math.cos(t * 5) * 80,
          z: t * 150 + Math.sin(t * 3) * 30,
        })
        frameRef.current = requestAnimationFrame(animate)
      }
      frameRef.current = requestAnimationFrame(animate)
    } else {
      cancelAnimationFrame(frameRef.current)
      // Snap to face rotation
      const faceMap: Record<number, {x:number,y:number,z:number}> = {
        1: { x:0, y:0, z:0 },
        2: { x:0, y:90, z:0 },
        3: { x:90, y:0, z:0 },
        4: { x:-90, y:0, z:0 },
        5: { x:0, y:-90, z:0 },
        6: { x:0, y:180, z:0 },
      }
      const target = faceMap[value] || faceMap[1]
      setRotation(target)
    }
    return () => cancelAnimationFrame(frameRef.current)
  }, [rolling, value])

  const half = size / 2

  const FaceDots = ({ face }: { face: number }) => (
    <div style={{ position:"relative", width:"100%", height:"100%" }}>
      {(DOT_POSITIONS[face] || []).map((pos, i) => (
        <div key={i} style={{
          position:"absolute",
          width: size * 0.14,
          height: size * 0.14,
          borderRadius:"50%",
          background: face === 1 ? "#ef4444" : "#1a1a2e",
          top: pos.top,
          left: pos.left,
          transform:"translate(-50%,-50%)",
          boxShadow: face === 1 ? "0 0 4px #ef444480" : "inset 0 1px 0 rgba(255,255,255,0.1)",
        }}/>
      ))}
    </div>
  )

  const faceStyle = (bg: string): React.CSSProperties => ({
    position:"absolute",
    width:size,
    height:size,
    background:bg,
    border:`2px solid ${color}60`,
    borderRadius:size*0.12,
    display:"flex",
    alignItems:"center",
    justifyContent:"center",
    padding:size*0.1,
    boxSizing:"border-box",
  })

  return (
    <div style={{ width:size, height:size, perspective:size*4, perspectiveOrigin:"50% 50%", cursor:"pointer" }}>
      <div style={{
        width:size, height:size,
        position:"relative",
        transformStyle:"preserve-3d",
        transform:`rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`,
        transition: rolling ? "none" : "transform 0.6s cubic-bezier(.34,1.2,.64,1)",
      }}>
        {/* Face 1 — front */}
        <div style={{ ...faceStyle(`linear-gradient(135deg,${color}33,${color}11)`), transform:`translateZ(${half}px)` }}>
          <FaceDots face={1}/>
        </div>
        {/* Face 6 — back */}
        <div style={{ ...faceStyle(`linear-gradient(135deg,${color}33,${color}11)`), transform:`rotateY(180deg) translateZ(${half}px)` }}>
          <FaceDots face={6}/>
        </div>
        {/* Face 2 — right */}
        <div style={{ ...faceStyle(`linear-gradient(135deg,${color}2a,${color}0d)`), transform:`rotateY(90deg) translateZ(${half}px)` }}>
          <FaceDots face={2}/>
        </div>
        {/* Face 5 — left */}
        <div style={{ ...faceStyle(`linear-gradient(135deg,${color}2a,${color}0d)`), transform:`rotateY(-90deg) translateZ(${half}px)` }}>
          <FaceDots face={5}/>
        </div>
        {/* Face 4 — top */}
        <div style={{ ...faceStyle(`linear-gradient(135deg,${color}20,${color}08)`), transform:`rotateX(90deg) translateZ(${half}px)` }}>
          <FaceDots face={4}/>
        </div>
        {/* Face 3 — bottom */}
        <div style={{ ...faceStyle(`linear-gradient(135deg,${color}20,${color}08)`), transform:`rotateX(-90deg) translateZ(${half}px)` }}>
          <FaceDots face={3}/>
        </div>
      </div>
    </div>
  )
}

function playDiceSound() {
  try {
    const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)()
    ;[0,0.08,0.16].forEach(d=>{
      const o=ctx.createOscillator(),g=ctx.createGain()
      o.connect(g);g.connect(ctx.destination);o.type="square"
      o.frequency.setValueAtTime(200+Math.random()*100,ctx.currentTime+d)
      g.gain.setValueAtTime(0.08,ctx.currentTime+d);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+d+0.12)
      o.start(ctx.currentTime+d);o.stop(ctx.currentTime+d+0.12)
    })
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
    await new Promise(r => setTimeout(r, 1400))
    const val = Math.ceil(Math.random() * 6)
    setIsRolling(false)
    setPlayerRolls(prev => {
      const next = { ...prev, [userId]: val }
      const allDone = gamePlayers.every(p => next[p.userId] != null)
      if (allDone) setTimeout(() => computeResult(next, gamePlayers.map(p=>p.userId)), 500)
      else setLocalTurn(t => t + 1)
      return next
    })
  }

  const rollRemote = async () => {
    if (isRolling || playerRolls[myUserId] != null) return
    playDiceSound(); setIsRolling(true)
    await new Promise(r => setTimeout(r, 1400))
    const val = Math.ceil(Math.random() * 6)
    setIsRolling(false)
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
                <Dice3D value={currentRoll||1} rolling={currentRolling} color={currentPlayer?.color} size={130}/>
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
                  <Dice3D value={playerRolls[p.userId]||1} rolling={false} color={p.color} size={36}/>
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
            <Dice3D value={playerRolls[myUserId]||1} rolling={isRolling&&!myRollDone} color={COLORS[0]} size={130}/>
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
              <Dice3D value={playerRolls[p.userId]||1} rolling={false} color={p.color} size={36}/>
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
                  <Dice3D value={playerRolls[p.userId]||1} rolling={false} color={isLoser?"#ef4444":p.color} size={40}/>
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
