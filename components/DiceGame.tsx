"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase"

type Phase = "setup" | "rolling" | "result"

const DOTS: Record<number, [number,number][]> = {
  1: [[50,50]],
  2: [[25,25],[75,75]],
  3: [[25,25],[50,50],[75,75]],
  4: [[25,25],[75,25],[25,75],[75,75]],
  5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
  6: [[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]],
}

const COLORS = ["#c084fc","#ec4899","#fbbf24","#4ade80","#60a5fa","#f87171"]

function Die({ value, rolling, color = "#a855f7", size = 60 }: any) {
  const [display, setDisplay] = useState(value || 1)
  const ivRef = useRef<any>(null)
  useEffect(() => {
    if (rolling) {
      ivRef.current = setInterval(() => setDisplay(Math.ceil(Math.random()*6)), 80)
    } else {
      clearInterval(ivRef.current)
      if (value) setDisplay(value)
    }
    return () => clearInterval(ivRef.current)
  }, [rolling, value])
  const dots = DOTS[display] || DOTS[1]
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.18, background:rolling?`#1e1e2e`:`${color}18`, border:`2px solid ${rolling?"#3b3b5a":color}`, boxShadow:rolling?"none":`0 0 16px ${color}40`, position:"relative", animation:rolling?"diceShake 0.1s infinite":"none" }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        {dots.map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r={rolling?9:10} fill={rolling?"#4b5563":color} opacity={rolling?0.6:1}/>)}
      </svg>
      <style>{`@keyframes diceShake{0%{transform:rotate(-8deg) scale(1.05)}50%{transform:rotate(8deg) scale(0.95)}100%{transform:rotate(-8deg) scale(1.05)}}`}</style>
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
  invite?: any // if responding to an invite
  onAwardDistance: (userId: string, delta: number) => void
  onClose: () => void
}

export default function DiceGame({ members, myUserId, groupId, invite, onAwardDistance, onClose }: Props) {
  const supabase = createClient()
  const isHost = !invite || invite.from_user_id === myUserId

  // Mode & setup
  const [mode, setMode] = useState<"local"|"invite"|null>(invite ? "invite" : null)
  const [selected, setSelected] = useState<string[]>(
    invite ? (invite.game_data?.player_ids || []) : []
  )
  const [inviteId, setInviteId] = useState(invite?.id || "")
  const [sending, setSending] = useState(false)

  // Game state — playerRolls: { userId -> value | null }
  const [playerRolls, setPlayerRolls] = useState<Record<string,number|null>>({})
  const [localTurn, setLocalTurn] = useState(0) // for local mode only
  const [rollingId, setRollingId] = useState<string|null>(null)
  const [phase, setPhase] = useState<Phase>("setup")
  const [losers, setLosers] = useState<string[]>([])
  const [tieRound, setTieRound] = useState(false)

  const activePlayers = members.filter(m => !m.is_sam)
  const me = members.find(m => m.user_id === myUserId)

  // Players in game (ordered)
  const gamePlayers = selected.map((id,i) => ({
    userId: id,
    name: members.find(m=>m.user_id===id)?.pseudo || "?",
    color: COLORS[i % COLORS.length],
  }))

  // ── REALTIME subscription for invite mode ────────────────────────────────
  useEffect(() => {
    if (!inviteId || mode !== "invite") return
    const channel = supabase.channel(`dice-${inviteId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "game_invites",
        filter: `id=eq.${inviteId}`
      }, (payload: any) => {
        const data = payload.new
        const rolls: Record<string,number> = data.game_data?.rolls || {}
        setPlayerRolls(rolls)
        // Check if all players rolled
        const playerIds: string[] = data.game_data?.player_ids || selected
        if (playerIds.every(id => rolls[id] != null)) {
          computeResult(rolls, playerIds)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [inviteId, mode])

  // When joining as non-host via invite, go straight to rolling phase
  useEffect(() => {
    if (invite && mode === "invite" && phase === "setup") {
      setPhase("rolling")
    }
  }, [])

  const computeResult = (rolls: Record<string,number|null>, playerIds: string[]) => {
    const vals = playerIds.map(id => ({ id, val: rolls[id] ?? 99 }))
    const minVal = Math.min(...vals.map(v => v.val))
    const newLosers = vals.filter(v => v.val === minVal).map(v => v.id)
    setLosers(newLosers)
    setPhase("result")
  }

  // ── SEND INVITE ───────────────────────────────────────────────────────────
  const sendInvite = async () => {
    if (selected.length < 1) return
    setSending(true)
    const allIds = [myUserId, ...selected]
    const { data, error } = await supabase.from("game_invites").insert({
      group_id: groupId, game_type: "dice",
      from_user_id: myUserId, to_user_id: selected[0],
      status: "pending",
      game_data: { player_ids: allIds, rolls: {} }
    }).select().single()
    if (error) { alert("Erreur: " + error.message); setSending(false); return }
    setInviteId(data.id)
    setSelected(allIds)
    setSending(false)
    setPhase("rolling")
    setPlayerRolls({})
  }

  // ── ROLL (local) ──────────────────────────────────────────────────────────
  const rollLocal = (userId: string) => {
    if (rollingId || playerRolls[userId] != null) return
    playDiceSound()
    setRollingId(userId)
    setTimeout(() => {
      const val = Math.ceil(Math.random() * 6)
      setRollingId(null)
      setPlayerRolls(prev => {
        const next = { ...prev, [userId]: val }
        const allDone = gamePlayers.every(p => next[p.userId] != null)
        if (allDone) setTimeout(() => computeResult(next, gamePlayers.map(p=>p.userId)), 600)
        else setLocalTurn(t => t + 1)
        return next
      })
    }, 1200)
  }

  // ── ROLL (invite / my turn) ───────────────────────────────────────────────
  const rollRemote = async () => {
    if (rollingId || playerRolls[myUserId] != null) return
    playDiceSound()
    setRollingId(myUserId)
    setTimeout(async () => {
      const val = Math.ceil(Math.random() * 6)
      setRollingId(null)
      const { data: current } = await supabase.from("game_invites").select("game_data").eq("id", inviteId).single()
      const currentRolls = current?.game_data?.rolls || {}
      const newRolls = { ...currentRolls, [myUserId]: val }
      const playerIds: string[] = current?.game_data?.player_ids || selected
      setPlayerRolls(prev => ({ ...prev, [myUserId]: val }))
      await supabase.from("game_invites").update({
        game_data: { ...current?.game_data, rolls: newRolls }
      }).eq("id", inviteId)
      // Check locally if all done
      if (playerIds.every(id => newRolls[id] != null)) {
        computeResult(newRolls, playerIds)
      }
    }, 1200)
  }

  // ── TIEBREAK ──────────────────────────────────────────────────────────────
  const startTiebreak = () => {
    setTieRound(true)
    setPhase("rolling")
    const resetRolls: Record<string,number|null> = {}
    losers.forEach(id => resetRolls[id] = null)
    setPlayerRolls(resetRolls)
    setSelected(losers)
    setLocalTurn(0)
    setLosers([])
  }

  const applyAndClose = () => {
    losers.forEach(id => onAwardDistance(id, -5))
    onClose()
  }

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
          { id:"local", icon:"📱", title:"Même téléphone", desc:"Chaque joueur lance depuis ce téléphone, à tour de rôle.", color:"#fbbf24", border:"#78350f", bg:"#1a0a00" },
          { id:"invite", icon:"📨", title:"Inviter les joueurs", desc:"Chaque joueur lance depuis son propre téléphone en temps réel.", color:"#60a5fa", border:"#1e3a8a", bg:"#0c1a3a" },
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
        <div style={{ fontSize:12, color:"#9ca3af", lineHeight:1.7 }}>
          Le plus petit score <span style={{ color:"#f87171", fontWeight:700 }}>boit et perd −5m</span> 🥃<br/>
          Égalité → les ex-æquo relancent 🎲
        </div>
      </div>
      <div style={{ width:"100%", maxWidth:360, marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:10 }}>Joueurs ({selected.length}/6)</div>
        {activePlayers.map((m:any,i:number)=>(
          <button key={m.user_id} onClick={()=>{ if(selected.includes(m.user_id)) setSelected(s=>s.filter(x=>x!==m.user_id)); else if(selected.length<6) setSelected(s=>[...s,m.user_id]) }}
            style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, border:"none", cursor:"pointer", width:"100%", marginBottom:8,
              background:selected.includes(m.user_id)?`${COLORS[selected.indexOf(m.user_id)]}18`:"#1e1e2e",
              outline:selected.includes(m.user_id)?`2px solid ${COLORS[selected.indexOf(m.user_id)]}`:"2px solid transparent" }}>
            <span style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", flex:1, textAlign:"left" as const }}>{m.pseudo}</span>
            {selected.includes(m.user_id)&&<div style={{ width:12, height:12, borderRadius:"50%", background:COLORS[selected.indexOf(m.user_id)] }}/>}
          </button>
        ))}
      </div>
      <button onClick={()=>{ if(selected.length>=2){ setPhase("rolling"); setPlayerRolls({}); setLocalTurn(0) }}} disabled={selected.length<2}
        style={{ width:"100%", maxWidth:360, padding:"15px", borderRadius:14, border:"none", cursor:selected.length>=2?"pointer":"not-allowed",
          background:selected.length>=2?"linear-gradient(135deg,#a855f7,#ec4899)":"#2a2a3e",
          color:selected.length>=2?"#fff":"#6b7280", fontSize:15, fontWeight:700 }}>
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
      <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginBottom:16, width:"100%", maxWidth:360 }}>
        <div style={{ fontSize:12, color:"#9ca3af" }}>Chaque joueur lance le dé depuis son propre téléphone 📱</div>
      </div>
      <div style={{ width:"100%", maxWidth:360, marginBottom:20 }}>
        {members.filter((m:any)=>m.user_id!==myUserId&&!m.is_sam).map((m:any)=>(
          <button key={m.user_id} onClick={()=>{ if(selected.includes(m.user_id)) setSelected(s=>s.filter(x=>x!==m.user_id)); else if(selected.length<5) setSelected(s=>[...s,m.user_id]) }}
            style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, border:"none", cursor:"pointer", width:"100%", marginBottom:8,
              background:selected.includes(m.user_id)?`${COLORS[selected.indexOf(m.user_id)+1]||COLORS[0]}18`:"#1e1e2e",
              outline:selected.includes(m.user_id)?`2px solid ${COLORS[selected.indexOf(m.user_id)+1]||COLORS[0]}`:"2px solid transparent" }}>
            <span style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", flex:1, textAlign:"left" as const }}>{m.pseudo}</span>
            {selected.includes(m.user_id)&&<span style={{ color:"#60a5fa" }}>✓</span>}
          </button>
        ))}
      </div>
      <button onClick={sendInvite} disabled={selected.length<1||sending}
        style={{ width:"100%", maxWidth:360, padding:"15px", borderRadius:14, border:"none", cursor:selected.length>=1?"pointer":"not-allowed",
          background:selected.length>=1?"linear-gradient(135deg,#3b82f6,#1d4ed8)":"#2a2a3e",
          color:selected.length>=1?"#fff":"#6b7280", fontSize:15, fontWeight:700 }}>
        {sending?"⏳ Envoi…":"📨 Envoyer les invitations !"}
      </button>
    </div>
  )

  // ── ROLLING PHASE ─────────────────────────────────────────────────────────
  if (phase === "rolling") {
    const isInviteMode = mode === "invite"
    const myRollDone = playerRolls[myUserId] != null
    const allDone = gamePlayers.every(p => playerRolls[p.userId] != null)

    // In invite mode, only show my own die + status of others
    if (isInviteMode) {
      return (
        <div style={BG}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, color:"#60a5fa", letterSpacing:3, marginBottom:24 }}>
            {tieRound ? "🎲 ÉGALITÉ — RELANCE !" : "🎲 JEU DU DÉ"}
          </div>
          {/* My die */}
          <div style={{ background:"#13131f", borderRadius:20, padding:"24px", border:"1px solid #2a2a3e", marginBottom:20, textAlign:"center", width:"100%", maxWidth:360 }}>
            <div style={{ fontSize:12, color:"#9ca3af", marginBottom:16 }}>
              {myRollDone ? "✅ Tu as lancé !" : "👆 C'est ton tour — lance le dé !"}
            </div>
            <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
              <button onClick={myRollDone ? undefined : rollRemote} disabled={myRollDone || rollingId !== null}
                style={{ background:"none", border:"none", cursor:myRollDone?"default":"pointer" }}>
                <Die value={playerRolls[myUserId] || 1} rolling={rollingId===myUserId} color={COLORS[0]} size={90}/>
              </button>
            </div>
            {playerRolls[myUserId] && (
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:36, color:COLORS[0] }}>{playerRolls[myUserId]}</div>
            )}
            {!myRollDone && !rollingId && (
              <button onClick={rollRemote}
                style={{ marginTop:8, padding:"12px 32px", borderRadius:13, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontSize:15, fontWeight:700 }}>
                🎲 Lancer !
              </button>
            )}
          </div>
          {/* Others status */}
          <div style={{ width:"100%", maxWidth:360 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:10 }}>Les autres joueurs</div>
            {gamePlayers.filter(p=>p.userId!==myUserId).map((p,i)=>(
              <div key={p.userId} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:12, background:"#13131f", border:"1px solid #2a2a3e", marginBottom:8 }}>
                <Die value={playerRolls[p.userId] || 1} rolling={false} color={p.color} size={40}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{p.name}</div>
                  <div style={{ fontSize:11, color:playerRolls[p.userId]?"#4ade80":"#6b7280" }}>
                    {playerRolls[p.userId] ? `✅ Score : ${playerRolls[p.userId]}` : "⏳ En attente…"}
                  </div>
                </div>
                {playerRolls[p.userId] && (
                  <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, color:p.color }}>{playerRolls[p.userId]}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )
    }

    // LOCAL MODE — tour par tour
    const currentPlayer = gamePlayers[localTurn]
    return (
      <div style={BG}>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, color:"#c084fc", letterSpacing:3, marginBottom:8 }}>
          {tieRound ? "🎲 ÉGALITÉ — RELANCE !" : "🎲 JEU DU DÉ"}
        </div>
        <div style={{ fontSize:11, color:"#6b7280", marginBottom:24 }}>
          {allDone ? "Tous ont lancé !" : `Tour ${localTurn+1}/${gamePlayers.length}`}
        </div>

        <div style={{ width:"100%", maxWidth:400, display:"flex", flexDirection:"column" as const, gap:10, marginBottom:16 }}>
          {gamePlayers.map((p,i)=>{
            const isCurrent = !allDone && i === localTurn
            const isDone = playerRolls[p.userId] != null
            return (
              <div key={p.userId} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:16,
                background:isCurrent?`${p.color}14`:"#13131f",
                border:isCurrent?`2px solid ${p.color}`:"1px solid #2a2a3e",
                transition:"all .3s" }}>
                <button onClick={()=>isCurrent?rollLocal(p.userId):undefined} disabled={!isCurrent||rollingId!==null}
                  style={{ background:"none", border:"none", cursor:isCurrent?"pointer":"default", padding:0 }}>
                  <Die value={playerRolls[p.userId]||1} rolling={rollingId===p.userId} color={p.color} size={56}/>
                </button>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:isCurrent?p.color:"#e2e8f0" }}>{p.name}</div>
                  <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>
                    {rollingId===p.userId?"🎲 En train de lancer…":isDone?`Score : ${playerRolls[p.userId]}`:isCurrent?"👆 Tape le dé !":"⏳ En attente…"}
                  </div>
                </div>
                {isDone && <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:32, color:p.color }}>{playerRolls[p.userId]}</div>}
              </div>
            )
          })}
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
      <div style={BG}>
        <div style={{ width:"100%", maxWidth:360, textAlign:"center", marginBottom:24 }}>
          {isTie ? (
            <div style={{ background:"#1a0a00", border:"2px solid #f59e0b", borderRadius:20, padding:"20px", marginBottom:16 }}>
              <div style={{ fontSize:48, marginBottom:8 }}>🎲</div>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, color:"#fbbf24", letterSpacing:2, marginBottom:4 }}>ÉGALITÉ !</div>
              <div style={{ fontSize:13, color:"#9ca3af" }}>{loserNames.join(" et ")} ont {minVal} — ils relancent !</div>
            </div>
          ) : (
            <div style={{ background:"#1c0505", border:"2px solid #ef4444", borderRadius:20, padding:"20px", marginBottom:16 }}>
              <div style={{ fontSize:48, marginBottom:8 }}>🥃</div>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, color:"#f87171", letterSpacing:2, marginBottom:4 }}>{loserNames[0]} BOIT !</div>
              <div style={{ fontSize:13, color:"#6b7280" }}>Score le plus bas : {minVal} — −5m 📉</div>
            </div>
          )}

          {/* All scores recap */}
          <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginBottom:20 }}>
            {gamePlayers.map(p=>{
              const isLoser = losers.includes(p.userId)
              return (
                <div key={p.userId} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid #1a1a2a" }}>
                  <Die value={playerRolls[p.userId]||1} rolling={false} color={isLoser?"#ef4444":p.color} size={36}/>
                  <span style={{ flex:1, fontSize:13, color:isLoser?"#f87171":"#e2e8f0", fontWeight:isLoser?700:400 }}>{p.name}</span>
                  <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, color:isLoser?"#ef4444":p.color }}>{playerRolls[p.userId]}</span>
                  {isLoser&&<span>💀</span>}
                </div>
              )
            })}
          </div>

          <div style={{ display:"flex", gap:10 }}>
            {isTie && (
              <button onClick={startTiebreak}
                style={{ flex:1, padding:"13px", borderRadius:13, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#f59e0b,#d97706)", color:"#fff", fontSize:14, fontWeight:700 }}>
                🎲 Relancer
              </button>
            )}
            <button onClick={applyAndClose}
              style={{ flex:2, padding:"13px", borderRadius:13, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontSize:14, fontWeight:700 }}>
              ✅ Appliquer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
