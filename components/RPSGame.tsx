"use client"
import { useState, useEffect, useRef } from "react"

type Choice = "rock" | "paper" | "scissors" | null
type Phase = "setup" | "choose" | "reveal" | "roundResult" | "final"

const CHOICES = [
  { id: "rock" as Choice,     emoji: "🪨", label: "Pierre" },
  { id: "paper" as Choice,    emoji: "📄", label: "Feuille" },
  { id: "scissors" as Choice, emoji: "✂️", label: "Ciseaux" },
]

function getWinner(a: Choice, b: Choice): "p1" | "p2" | "draw" {
  if (a === b) return "draw"
  if ((a==="rock"&&b==="scissors")||(a==="paper"&&b==="rock")||(a==="scissors"&&b==="paper")) return "p1"
  return "p2"
}

interface Props {
  members: any[]
  onAwardDistance: (userId: string, delta: number) => void
  onClose: () => void
}

export default function RPSGame({ members, onAwardDistance, onClose }: Props) {
  const [phase, setPhase]         = useState<Phase>("setup")
  const [p1UserId, setP1UserId]   = useState("")
  const [p2UserId, setP2UserId]   = useState("")
  const [p1Name, setP1Name]       = useState("")
  const [p2Name, setP2Name]       = useState("")
  const [round, setRound]         = useState(1)      // 1-3
  const [turn, setTurn]           = useState<1|2>(1) // who is choosing
  const [p1Choice, setP1Choice]   = useState<Choice>(null)
  const [p2Choice, setP2Choice]   = useState<Choice>(null)
  const [scores, setScores]       = useState([0, 0])  // [p1wins, p2wins]
  const [roundWinner, setRoundWinner] = useState<"p1"|"p2"|"draw"|null>(null)
  const [shaking, setShaking]     = useState(false)
  const [countdown, setCountdown] = useState<number|null>(null)
  const [showChoice, setShowChoice] = useState(false)
  const shakeRef = useRef<any>(null)

  const p1 = members.find(m => m.user_id === p1UserId)
  const p2 = members.find(m => m.user_id === p2UserId)

  // Shake animation then reveal
  const doReveal = (c1: Choice, c2: Choice) => {
    setShaking(true)
    setShowChoice(false)
    let cnt = 3
    setCountdown(cnt)
    const iv = setInterval(() => {
      cnt--
      if (cnt > 0) setCountdown(cnt)
      else {
        clearInterval(iv)
        setCountdown(null)
        setShaking(false)
        setShowChoice(true)
        const w = getWinner(c1, c2)
        setRoundWinner(w)
        setPhase("roundResult")
        if (w === "p1") setScores(s => [s[0]+1, s[1]])
        else if (w === "p2") setScores(s => [s[0], s[1]+1])
      }
    }, 700)
  }

  const handleChoose = (choice: Choice) => {
    if (turn === 1) {
      setP1Choice(choice)
      setTurn(2)
    } else {
      setP2Choice(choice)
      setPhase("reveal")
      // Short delay then shake
      setTimeout(() => doReveal(p1Choice, choice), 300)
    }
  }

  const nextRound = () => {
    if (round >= 3 || scores[0] === 2 || scores[1] === 2) {
      setPhase("final")
    } else {
      setRound(r => r+1)
      setTurn(1)
      setP1Choice(null)
      setP2Choice(null)
      setRoundWinner(null)
      setShowChoice(false)
      setPhase("choose")
    }
  }

  const applyAndClose = () => {
    const finalWinner = scores[0] > scores[1] ? "p1" : scores[1] > scores[0] ? "p2" : "draw"
    if (finalWinner === "p1" && p1UserId) onAwardDistance(p1UserId, 8)
    if (finalWinner === "p2" && p2UserId) onAwardDistance(p2UserId, 8)
    if (finalWinner === "draw") {
      if (p1UserId) onAwardDistance(p1UserId, 4)
      if (p2UserId) onAwardDistance(p2UserId, 4)
    }
    onClose()
  }

  const BG = { position:"fixed" as const, inset:0, background:"#0a0a14", zIndex:400, display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", padding:24 }

  // ── SETUP ────────────────────────────────────────────────────────────────
  if (phase === "setup") return (
    <div style={{ ...BG, justifyContent:"flex-start", paddingTop:40, overflowY:"auto" as const }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", maxWidth:360, marginBottom:24 }}>
        <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:3, background:"linear-gradient(135deg,#c084fc,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", margin:0 }}>
          🤜 PIERRE FEUILLE CISEAUX
        </h2>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#6b7280", fontSize:22, cursor:"pointer" }}>✕</button>
      </div>

      <div style={{ background:"#13131f", borderRadius:14, padding:14, border:"1px solid #2a2a3e", marginBottom:16, width:"100%", maxWidth:360 }}>
        <div style={{ fontSize:12, color:"#9ca3af", lineHeight:1.7 }}>
          3 manches. Le gagnant avance <span style={{ color:"#4ade80", fontWeight:700 }}>+8m</span>.<br/>
          Le perdant boit un shot imposé par le groupe 🥃
        </div>
      </div>

      {[
        { label:"🔴 Joueur 1", uid:p1UserId, setUid:setP1UserId, setName:setP1Name, color:"#ef4444", border:"#7f1d1d", bg:"#1c0505" },
        { label:"🔵 Joueur 2", uid:p2UserId, setUid:setP2UserId, setName:setP2Name, color:"#3b82f6", border:"#1e3a8a", bg:"#0c1a3a" },
      ].map(pl => (
        <div key={pl.label} style={{ background:pl.bg, border:`1px solid ${pl.border}`, borderRadius:14, padding:14, marginBottom:12, width:"100%", maxWidth:360 }}>
          <div style={{ fontSize:11, fontWeight:700, color:pl.color, letterSpacing:1, textTransform:"uppercase" as const, marginBottom:8 }}>{pl.label}</div>
          <select value={pl.uid} onChange={e => { pl.setUid(e.target.value); pl.setName(members.find((m:any)=>m.user_id===e.target.value)?.pseudo||"") }}
            style={{ width:"100%", padding:"10px 12px", borderRadius:10, background:"#0f0f1a", border:`1px solid ${pl.border}`, color:"#e2e8f0", fontSize:13, outline:"none" }}>
            <option value="">Choisir un joueur</option>
            {members.map((m:any) => <option key={m.user_id} value={m.user_id}>{m.pseudo}</option>)}
          </select>
        </div>
      ))}

      <button onClick={() => { setPhase("choose"); setTurn(1) }}
        disabled={!p1UserId || !p2UserId || p1UserId === p2UserId}
        style={{ width:"100%", maxWidth:360, padding:"16px", borderRadius:14, border:"none", cursor:p1UserId&&p2UserId&&p1UserId!==p2UserId?"pointer":"not-allowed", background:p1UserId&&p2UserId&&p1UserId!==p2UserId?"linear-gradient(135deg,#a855f7,#ec4899)":"#2a2a3e", color:p1UserId&&p2UserId?"#fff":"#6b7280", fontSize:16, fontWeight:700 }}>
        ✊ Commencer le duel !
      </button>
    </div>
  )

  // ── CHOOSE ───────────────────────────────────────────────────────────────
  if (phase === "choose") {
    const isP1 = turn === 1
    const name = isP1 ? (p1Name||"Joueur 1") : (p2Name||"Joueur 2")
    const color = isP1 ? "#ef4444" : "#3b82f6"
    const bg    = isP1 ? "#1c0505" : "#0c1a3a"
    const border = isP1 ? "#7f1d1d" : "#1e3a8a"
    return (
      <div style={BG}>
        {/* Score */}
        <div style={{ display:"flex", gap:20, marginBottom:32, alignItems:"center" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#ef4444", fontWeight:700, marginBottom:4 }}>{p1Name||"J1"}</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:36, color:"#ef4444" }}>{scores[0]}</div>
          </div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, color:"#4b5563" }}>MANCHE {round}</div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#3b82f6", fontWeight:700, marginBottom:4 }}>{p2Name||"J2"}</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:36, color:"#3b82f6" }}>{scores[1]}</div>
          </div>
        </div>

        {/* Player indicator */}
        <div style={{ background:bg, border:`2px solid ${border}`, borderRadius:20, padding:"16px 28px", marginBottom:32, textAlign:"center" }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:14, color, letterSpacing:3, marginBottom:4 }}>{isP1?"🔴 JOUEUR 1":"🔵 JOUEUR 2"}</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, color:"#e2e8f0" }}>{name}</div>
          <div style={{ fontSize:12, color:"#6b7280", marginTop:6 }}>Choisis en secret 🤫</div>
        </div>

        {/* Choices */}
        <div style={{ display:"flex", gap:16, marginBottom:16 }}>
          {CHOICES.map(c => (
            <button key={c.id} onClick={() => handleChoose(c.id)}
              style={{ width:90, height:90, borderRadius:20, border:`2px solid ${border}`, cursor:"pointer", background:bg, display:"flex", flexDirection:"column" as const, alignItems:"center", justifyContent:"center", gap:6, transition:"all .15s", fontSize:36 }}>
              {c.emoji}
              <span style={{ fontSize:10, color:"#9ca3af", fontWeight:600 }}>{c.label}</span>
            </button>
          ))}
        </div>

        {/* P1 already chose indicator */}
        {turn === 2 && (
          <div style={{ color:"#4ade80", fontSize:12, marginTop:8 }}>
            ✅ {p1Name||"Joueur 1"} a choisi !
          </div>
        )}
      </div>
    )
  }

  // ── REVEAL (shake animation) ──────────────────────────────────────────────
  if (phase === "reveal" || phase === "roundResult") {
    const w = roundWinner
    const p1Em = CHOICES.find(c=>c.id===p1Choice)?.emoji || "❓"
    const p2Em = CHOICES.find(c=>c.id===p2Choice)?.emoji || "❓"

    return (
      <div style={BG}>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:16, color:"#6b7280", letterSpacing:3, marginBottom:40 }}>
          MANCHE {round}
        </div>

        {/* VS display */}
        <div style={{ display:"flex", alignItems:"center", gap:20, marginBottom:40 }}>
          {/* P1 */}
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#ef4444", fontWeight:700, marginBottom:12 }}>{p1Name||"J1"}</div>
            <div style={{
              fontSize:72,
              animation: shaking ? "shake 0.15s infinite" : showChoice ? "popIn 0.3s ease-out" : "none",
              filter: !showChoice && phase==="reveal" ? "blur(8px)" : "none",
              transition: "filter 0.2s",
            }}>
              {shaking ? ["✊","✋","✌️"][Math.floor(Date.now()/150)%3] : (showChoice ? p1Em : "❓")}
            </div>
            {showChoice && w && (
              <div style={{ marginTop:8, fontSize:12, color: w==="p1"?"#4ade80":w==="draw"?"#fbbf24":"#f87171", fontWeight:700 }}>
                {w==="p1"?"🏆 GAGNE !":w==="draw"?"🤝 ÉGALITÉ":"❌ PERD"}
              </div>
            )}
          </div>

          {/* VS or countdown */}
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize: countdown ? 56 : 28, color: countdown ? "#fbbf24" : "#4b5563", textShadow: countdown ? "0 0 20px #fbbf2480" : "none", minWidth:60, textAlign:"center" }}>
            {countdown || "VS"}
          </div>

          {/* P2 */}
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#3b82f6", fontWeight:700, marginBottom:12 }}>{p2Name||"J2"}</div>
            <div style={{
              fontSize:72,
              animation: shaking ? "shake 0.15s infinite" : showChoice ? "popIn 0.3s ease-out" : "none",
              filter: !showChoice && phase==="reveal" ? "blur(8px)" : "none",
              transition: "filter 0.2s",
            }}>
              {shaking ? ["✊","✋","✌️"][Math.floor(Date.now()/150+1)%3] : (showChoice ? p2Em : "❓")}
            </div>
            {showChoice && w && (
              <div style={{ marginTop:8, fontSize:12, color: w==="p2"?"#4ade80":w==="draw"?"#fbbf24":"#f87171", fontWeight:700 }}>
                {w==="p2"?"🏆 GAGNE !":w==="draw"?"🤝 ÉGALITÉ":"❌ PERD"}
              </div>
            )}
          </div>
        </div>

        {/* Score */}
        <div style={{ display:"flex", gap:16, marginBottom:32 }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, color:"#ef4444" }}>{scores[0]}</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, color:"#4b5563" }}>—</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, color:"#3b82f6" }}>{scores[1]}</div>
        </div>

        {phase === "roundResult" && showChoice && (
          <button onClick={nextRound}
            style={{ width:"100%", maxWidth:320, padding:"16px", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontSize:16, fontWeight:700 }}>
            {round >= 3 || scores[0] === 2 || scores[1] === 2 ? "🏆 Voir le résultat final" : `➡️ Manche ${round+1}`}
          </button>
        )}

        <style>{`
          @keyframes shake {
            0%{transform:rotate(-15deg) scale(1.1)}
            50%{transform:rotate(15deg) scale(0.9)}
            100%{transform:rotate(-15deg) scale(1.1)}
          }
          @keyframes popIn {
            0%{transform:scale(0.5);opacity:0}
            70%{transform:scale(1.2)}
            100%{transform:scale(1);opacity:1}
          }
        `}</style>
      </div>
    )
  }

  // ── FINAL ─────────────────────────────────────────────────────────────────
  if (phase === "final") {
    const finalWinner = scores[0] > scores[1] ? "p1" : scores[1] > scores[0] ? "p2" : "draw"
    const winName = finalWinner==="p1" ? (p1Name||"Joueur 1") : finalWinner==="p2" ? (p2Name||"Joueur 2") : null
    const loseName = finalWinner==="p1" ? (p2Name||"Joueur 2") : finalWinner==="p2" ? (p1Name||"Joueur 1") : null

    return (
      <div style={BG}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          {finalWinner !== "draw" ? (
            <>
              <div style={{ fontSize:64, marginBottom:8 }}>🏆</div>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:32, color:"#4ade80", letterSpacing:3, marginBottom:4 }}>{winName} GAGNE !</div>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:16, color:"#4ade80", letterSpacing:1 }}>+8m sur la piste</div>
              <div style={{ marginTop:24, background:"#1c0505", border:"1px solid #7f1d1d", borderRadius:14, padding:"14px 20px" }}>
                <div style={{ fontSize:14, color:"#f87171", fontWeight:600 }}>🥃 {loseName} boit un shot !</div>
                <div style={{ fontSize:11, color:"#6b7280", marginTop:4 }}>Shot imposé par le groupe</div>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize:64, marginBottom:8 }}>🤝</div>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:32, color:"#fbbf24", letterSpacing:3 }}>ÉGALITÉ !</div>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:16, color:"#fbbf24" }}>+4m chacun</div>
            </>
          )}
        </div>

        {/* Final score */}
        <div style={{ display:"flex", gap:16, alignItems:"center", marginBottom:32 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#ef4444", marginBottom:4 }}>{p1Name||"J1"}</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:48, color:"#ef4444" }}>{scores[0]}</div>
          </div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, color:"#4b5563" }}>—</div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#3b82f6", marginBottom:4 }}>{p2Name||"J2"}</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:48, color:"#3b82f6" }}>{scores[1]}</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:10, width:"100%", maxWidth:340 }}>
          <button onClick={() => { setPhase("setup"); setScores([0,0]); setRound(1); setP1Choice(null); setP2Choice(null) }}
            style={{ flex:1, padding:"13px", borderRadius:13, border:"1px solid #2a2a3e", cursor:"pointer", background:"#1e1e2e", color:"#9ca3af", fontSize:14, fontWeight:700 }}>
            🔄 Rejouer
          </button>
          <button onClick={applyAndClose}
            style={{ flex:2, padding:"13px", borderRadius:13, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontSize:14, fontWeight:700 }}>
            ✅ Appliquer
          </button>
        </div>
      </div>
    )
  }

  return null
}
