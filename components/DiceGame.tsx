"use client"
import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase"

type Phase = "setup" | "rolling" | "result" | "tiebreak"

const DIE_FACES: Record<number, string> = {
  1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅"
}

// SVG dot positions for each face
const DOTS: Record<number, [number,number][]> = {
  1: [[50,50]],
  2: [[25,25],[75,75]],
  3: [[25,25],[50,50],[75,75]],
  4: [[25,25],[75,25],[25,75],[75,75]],
  5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
  6: [[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]],
}

function Die({ value, rolling, color = "#a855f7", size = 80 }: { value: number, rolling: boolean, color?: string, size?: number }) {
  const [displayVal, setDisplayVal] = useState(value || 1)
  const intervalRef = useRef<any>(null)

  useEffect(() => {
    if (rolling) {
      intervalRef.current = setInterval(() => {
        setDisplayVal(Math.ceil(Math.random() * 6))
      }, 80)
    } else {
      clearInterval(intervalRef.current)
      if (value) setDisplayVal(value)
    }
    return () => clearInterval(intervalRef.current)
  }, [rolling, value])

  const dots = DOTS[displayVal] || DOTS[1]

  return (
    <div style={{
      width: size, height: size,
      borderRadius: size * 0.18,
      background: rolling
        ? `linear-gradient(135deg, #2a2a3e, #1a1a2e)`
        : `linear-gradient(135deg, ${color}22, ${color}11)`,
      border: `2px solid ${rolling ? "#3b3b5a" : color}`,
      boxShadow: rolling
        ? "none"
        : `0 0 16px ${color}40, inset 0 1px 0 rgba(255,255,255,0.1)`,
      position: "relative",
      transition: "all 0.15s",
      animation: rolling ? "diceShake 0.1s infinite" : "none",
    }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={rolling ? 9 : 10}
            fill={rolling ? "#4b5563" : color}
            opacity={rolling ? 0.6 : 1}
          />
        ))}
      </svg>
      <style>{`
        @keyframes diceShake {
          0%{transform:rotate(-8deg) scale(1.05)}
          50%{transform:rotate(8deg) scale(0.95)}
          100%{transform:rotate(-8deg) scale(1.05)}
        }
      `}</style>
    </div>
  )
}

interface PlayerRoll {
  userId: string
  name: string
  color: string
  value: number | null
  rolling: boolean
  done: boolean
}

interface Props {
  members: any[]
  myUserId: string
  groupId: string
  onAwardDistance: (userId: string, delta: number) => void
  onClose: () => void
}

const COLORS = ["#c084fc","#ec4899","#fbbf24","#4ade80","#60a5fa","#f87171"]

export default function DiceGame({ members, myUserId, groupId, onAwardDistance, onClose }: Props) {
  const supabase = createClient()
  const [mode, setMode] = useState<"select"|"local"|"invite"|null>(null)
  const [phase, setPhase] = useState<Phase>("setup")
  const [selected, setSelected] = useState<string[]>([])
  const [rolls, setRolls] = useState<PlayerRoll[]>([])
  const [currentTurn, setCurrentTurn] = useState(0)
  const [tiebreakIds, setTiebreakIds] = useState<string[]>([])
  const [inviteId, setInviteId] = useState("")
  const [invitedIds, setInvitedIds] = useState<string[]>([])
  const [remoteRolls, setRemoteRolls] = useState<Record<string,number>>({})
  const [sending, setSending] = useState(false)

  const activePlayers = members.filter(m => !m.is_sam)

  const togglePlayer = (id: string) => {
    if (selected.includes(id)) setSelected(s => s.filter(x => x !== id))
    else if (selected.length < 6) setSelected(s => [...s, id])
  }

  const startGame = (playerIds = selected) => {
    const newRolls: PlayerRoll[] = playerIds.map((id, i) => ({
      userId: id,
      name: members.find(m => m.user_id === id)?.pseudo || "?",
      color: COLORS[i % COLORS.length],
      value: null,
      rolling: false,
      done: false,
    }))
    setRolls(newRolls)
    setCurrentTurn(0)
    setPhase("rolling")
  }

  const rollDie = (idx: number) => {
    if (rolls[idx].done || rolls[idx].rolling) return

    // Sound
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      ;[0, 0.08, 0.16].forEach(delay => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.type = "square"
        o.frequency.setValueAtTime(200 + Math.random() * 100, ctx.currentTime + delay)
        g.gain.setValueAtTime(0.08, ctx.currentTime + delay)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12)
        o.start(ctx.currentTime + delay); o.stop(ctx.currentTime + delay + 0.12)
      })
    } catch(e) {}

    // Animate
    setRolls(prev => prev.map((r, i) => i === idx ? { ...r, rolling: true } : r))

    setTimeout(() => {
      const val = Math.ceil(Math.random() * 6)
      setRolls(prev => {
        const next = prev.map((r, i) => i === idx ? { ...r, rolling: false, value: val, done: true } : r)
        // Check if all done
        if (next.every(r => r.done)) {
          setTimeout(() => computeResult(next), 600)
        } else {
          setCurrentTurn(idx + 1)
        }
        return next
      })
    }, 1200)
  }

  const computeResult = (finalRolls: PlayerRoll[]) => {
    const minVal = Math.min(...finalRolls.map(r => r.value!))
    const losers = finalRolls.filter(r => r.value === minVal)

    if (losers.length === 1) {
      setPhase("result")
    } else {
      // Tie — store ids and go to tiebreak
      setTiebreakIds(losers.map(r => r.userId))
      setPhase("tiebreak")
    }
  }

  const applyAndClose = () => {
    const minVal = Math.min(...rolls.map(r => r.value || 99))
    const losers = rolls.filter(r => r.value === minVal)
    losers.forEach(l => onAwardDistance(l.userId, -5))
    onClose()
  }

  const BG: any = {
    position: "fixed", inset: 0, background: "#0a0a14", zIndex: 400,
    display: "flex", flexDirection: "column", alignItems: "center",
    overflowY: "auto", padding: "24px 16px 40px",
  }

  // ── MODE SELECT ──────────────────────────────────────────────────────────
  if (!mode) return (
    <div style={BG}>
      <div style={{ display:"flex", justifyContent:"space-between", width:"100%", maxWidth:360, marginBottom:24, alignItems:"center" }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0 }}>
          🎲 JEU DU DÉ
        </h2>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
      </div>
      <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column" as const, gap:14 }}>
        <button onClick={() => setMode("local")}
          style={{ padding:"24px", borderRadius:18, border:"1px solid #78350f", cursor:"pointer", background:"linear-gradient(135deg,#1a0a00,#100600)", textAlign:"left" as const }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📱</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, color:"#fbbf24", letterSpacing:2, marginBottom:4 }}>Même téléphone</div>
          <div style={{ fontSize:12, color:"#6b7280", lineHeight:1.5 }}>Chaque joueur lance depuis ce téléphone, à tour de rôle.</div>
        </button>
        <button onClick={() => setMode("invite")}
          style={{ padding:"24px", borderRadius:18, border:"1px solid #1e3a8a", cursor:"pointer", background:"linear-gradient(135deg,#0c1a3a,#071020)", textAlign:"left" as const }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📨</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, color:"#60a5fa", letterSpacing:2, marginBottom:4 }}>Inviter les joueurs</div>
          <div style={{ fontSize:12, color:"#6b7280", lineHeight:1.5 }}>Chaque joueur lance depuis son propre téléphone en temps réel.</div>
        </button>
      </div>
    </div>
  )

  // ── INVITE MODE SETUP ─────────────────────────────────────────────────────
  if (mode === "invite" && phase === "setup" && !inviteId) return (
    <div style={{ ...BG, justifyContent:"flex-start", paddingTop:32 }}>
      <div style={{ display:"flex", justifyContent:"space-between", width:"100%", maxWidth:360, marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, letterSpacing:3, color:"#60a5fa", margin:0 }}>🎲 INVITER DES JOUEURS</h2>
        <button onClick={()=>setMode(null)} style={{ background:"none", border:"none", color:"#6b7280", fontSize:18, cursor:"pointer" }}>← Retour</button>
      </div>
      <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginBottom:16, width:"100%", maxWidth:360 }}>
        <div style={{ fontSize:11, color:"#9ca3af", lineHeight:1.7 }}>
          Sélectionne les joueurs à inviter. Chacun lancera le dé depuis son propre téléphone 📱
        </div>
      </div>
      <div style={{ width:"100%", maxWidth:360, marginBottom:20 }}>
        {members.filter((m:any)=>m.user_id!==myUserId&&!m.is_sam).map((m:any,i:number)=>(
          <button key={m.user_id} onClick={()=>{ if(selected.includes(m.user_id)) setSelected(s=>s.filter(x=>x!==m.user_id)); else if(selected.length<5) setSelected(s=>[...s,m.user_id]) }}
            style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:12, border:"none", cursor:"pointer", width:"100%", marginBottom:8,
              background:selected.includes(m.user_id)?`${COLORS[selected.indexOf(m.user_id)]}18`:"#1e1e2e",
              outline:selected.includes(m.user_id)?`2px solid ${COLORS[selected.indexOf(m.user_id)]}`:"2px solid transparent" }}>
            <span style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", flex:1, textAlign:"left" as const }}>{m.pseudo}</span>
            {selected.includes(m.user_id)&&<div style={{ width:12, height:12, borderRadius:"50%", background:COLORS[selected.indexOf(m.user_id)] }}/>}
          </button>
        ))}
      </div>
      <button onClick={async()=>{
        if(selected.length<1){return}
        setSending(true)
        const allIds=[myUserId,...selected]
        const {data,error}=await supabase.from("game_invites").insert({
          group_id:groupId, game_type:"dice",
          from_user_id:myUserId, to_user_id:selected[0],
          status:"pending", game_data:{ player_ids:allIds, rolls:{} }
        }).select().single()
        if(error){alert("Erreur: "+error.message);setSending(false);return}
        setInviteId(data.id)
        setInvitedIds(allIds)
        setSelected(allIds)
        setSending(false)
        setPhase("rolling")
      }} disabled={selected.length<1||sending}
        style={{ width:"100%", maxWidth:360, padding:"15px", borderRadius:14, border:"none", cursor:selected.length>=1?"pointer":"not-allowed",
          background:selected.length>=1?"linear-gradient(135deg,#3b82f6,#1d4ed8)":"#2a2a3e",
          color:selected.length>=1?"#fff":"#6b7280", fontSize:15, fontWeight:700 }}>
        {sending?"⏳ Envoi…":"📨 Envoyer les invitations !"}
      </button>
    </div>
  )

  // ── SETUP ────────────────────────────────────────────────────────────────
  if (phase === "setup") return (
    <div style={BG}>
      <div style={{ display:"flex", justifyContent:"space-between", width:"100%", maxWidth:360, marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0 }}>
          🎲 MÊME TÉLÉPHONE
        </h2>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
      </div>

      <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginBottom:20, width:"100%", maxWidth:360 }}>
        <div style={{ fontSize:12, color:"#9ca3af", lineHeight:1.7 }}>
          Chacun lance le dé à tour de rôle.<br/>
          Le plus petit score <span style={{ color:"#f87171", fontWeight:700 }}>boit et perd −5m</span> 🥃<br/>
          Égalité → les concernés relancent 🔄
        </div>
      </div>

      <div style={{ width:"100%", maxWidth:360, marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#6b7280", letterSpacing:1, textTransform:"uppercase" as const, marginBottom:10 }}>
          Joueurs ({selected.length}/6)
        </div>
        <div style={{ display:"flex", flexDirection:"column" as const, gap:8 }}>
          {activePlayers.map((m: any, i: number) => (
            <button key={m.user_id} onClick={() => togglePlayer(m.user_id)}
              style={{
                display:"flex", alignItems:"center", gap:12,
                padding:"12px 14px", borderRadius:12, border:"none", cursor:"pointer",
                background: selected.includes(m.user_id)
                  ? `linear-gradient(135deg,${COLORS[selected.indexOf(m.user_id)]}20,${COLORS[selected.indexOf(m.user_id)]}10)`
                  : "#1e1e2e",
                outline: selected.includes(m.user_id)
                  ? `2px solid ${COLORS[selected.indexOf(m.user_id)]}`
                  : "2px solid transparent",
                transition: "all .15s",
              }}>
              <div style={{ fontSize:20 }}>{selected.includes(m.user_id) ? "🎲" : "○"}</div>
              <span style={{ fontSize:13, fontWeight:600, color:"#e2e8f0", flex:1, textAlign:"left" as const }}>{m.pseudo}</span>
              {selected.includes(m.user_id) && (
                <div style={{ width:12, height:12, borderRadius:"50%", background:COLORS[selected.indexOf(m.user_id)] }}/>
              )}
            </button>
          ))}
        </div>
      </div>

      <button onClick={() => startGame()} disabled={selected.length < 2}
        style={{ width:"100%", maxWidth:360, padding:"16px", borderRadius:14, border:"none",
          cursor: selected.length >= 2 ? "pointer" : "not-allowed",
          background: selected.length >= 2 ? "linear-gradient(135deg,#a855f7,#ec4899)" : "#2a2a3e",
          color: selected.length >= 2 ? "#fff" : "#6b7280", fontSize:16, fontWeight:700 }}>
        🎲 Lancer la partie !
      </button>
      <button onClick={()=>setMode(null)} style={{ marginTop:10, width:"100%", maxWidth:360, padding:"11px", borderRadius:13, border:"1px solid #2a2a3e", background:"none", color:"#6b7280", fontSize:13, cursor:"pointer" }}>
        ← Retour
      </button>
    </div>
  )

  // ── ROLLING ──────────────────────────────────────────────────────────────
  if (phase === "rolling" || phase === "result") {
    const allDone = rolls.every(r => r.done)
    const minVal = allDone ? Math.min(...rolls.map(r => r.value!)) : null
    const losers = minVal !== null ? rolls.filter(r => r.value === minVal) : []

    return (
      <div style={{ ...BG, justifyContent:"flex-start", paddingTop:32 }}>
        <div style={{ display:"flex", justifyContent:"space-between", width:"100%", maxWidth:400, marginBottom:24 }}>
          <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:3, color:"#c084fc", margin:0 }}>
            🎲 À TON TOUR
          </h2>
          {!allDone && (
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:14, color:"#6b7280", letterSpacing:2, alignSelf:"center" }}>
              {currentTurn + 1} / {rolls.length}
            </div>
          )}
        </div>

        {/* Player rolls grid */}
        <div style={{ width:"100%", maxWidth:400, display:"flex", flexDirection:"column" as const, gap:12, marginBottom:24 }}>
          {rolls.map((r, i) => {
            const isLoser = allDone && losers.some(l => l.userId === r.userId)
            const isCurrentTurn = !allDone && i === currentTurn
            const isWaiting = !allDone && i > currentTurn
            return (
              <div key={r.userId} style={{
                display:"flex", alignItems:"center", gap:14,
                padding:"14px 16px", borderRadius:16,
                background: isLoser
                  ? "linear-gradient(135deg,#1c0505,#160303)"
                  : isCurrentTurn
                  ? `linear-gradient(135deg,${r.color}18,${r.color}08)`
                  : "#13131f",
                border: isLoser
                  ? "2px solid #ef4444"
                  : isCurrentTurn
                  ? `2px solid ${r.color}`
                  : "1px solid #2a2a3e",
                transition: "all 0.3s",
              }}>
                {/* Die */}
                <button
                  onClick={() => isCurrentTurn ? rollDie(i) : undefined}
                  disabled={!isCurrentTurn || r.rolling}
                  style={{
                    background:"none", border:"none", cursor: isCurrentTurn ? "pointer" : "default",
                    padding:0, transform: isCurrentTurn && !r.rolling ? "scale(1.05)" : "scale(1)",
                    transition:"transform 0.2s",
                  }}
                >
                  <Die
                    value={r.value || 1}
                    rolling={r.rolling}
                    color={isLoser ? "#ef4444" : r.color}
                    size={56}
                  />
                </button>

                {/* Info */}
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color: isLoser ? "#f87171" : isCurrentTurn ? r.color : "#e2e8f0" }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>
                    {r.rolling ? "🎲 En train de lancer…"
                      : r.done ? `Score : ${r.value}`
                      : isCurrentTurn ? "👆 Tape le dé !"
                      : "⏳ En attente…"}
                  </div>
                </div>

                {/* Score badge */}
                {r.done && (
                  <div style={{
                    fontFamily:"'Bebas Neue',cursive", fontSize:32,
                    color: isLoser ? "#ef4444" : r.color,
                    textShadow: isLoser ? "0 0 20px #ef444460" : `0 0 12px ${r.color}40`,
                  }}>
                    {r.value}
                  </div>
                )}
                {isLoser && <span style={{ fontSize:22 }}>💀</span>}
              </div>
            )
          })}
        </div>

        {/* Result */}
        {allDone && (
          <div style={{ width:"100%", maxWidth:400 }}>
            {losers.length === 1 ? (
              <div style={{ background:"#1c0505", border:"2px solid #ef4444", borderRadius:16, padding:"16px 20px", marginBottom:16, textAlign:"center" }}>
                <div style={{ fontSize:36, marginBottom:8 }}>🥃</div>
                <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, color:"#f87171", letterSpacing:2, marginBottom:4 }}>
                  {losers[0].name} BOIT !
                </div>
                <div style={{ fontSize:13, color:"#6b7280" }}>Score le plus bas : {losers[0].value} — −5m 📉</div>
              </div>
            ) : (
              <div style={{ background:"#1a0a00", border:"2px solid #f59e0b", borderRadius:16, padding:"16px 20px", marginBottom:16, textAlign:"center" }}>
                <div style={{ fontSize:36, marginBottom:8 }}>🎲</div>
                <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, color:"#fbbf24", letterSpacing:2, marginBottom:4 }}>
                  ÉGALITÉ !
                </div>
                <div style={{ fontSize:13, color:"#9ca3af" }}>
                  {losers.map(l=>l.name).join(" et ")} relancent !
                </div>
              </div>
            )}
            <div style={{ display:"flex", gap:10 }}>
              {losers.length > 1 && (
                <button onClick={() => {
                  setTiebreakIds(losers.map(l => l.userId))
                  startGame(losers.map(l => l.userId))
                }}
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
        )}
      </div>
    )
  }

  return null
}
